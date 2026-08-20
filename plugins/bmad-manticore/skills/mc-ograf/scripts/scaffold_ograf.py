#!/usr/bin/env python3
"""Scaffold a spec-compliant OGraf graphic package from the skill's asset templates.

Writes <dest>/<id>/ with:
  <id>.ograf.json   manifest (correct fields, type-keyed actionDurations, schema)
  <id>.mjs          Web Component (deterministic render, NO self-registration)
  preview.html      local harness that registers + scrubs the graphic

The STRUCTURAL standards that produce a silent black clip in a renderer (no
self-registration, type-keyed actionDurations, full non-real-time API,
transparent host) are baked in here, so callers should generate rather than
hand-write. Standards that live in the caller's own edits (deterministic
render(tMs), hardened asset/font loads) still apply afterward. Stdlib only.

Palette/font args should come from {brand-path}/tokens.json; any left at the
placeholder defaults are reported in the JSON output as placeholder_palette
so a placeholder look never ships unnoticed.

Fields define the operator-editable config surface (the manifest schema). Pass as
JSON:  --fields '[{"key":"title","title":"Title","default":"Guest Name"}]'
or simply: --field title="Guest Name" --field subtitle="Channel Name"
"""
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
import argparse
import json
import re
import sys
from pathlib import Path

ASSETS = Path(__file__).resolve().parent.parent / "assets"


def jstr(s):
    """JSON-string-safe inner text (escapes quotes/backslashes/newlines)."""
    return json.dumps(str(s))[1:-1]


def humanize(key):
    """Field key -> Inspector title. Splits camelCase + snake/kebab, Title-Cases.
    guestName -> 'Guest Name', accent_color -> 'Accent Color'."""
    s = re.sub(r"(?<=[a-z0-9])(?=[A-Z])", " ", key).replace("_", " ").replace("-", " ")
    return " ".join(s.split()).title()


def parse_fields(args):
    fields = []
    if args.fields:
        try:
            raw = json.loads(args.fields)
        except json.JSONDecodeError as e:
            sys.exit(f"--fields is not valid JSON: {e}")
        for f in raw:
            key = f.get("key")
            if not key:
                sys.exit("each --fields entry needs a 'key'")
            fields.append({"key": key, "title": f.get("title", humanize(key)),
                           "default": f.get("default", "")})
    for kv in args.field or []:
        if "=" not in kv:
            sys.exit(f"--field must be key=default, got: {kv}")
        key, default = kv.split("=", 1)
        key = key.strip()
        fields.append({"key": key, "title": humanize(key), "default": default})
    if not fields:
        fields = [{"key": "title", "title": "Title", "default": args.name},
                  {"key": "subtitle", "title": "Subtitle", "default": ""}]
    seen = set()
    for f in fields:
        if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", f["key"]):
            sys.exit(f"field key '{f['key']}' must be a valid identifier (no spaces/dashes)")
        if f["key"] in seen:
            sys.exit(f"duplicate field key: {f['key']}")
        seen.add(f["key"])
    return fields


def main():
    p = argparse.ArgumentParser(description="Scaffold an OGraf graphic package")
    p.add_argument("--id", required=True, help="graphic id (kebab-case, no slashes)")
    p.add_argument("--name", required=True, help="human-readable name")
    p.add_argument("--dest", required=True, help="parent directory; package goes in <dest>/<id>/")
    p.add_argument("--description", default="")
    p.add_argument("--author", default="", help="creator/channel name; pass from the studio config [owner] table")
    p.add_argument("--width", type=int, default=1920)
    p.add_argument("--height", type=int, default=1080)
    p.add_argument("--duration", type=int, default=10000, help="timeline length in ms")
    p.add_argument("--fields", help="JSON array of {key,title,default}")
    p.add_argument("--field", action="append", help="key=default (repeatable)")
    p.add_argument("--accent", default="#4F8CFF", help="pass from {brand-path}/tokens.json")
    p.add_argument("--surface", default="#1D1D1D", help="pass from {brand-path}/tokens.json")
    p.add_argument("--text", default="#FFFFFF")
    p.add_argument("--muted", default="#A8A8A8", help="pass from {brand-path}/tokens.json")
    p.add_argument("--font", default="system-ui, sans-serif", help="pass from {brand-path}/tokens.json")
    p.add_argument("--force", action="store_true", help="overwrite an existing package")
    args = p.parse_args()

    gid = args.id.strip().lower()
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", gid):
        sys.exit("--id must be kebab-case with no slashes (spec: id has no forward slashes)")

    fields = parse_fields(args)
    main_file = f"{gid}.mjs"

    schema_props = {
        f["key"]: {"type": "string", "title": f["title"], "default": f["default"]}
        for f in fields
    }
    field_keys = [f["key"] for f in fields]
    defaults = {f["key"]: f["default"] for f in fields}

    subs = {
        "{{ID}}": gid,
        "{{NAME}}": jstr(args.name),
        "{{DESCRIPTION}}": jstr(args.description),
        "{{AUTHOR}}": jstr(args.author),
        "{{MAIN}}": main_file,
        "{{WIDTH}}": str(args.width),
        "{{HEIGHT}}": str(args.height),
        "{{DURATION}}": str(args.duration),
        "{{SCHEMA_PROPERTIES}}": json.dumps(schema_props, indent=6).replace("\n", "\n    "),
        "{{FIELD_KEYS_JS}}": json.dumps(field_keys),
        "{{DEFAULTS_JS}}": json.dumps(defaults),
        "{{ACCENT}}": jstr(args.accent),
        "{{SURFACE}}": jstr(args.surface),
        "{{TEXT}}": jstr(args.text),
        "{{MUTED}}": jstr(args.muted),
        "{{FONT_STACK}}": jstr(args.font),
    }

    def fill(template_name):
        text = (ASSETS / template_name).read_text(encoding="utf-8")
        for k, v in subs.items():
            text = text.replace(k, v)
        leftover = re.findall(r"\{\{[A-Z_]+\}\}", text)
        if leftover:
            sys.exit(f"unfilled placeholders in {template_name}: {sorted(set(leftover))}")
        return text

    pkg = Path(args.dest) / gid
    if pkg.exists() and not args.force:
        sys.exit(f"{pkg} already exists (use --force to overwrite)")
    pkg.mkdir(parents=True, exist_ok=True)

    written = {}
    for tmpl, out in [
        ("manifest.template.json", f"{gid}.ograf.json"),
        ("graphic.template.mjs", main_file),
        ("preview.template.html", "preview.html"),
    ]:
        dest = pkg / out
        dest.write_text(fill(tmpl), encoding="utf-8")
        written[out] = str(dest)

    # validate the manifest we just wrote
    try:
        json.loads((pkg / f"{gid}.ograf.json").read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        sys.exit(f"generated manifest is invalid JSON: {e}")

    placeholder_defaults = {"accent": "#4F8CFF", "surface": "#1D1D1D",
                            "muted": "#A8A8A8", "font": "system-ui, sans-serif"}
    placeholders = sorted(k for k, v in placeholder_defaults.items()
                          if getattr(args, k) == v)

    out = {
        "ok": True,
        "package": str(pkg),
        "manifest": written[f"{gid}.ograf.json"],
        "main": written[main_file],
        "preview": written["preview.html"],
        "fields": field_keys,
        "next": f"Edit {main_file} render(tMs) for your design, then: uv run scripts/verify_ograf.py {pkg} "
                f"--width {args.width} --height {args.height} --duration {args.duration}",
    }
    if placeholders:
        out["placeholder_palette"] = placeholders
        out["warning"] = ("placeholder palette: --" + ", --".join(placeholders) +
                          " left at module defaults; pass values from {brand-path}/tokens.json "
                          "before this graphic ships")
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
