#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Farm one still or clip via the creator's registered CLI tools; log provenance.

Usage:
    uv run {skill-root}/scripts/farm_asset.py --kind image|video --prompt "..." \
        --provider <name> --config <resolved-config.json> \
        --out-dir <resolved {projects-path}/<slug>/assets/work/> \
        [--seconds 8] [--ref path/to/reference.png] [--dry-run]

    The calling skill resolves --out-dir and saves the studio config as JSON
    (the output of resolve_config.py --key modules.manticore) to the --config
    path. This script does no config discovery of its own; it reads only the
    file it is handed.

Provider resolution (the [assets] lane vocabulary):
    The [assets] keys (image-provider, video-provider, escalation-provider)
    are passed through verbatim as --provider. A value matching the `name` of
    a [[tools]] entry in the config selects the CLI lane. The reserved names
    "xai-api" and "veo-api" select the metered API lane. Anything else is a
    usage error that lists the registered tool names.

Lanes:
    cli (WORKING, the 1.0 default)
        The tool's `headless` string is the invocation template; its `notes`
        print to stderr first (they are the persistent memory for driving the
        tool correctly). Placeholders substituted into the template:
        <prompt> (required), <ref>, <seconds>, <out-dir>, <kind>, <model>
        (first entry of the tool's `models`, when present). A template with
        <ref> requires --ref, and --ref requires a <ref> placeholder (extend
        the tool registration via mc-setup if it lacks one). The command runs
        with --out-dir as its working directory and the caller's environment
        passed through untouched, so the tool's own auth (subscription login,
        env keys) just works; tool output streams live for progress. New
        files that appear under --out-dir are the result.
    api (NOT IMPLEMENTED in 1.0)
        xai-api (xAI Imagine REST) and veo-api (Veo via Gemini REST) are the
        metered lane, deferred to 1.0.x: see TODO.md build-order item 3. The
        script exits 3 with that pointer; nothing bills by default.

Output:
    generated file(s) land under --out-dir; <out-dir>/manifest.json (a JSON
    list) gains one row per new file:
        {file, kind, prompt, provider, model, cost, date}
    cost is null on CLI lanes (subscription tools report no metering); date is
    the ISO run date. A JSON summary (lane, provider, command, new_files,
    manifest) prints last on stdout. --dry-run prints the resolved command,
    cwd, and notes as JSON and runs nothing.

Generative editing rules (references/generative-editing-rules.md, binding):
    1. never chain generative edits: every revision regenerates from the
       ORIGINAL sources with one improved prompt (a revision of a revision
       degrades like a photocopy of a photocopy); --ref takes real
       photography or the original only, never a prior generation
    2. small deterministic fixes are composited (rsvg/ffmpeg), never regenerated
    3. self-inspect every output at zoom before the creator sees it
    4. people come from their original photos: pass the approved photo as
       --ref and prompt "use the person in this image to ..."
    5. quote exact strings for short text that must appear; spell out physics
       for wardrobe/object edits; always list what must NOT change; ask for
       margins near canvas edges; expression variants from one reference use
       "use this person but have them {expression}"
    6. long jobs run in background with proactive progress reports; deadline
       mode caps iteration in favor of good-enough delivery
    Standing rule: generated footage never depicts UI or text that must be
    accurate; real UI comes from screen recordings.

Exit codes: 0 ok, 1 tool failed or produced no files, 2 usage or resolution
error, 3 metered API lane requested (unimplemented in 1.0).
"""

import argparse
import datetime
import json
import shlex
import subprocess
import sys
from pathlib import Path

API_PROVIDERS = ("xai-api", "veo-api")
DEFAULT_SECONDS = 8


# --- pure resolution and command construction (unit-tested) -----------------

def resolve_provider(provider, config):
    """Map a --provider value to its lane.

    Returns ("cli", tool_dict) for a [[tools]] name match, ("api", provider)
    for a reserved metered lane name. Raises LookupError otherwise, listing
    what IS registered."""
    tools = config.get("tools") or []
    for tool in tools:
        if tool.get("name") == provider:
            return ("cli", tool)
    if provider in API_PROVIDERS:
        return ("api", provider)
    names = ", ".join(t.get("name", "?") for t in tools) or "none"
    raise LookupError(
        f"provider {provider!r} matches no [[tools]] entry and no known API "
        f"lane. Registered tools: {names}. API lanes (unimplemented in 1.0): "
        f"{', '.join(API_PROVIDERS)}. Register tools with mc-setup step 5.")


def plan_invocation(tool, kind, prompt, out_dir, ref=None, seconds=DEFAULT_SECONDS):
    """Build the argv for a registered tool's headless template.

    Substitutes <prompt>, <ref>, <seconds>, <out-dir>, <kind>, <model> inside
    the shlex-split tokens, so quoting in the template is preserved. Raises
    ValueError when the template and the arguments disagree."""
    headless = (tool.get("headless") or "").strip()
    if not headless:
        raise ValueError(f"tool {tool.get('name')!r} has no headless invocation; "
                         "fix its [[tools]] registration via mc-setup")
    if "<prompt>" not in headless:
        raise ValueError(f"tool {tool.get('name')!r} headless template has no "
                         "<prompt> placeholder: " + headless)
    if "<ref>" in headless and not ref:
        raise ValueError(f"tool {tool.get('name')!r} headless template requires "
                         "--ref (it contains <ref>)")
    if ref and "<ref>" not in headless:
        raise ValueError(f"--ref given but tool {tool.get('name')!r} headless "
                         "template has no <ref> placeholder; extend the tool "
                         "registration via mc-setup")
    models = tool.get("models") or []
    subs = {
        "prompt": prompt,
        "ref": str(ref) if ref else "",
        "seconds": str(seconds),
        "out-dir": str(out_dir),
        "kind": kind,
        "model": models[0] if models else "",
    }
    argv = []
    for token in shlex.split(headless):
        for key, value in subs.items():
            placeholder = f"<{key}>"
            if placeholder in token:
                token = token.replace(placeholder, value)
        argv.append(token)
    return argv


def manifest_rows(new_files, kind, prompt, provider, model):
    """One provenance row per new file, in the documented shape."""
    today = datetime.date.today().isoformat()
    return [{"file": f, "kind": kind, "prompt": prompt, "provider": provider,
             "model": model, "cost": None, "date": today} for f in new_files]


def append_manifest(manifest_path, rows):
    """Append rows to the JSON-list manifest, creating it when absent."""
    manifest_path = Path(manifest_path)
    entries = []
    if manifest_path.exists():
        entries = json.loads(manifest_path.read_text())
        if not isinstance(entries, list):
            raise ValueError(f"{manifest_path} is not a JSON list")
    entries.extend(rows)
    manifest_path.write_text(json.dumps(entries, indent=2) + "\n")
    return entries


# --- filesystem snapshotting -------------------------------------------------

def snapshot(out_dir):
    """Relative posix paths of every regular file under out_dir, minus the
    manifest and dotfiles."""
    out_dir = Path(out_dir)
    files = set()
    for p in out_dir.rglob("*"):
        if not p.is_file():
            continue
        rel = p.relative_to(out_dir).as_posix()
        if rel == "manifest.json" or Path(rel).name.startswith("."):
            continue
        files.add(rel)
    return files


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Farm one asset via a registered CLI tool.")
    parser.add_argument("--kind", required=True, choices=["image", "video"])
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--provider", required=True,
                        help="an [assets] lane value: a [[tools]] name (CLI "
                             "lane) or xai-api|veo-api (metered, unimplemented)")
    parser.add_argument("--config", required=True,
                        help="path to the resolved studio config as JSON")
    parser.add_argument("--out-dir", required=True,
                        help="where generated files and manifest.json land")
    parser.add_argument("--seconds", type=int, default=DEFAULT_SECONDS,
                        help="clip length hint for video (default 8)")
    parser.add_argument("--ref",
                        help="reference image: real photography or the "
                             "original source ONLY, never a prior generation")
    parser.add_argument("--dry-run", action="store_true",
                        help="print the resolved command and notes; run nothing")
    args = parser.parse_args(argv)

    config_path = Path(args.config)
    if not config_path.is_file():
        parser.error(f"config not found: {config_path}")
    try:
        config = json.loads(config_path.read_text())
    except json.JSONDecodeError as e:
        parser.error(f"config is not valid JSON ({config_path}): {e}")
    if args.ref and not Path(args.ref).is_file():
        parser.error(f"--ref not found: {args.ref}")

    try:
        lane, target = resolve_provider(args.provider, config)
    except LookupError as e:
        parser.error(str(e))

    if lane == "api":
        print(f"The metered API lane ({target}) is NOT implemented in 1.0; it "
              "ships in 1.0.x (see TODO.md build-order item 3: xAI Imagine / "
              "Veo REST). Nothing was billed. Use a registered [[tools]] CLI "
              "instead: pass its name as --provider (register tools with "
              "mc-setup step 5).", file=sys.stderr)
        return 3

    tool = target
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    try:
        command = plan_invocation(tool, args.kind, args.prompt, out_dir,
                                  ref=args.ref, seconds=args.seconds)
    except ValueError as e:
        parser.error(str(e))

    notes = (tool.get("notes") or "").strip()
    if notes:
        print(f"[{tool['name']} notes] {notes}", file=sys.stderr)

    if args.dry_run:
        print(json.dumps({"lane": "cli", "provider": args.provider,
                          "command": command, "cwd": str(out_dir),
                          "notes": notes}, indent=2))
        return 0

    before = snapshot(out_dir)
    try:
        # cwd = out_dir so tools that write to their working directory land
        # here; the environment is inherited untouched (env passthrough);
        # output streams live so long generations show progress.
        result = subprocess.run(command, cwd=out_dir)
    except FileNotFoundError:
        print(f"tool executable not found: {command[0]} (verify the [[tools]] "
              "registration and PATH)", file=sys.stderr)
        return 1
    if result.returncode != 0:
        print(f"tool exited {result.returncode}: {' '.join(command)}",
              file=sys.stderr)
        return 1

    new_files = sorted(snapshot(out_dir) - before)
    if not new_files:
        print(f"tool succeeded but produced no new files under {out_dir}; "
              "check the tool's notes for where it writes output",
              file=sys.stderr)
        return 1

    models = tool.get("models") or []
    rows = manifest_rows(new_files, args.kind, args.prompt, args.provider,
                         models[0] if models else None)
    manifest_path = out_dir / "manifest.json"
    try:
        append_manifest(manifest_path, rows)
    except (ValueError, json.JSONDecodeError) as e:
        print(f"manifest update failed: {e}", file=sys.stderr)
        return 1

    print(json.dumps({"lane": "cli", "provider": args.provider,
                      "command": command, "new_files": new_files,
                      "manifest": str(manifest_path)}, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
