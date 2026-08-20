#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = ["pyyaml>=6"]
# ///
"""Merge missing frontmatter keys from a shipped format profile into the
creator's studio copy.

The never-overwrite rule protects the creator's format profiles, but 0.x
copies predate frontmatter keys that 1.0 stages require (mc-beats reads
`beat-types` and `density` from the profile). This script closes that gap
surgically during the 0.x migration:

- Only top-level frontmatter keys MISSING from the studio copy are added,
  copied as their raw lines from the shipped profile (formatting preserved).
- Existing keys always win: a key present in the studio copy is never
  touched, whatever its value.
- The body (prose, Templates, Learnings) is never modified, byte for byte.

Usage:
    uv run merge_profile_frontmatter.py --shipped <packaged profile.md>
        --studio <creator's profile.md> [--dry-run]

Prints a JSON summary {studio, added, dry_run}. --dry-run reports what
would be added and writes nothing.

Exit codes: 0 merged or nothing to add, 1 file has no frontmatter block,
2 usage error.
"""

import argparse
import json
import re
import sys
from pathlib import Path

import yaml

TOP_KEY_RE = re.compile(r"^([A-Za-z0-9_-]+):")


def die(msg: str, code: int = 2) -> None:
    print(msg, file=sys.stderr)
    sys.exit(code)


def split_frontmatter(text: str, path: Path) -> tuple[str, str]:
    """Return (frontmatter_lines_text, body_text_including_closing_delim)."""
    if not text.startswith("---\n"):
        die(f"error: {path} has no frontmatter block", 1)
    end = text.find("\n---", 4)
    if end == -1:
        die(f"error: {path} frontmatter never closes", 1)
    return text[4:end + 1], text[end + 1:]


def top_level_blocks(fm_text: str) -> dict[str, str]:
    """Map each top-level key to its raw lines (key line plus continuation)."""
    blocks: dict[str, str] = {}
    current = None
    for line in fm_text.splitlines(keepends=True):
        m = TOP_KEY_RE.match(line)
        if m:
            current = m.group(1)
            blocks[current] = line
        elif current is not None:
            blocks[current] += line
    return blocks


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--shipped", required=True, type=Path)
    ap.add_argument("--studio", required=True, type=Path)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    for p in (args.shipped, args.studio):
        if not p.is_file():
            die(f"error: {p} not found")

    shipped_fm, _ = split_frontmatter(args.shipped.read_text(encoding="utf-8"),
                                      args.shipped)
    studio_text = args.studio.read_text(encoding="utf-8")
    studio_fm, studio_body = split_frontmatter(studio_text, args.studio)

    shipped_keys = yaml.safe_load(shipped_fm) or {}
    studio_keys = yaml.safe_load(studio_fm) or {}
    if not isinstance(shipped_keys, dict) or not isinstance(studio_keys, dict):
        die("error: frontmatter must be a YAML mapping", 1)

    missing = [k for k in shipped_keys if k not in studio_keys]
    if missing:
        blocks = top_level_blocks(shipped_fm)
        addition = "".join(blocks[k] for k in missing)
        if not addition.endswith("\n"):
            addition += "\n"
        new_fm = studio_fm if studio_fm.endswith("\n") else studio_fm + "\n"
        # studio_body starts at the closing delimiter line; reassemble exactly.
        merged = "---\n" + new_fm + addition + studio_body
        if not args.dry_run:
            args.studio.write_text(merged, encoding="utf-8")

    print(json.dumps({"studio": str(args.studio), "added": missing,
                      "dry_run": args.dry_run}))


if __name__ == "__main__":
    main()
