#!/usr/bin/env bash
# BMad working-repo initializer.
#
# The plugin ships the immutable skill surface; skills additionally
# resolve per-project files from {project-root}/_bmad/ (module config,
# shared scripts like memlog.py / render_skill.py, help catalogs) and
# write artifacts to configured output folders. This script creates
# those working-repo files from the runtime template captured at sync
# time (plugins/bmad/runtime/_bmad/).
#
# Usage:
#   init.sh [target-dir] [--dry-run] [--with-plugin <name>]...
#
# --with-plugin registers a sibling BMad plugin from the same
# marketplace (e.g. bmad-manticore): its module runtime is materialized
# and its help rows are merged into _bmad/_config/bmad-help.csv. It is
# opt-in because a marketplace install clones the whole repo, so a
# sibling's files are on disk whether or not that plugin is enabled.
#
# Idempotent: existing files are never overwritten — only missing
# pieces are filled in, and a help row already present is never
# duplicated. Safe to re-run after a plugin update.
set -euo pipefail

TARGET_DIR="."
DRY_RUN=0
SIBLINGS=()

# Naming the same plugin twice would append its help rows twice.
add_sibling() {
  for existing in ${SIBLINGS+"${SIBLINGS[@]}"}; do
    if [ "$existing" = "$1" ]; then return 0; fi
  done
  SIBLINGS+=("$1")
}

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=1 ;;
    --with-plugin)
      shift
      [ $# -gt 0 ] || { echo "error: --with-plugin needs a plugin name" >&2; exit 1; }
      add_sibling "$1"
      ;;
    --with-plugin=*) add_sibling "${1#--with-plugin=}" ;;
    -h|--help)
      sed -n '2,22p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    -*) echo "error: unknown option '$1'" >&2; exit 1 ;;
    *) TARGET_DIR="$1" ;;
  esac
  shift
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(dirname "$SCRIPT_DIR")"
PLUGINS_DIR="$(dirname "$PLUGIN_ROOT")"
TEMPLATE="$PLUGIN_ROOT/runtime/_bmad"

PROJECT_NAME_PLACEHOLDER="__BMAD_PROJECT_NAME__"
USER_NAME_PLACEHOLDER="__BMAD_USER_NAME__"
INSTALL_DATE_PLACEHOLDER="__BMAD_INSTALL_DATE__"

if [ ! -d "$TEMPLATE" ]; then
  echo "error: runtime template not found at $TEMPLATE" >&2
  echo "       (re-install the plugin; the template ships with it)" >&2
  exit 1
fi

if [ ! -d "$TARGET_DIR" ]; then
  echo "error: target directory '$TARGET_DIR' does not exist" >&2
  exit 1
fi

cd "$TARGET_DIR"

# The substituted values land inside TOML strings (`user_name = "…"`) and
# unquoted YAML scalars (`user_name: …`), so a value carrying `"`, `\`,
# `:`, `#` or a newline does not just look odd — it makes the file
# unparseable, and `_bmad/scripts/resolve_config.py` (which every skill
# calls) then fails for good. Reduce to a set that is safe in both
# formats rather than trying to escape per destination.
sanitize_value() {
  printf '%s' "$1" | tr '\n\r\t' '   ' | sed -e 's/[^[:alnum:] ._@-]/ /g' -e 's/  */ /g' -e 's/^ //' -e 's/ $//'
}

PROJECT_NAME_RAW="$(basename "$(pwd)")"
# The installer asks for a display name and defaults to the OS user.
# Prefer the git identity, which is what a repo already knows about you.
USER_NAME_RAW="$(git config user.name 2>/dev/null || true)"
[ -n "$USER_NAME_RAW" ] || USER_NAME_RAW="${USER:-BMad}"

PROJECT_NAME="$(sanitize_value "$PROJECT_NAME_RAW")"
USER_NAME="$(sanitize_value "$USER_NAME_RAW")"
[ -n "$PROJECT_NAME" ] || PROJECT_NAME="bmad-project"
[ -n "$USER_NAME" ] || USER_NAME="BMad"
INSTALL_DATE="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"

if [ "$PROJECT_NAME" != "$PROJECT_NAME_RAW" ]; then
  echo "note: project name '$PROJECT_NAME_RAW' reduced to '$PROJECT_NAME' for TOML/YAML safety" >&2
fi
if [ "$USER_NAME" != "$USER_NAME_RAW" ]; then
  echo "note: user name '$USER_NAME_RAW' reduced to '$USER_NAME' for TOML/YAML safety" >&2
fi

created=0
refreshed=0
skipped=0

# sed-escape a replacement string for the `s|…|…|` form used below.
# sanitize_value already removed `\`, `&` and `|`, but the escaping stays
# so the two are independent: a change to the character class cannot
# silently reintroduce a sed injection.
escape_repl() {
  printf '%s' "$1" | sed -e 's/[\\&|]/\\&/g'
}

PROJECT_NAME_ESC="$(escape_repl "$PROJECT_NAME")"
USER_NAME_ESC="$(escape_repl "$USER_NAME")"
INSTALL_DATE_ESC="$(escape_repl "$INSTALL_DATE")"

# Render one template file, resolving the three placeholders. $3 is the
# install date to stamp; an existing file keeps the date it was first
# initialized with, so a refresh compares content rather than clocks.
render_to() {
  mkdir -p "$(dirname "$2")"
  cp "$1" "$2"
  date_esc="$(escape_repl "$3")"
  sed -i.bmad-init-bak \
    -e "s|$PROJECT_NAME_PLACEHOLDER|$PROJECT_NAME_ESC|g" \
    -e "s|$USER_NAME_PLACEHOLDER|$USER_NAME_ESC|g" \
    -e "s|$INSTALL_DATE_PLACEHOLDER|$date_esc|g" \
    "$2"
  rm -f "$2.bmad-init-bak"
}

# `_bmad/custom/` is the declared user-editable layer; upstream's own
# header calls everything else "Installer-managed. Regenerated on every
# install — treat as read-only." So a missing file is created, and an
# installer-managed file that differs from the template is REFRESHED.
#
# Skipping every existing path (the pre-v6.11.0.0 behaviour) meant a repo
# initialized by an older plugin could never be upgraded: it kept stale
# shared scripts and a help catalog naming skills that no longer ship,
# which is exactly the case "safe to re-run after a plugin update" was
# written for.
is_user_owned() {
  case "$1" in
    _bmad/custom/*) return 0 ;;
    *) return 1 ;;
  esac
}

install_file() {
  src="$1"
  dest="$2"
  # The assembled help catalog is judged once, after the sibling merge.
  count_it=1
  if [ "$dest" = "_bmad/_config/bmad-help.csv" ]; then count_it=0; fi

  if [ ! -e "$dest" ]; then
    if [ "$DRY_RUN" -eq 1 ]; then
      echo "  [dry-run] would create $dest"
    else
      render_to "$src" "$dest" "$INSTALL_DATE"
      echo "  + $dest"
    fi
    created=$((created + count_it))
    return 0
  fi

  if is_user_owned "$dest"; then
    skipped=$((skipped + count_it))
    return 0
  fi

  # Reuse the timestamp already recorded in the destination. Stamping a
  # fresh one would make every re-run report a refresh of every
  # date-bearing file — churn that hides the changes that matter.
  existing_date="$(grep -o -m1 '[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}T[0-9:.]*Z' "$dest" 2>/dev/null || true)"
  [ -n "$existing_date" ] || existing_date="$INSTALL_DATE"

  # Render to a temp file so the comparison is against the resolved
  # content, not the template's placeholders.
  tmp="$(mktemp)"
  render_to "$src" "$tmp" "$existing_date"
  if cmp -s "$tmp" "$dest"; then
    rm -f "$tmp"
    skipped=$((skipped + count_it))
    return 0
  fi
  if [ "$DRY_RUN" -eq 1 ]; then
    if [ "$count_it" -eq 1 ]; then echo "  [dry-run] would refresh $dest"; fi
    rm -f "$tmp"
  else
    mkdir -p "$(dirname "$dest")"
    mv "$tmp" "$dest"
    if [ "$count_it" -eq 1 ]; then echo "  ~ $dest (refreshed)"; fi
  fi
  refreshed=$((refreshed + count_it))
}

echo "Initializing BMad in $(pwd) (project: $PROJECT_NAME, user: $USER_NAME)"

# `_bmad/_config/bmad-help.csv` is ASSEMBLED, not installed: step 1
# restores the template copy and step 3 merges each registered sibling's
# rows back in. Counting it in step 1 would report a refresh on every
# run even when the assembled result is byte-identical, which would
# drown the changes that matter. Snapshot it and judge the final bytes.
AGG_HELP="_bmad/_config/bmad-help.csv"
HELP_BEFORE=""
if [ -f "$AGG_HELP" ]; then
  HELP_BEFORE="$(mktemp)"
  cp "$AGG_HELP" "$HELP_BEFORE"
fi

# 1. _bmad/ runtime tree (config, shared scripts, help catalogs).
#    dot.gitignore is how the template stores .gitignore files (a real
#    .gitignore inside the template would exclude sibling template
#    files from the plugin repo itself) — restore the real name here.
while IFS= read -r src; do
  rel="${src#"$TEMPLATE"/}"
  case "$rel" in
    *dot.gitignore) rel="${rel%dot.gitignore}.gitignore" ;;
  esac
  install_file "$src" "_bmad/$rel"
done < <(find "$TEMPLATE" -type f | LC_ALL=C sort)

# 2. Output folders the default module config points at
#    (mirrors what `npx bmad-method install` creates). bmb builds skills
#    into skills/, and gds/tea hang their artifact folders off the same
#    directory — that is an upstream module default, reproduced here so
#    an initialized repo matches a real install.
for dir in \
  _bmad-output/planning-artifacts \
  _bmad-output/implementation-artifacts \
  docs \
  skills/planning-artifacts \
  skills/implementation-artifacts \
  skills/test-artifacts; do
  if [ -d "$dir" ]; then
    skipped=$((skipped + 1))
  elif [ "$DRY_RUN" -eq 1 ]; then
    echo "  [dry-run] would create $dir/"
    created=$((created + 1))
  else
    mkdir -p "$dir"
    echo "  + $dir/"
    created=$((created + 1))
  fi
done

# 3. Sibling BMad plugins from the same marketplace ship their own
#    _bmad/<module>/ metadata. A marketplace install is a git clone of
#    the whole repo, so a sibling's files are on disk whether or not the
#    user enabled that plugin — registration is therefore opt-in via
#    --with-plugin, never inferred from the directory listing.
#
#    The merge REPLACES every row owned by the module before appending
#    its current ones — upstream's own merge-help-csv.py calls this the
#    anti-zombie pattern. An append-with-dedupe cannot express an edited
#    row or a removed skill, so the first point release of a sibling
#    would leave a duplicate of the old wording and a row for a skill
#    that no longer exists, both of which bmad-help would offer.
AGG_HELP="_bmad/_config/bmad-help.csv"
merged_rows=0
for sibling in ${SIBLINGS+"${SIBLINGS[@]}"}; do
  sibling_runtime="$PLUGINS_DIR/$sibling/runtime/_bmad"
  if [ ! -d "$sibling_runtime" ]; then
    echo "error: no runtime template for plugin '$sibling' at $sibling_runtime" >&2
    exit 1
  fi

  while IFS= read -r src; do
    rel="${src#"$sibling_runtime"/}"
    # `_config/` in a sibling holds its filtered skill-manifest, which
    # exists so `bun run validate` can gate that plugin's skill surface.
    # Materializing it would overwrite the aggregate manifest in the
    # user's repo with 15 rows in place of 110.
    case "$rel" in
      _config/*) continue ;;
      *dot.gitignore) rel="${rel%dot.gitignore}.gitignore" ;;
    esac
    install_file "$src" "_bmad/$rel"
  done < <(find "$sibling_runtime" -type f | LC_ALL=C sort)

  for module_help in "$sibling_runtime"/*/module-help.csv; do
    [ -f "$module_help" ] || continue

    rows=0
    while IFS= read -r row || [ -n "$row" ]; do
      [ -n "$row" ] || continue
      case "$row" in module,skill,*) continue ;; esac
      rows=$((rows + 1))
    done < "$module_help"
    merged_rows=$((merged_rows + rows))

    if [ "$DRY_RUN" -eq 1 ]; then continue; fi
    [ -f "$AGG_HELP" ] || continue

    # A plain append is correct because step 1 has already restored the
    # catalog to the pristine template, which contains no sibling rows.
    # That is what stops zombies: a sibling point release that reworded a
    # row or dropped a skill cannot leave the old version behind, because
    # the previous merge was discarded wholesale rather than patched.
    #
    # The installer writes bmad-help.csv without a trailing newline, so
    # pad it or the first appended row is glued onto the last existing
    # one, producing a 12-column line.
    if [ -s "$AGG_HELP" ] &&
       [ "$(tail -c 1 "$AGG_HELP" | od -An -c | tr -d ' ')" != '\n' ]; then
      printf '\n' >> "$AGG_HELP"
    fi
    while IFS= read -r row || [ -n "$row" ]; do
      [ -n "$row" ] || continue
      case "$row" in module,skill,*) continue ;; esac
      printf '%s\n' "$row" >> "$AGG_HELP"
    done < "$module_help"
  done
done
# Judge the assembled catalog by its final bytes, not by the intermediate
# rewrites that produced it.
help_changed=0
if [ "$DRY_RUN" -eq 0 ] && [ -f "$AGG_HELP" ]; then
  if [ -z "$HELP_BEFORE" ] || ! cmp -s "$HELP_BEFORE" "$AGG_HELP"; then
    help_changed=1
    if [ -n "$HELP_BEFORE" ]; then
      echo "  ~ $AGG_HELP (reassembled)"
    fi
  fi
fi
[ -z "$HELP_BEFORE" ] || rm -f "$HELP_BEFORE"

if [ "$merged_rows" -gt 0 ]; then
  if [ "$DRY_RUN" -eq 1 ]; then
    echo "  [dry-run] would merge $merged_rows help rows from sibling plugins"
  else
    echo "  + $merged_rows help rows merged from sibling plugins"
  fi
fi

if [ "$DRY_RUN" -eq 1 ]; then
  echo "Done (dry run): would create $created, refresh $refreshed, leave $skipped unchanged."
else
  echo "Done: $created created, $((refreshed + help_changed)) refreshed, $skipped already current."
fi
if [ "$created" -eq 0 ] && [ "$refreshed" -eq 0 ] && [ "$help_changed" -eq 0 ]; then
  echo "Repo was already initialized — nothing to do."
fi

# 4. Prerequisite check. `bmad-build` and `bmad-build-auto` carry no
#    workflow logic of their own: they run
#    `uv run _bmad/scripts/render_skill.py` and HALT if uv is missing.
#    Everything else degrades gracefully, so this warns and never fails.
if ! command -v uv >/dev/null 2>&1; then
  cat >&2 <<'EOF'

warning: `uv` is not on PATH.

  BMAD v6.11 renders bmad-build and bmad-build-auto through
  _bmad/scripts/render_skill.py (Python >=3.11, run via uv). Without uv
  those two skills halt instead of running; the rest of the surface
  falls back to reading its own config directly.

  Install:  curl -LsSf https://astral.sh/uv/install.sh | sh
            (or: brew install uv / pipx install uv)
EOF
fi
