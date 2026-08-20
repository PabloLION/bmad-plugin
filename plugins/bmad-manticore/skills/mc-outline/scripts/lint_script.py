#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Lint a script (or any text file) against the creator's blacklist.

Usage:
    uv run lint_script.py <file> --blacklist {brand-path}/blacklist.md

The calling skill resolves {brand-path} from the studio config
([modules.manticore] in {project-root}/_bmad/custom/config.toml) and passes
the blacklist path explicitly; this script does no config discovery.

Parses every fenced ```regex block (one pattern per line, '#' lines are
comments), scans the target line by line case-insensitively, and reports every
hit as file:line: pattern -> match.
Exit 0 clean, exit 1 violations, exit 2 usage/config error.
"""

import argparse
import re
import sys
from pathlib import Path


def die(msg: str) -> None:
    """Usage/config error: print to stderr and exit 2 (per the contract above)."""
    print(msg, file=sys.stderr)
    sys.exit(2)


def load_patterns(blacklist: Path) -> list[re.Pattern]:
    if not blacklist.exists():
        die(f"error: blacklist not found: {blacklist}\nRun the mc-setup skill to create {{brand-path}}/blacklist.md.")
    blocks = re.findall(r"```regex\n(.*?)```", blacklist.read_text(), re.DOTALL)
    if not blocks:
        die(f"error: no ```regex blocks in {blacklist}")
    patterns = []
    for block in blocks:
        for raw in block.splitlines():
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            try:
                patterns.append(re.compile(line, re.IGNORECASE))
            except re.error as e:
                die(f"error: bad pattern in blacklist: {line!r} ({e})")
    return patterns


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("target")
    ap.add_argument("--blacklist", required=True, help="path to the live blacklist, usually {brand-path}/blacklist.md")
    args = ap.parse_args()

    target = Path(args.target)
    if not target.exists():
        die(f"error: {target} not found")

    patterns = load_patterns(Path(args.blacklist))
    violations = 0
    for lineno, line in enumerate(target.read_text().splitlines(), start=1):
        for pat in patterns:
            for m in pat.finditer(line):
                violations += 1
                print(f"{target}:{lineno}: {pat.pattern} -> {m.group(0)!r}")

    if violations:
        print(f"\n{violations} violation(s). Fix them; do not present this artifact.")
        raise SystemExit(1)
    print(f"clean: {target} passed {len(patterns)} blacklist patterns")


if __name__ == "__main__":
    main()
