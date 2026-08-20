#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Genericity release gate: scan module content for dogfood-studio leakage.

Nothing user-, brand-, or show-specific may ship in the module. This lint
scans the given paths (files or directories) for three classes of leak:

1. Brand terms: personal, channel, or show names from the dogfood studio
   (default: bmad, bmadcode, madison, pinkyd; case-insensitive). A hit is
   allowed only when it sits inside a legitimate ecosystem usage (BMad
   Method, BMad Manticore, bmad-method install commands, bmad-code-org
   URLs, _bmad runtime paths, sibling module names) or inside an
   ecosystem/support section of README.md or AGENTS.md.
2. Six-digit hex colors outside token example files. Grayscale values,
   the shipped placeholder palette, test fixtures, .svg illustrations, and
   the HTML slide decks under docs/ (self-contained illustrations) are
   allowed; anything else is treated as a possible dogfood palette hex.
3. Absolute /Users/ machine paths. Never allowed.

Usage:
    uv run lint_genericity.py <path> [<path> ...]
        [--terms bmad,bmadcode,madison,pinkyd]
        [--allow-extra REGEX] [--hex-allow RRGGBB]

The calling skill or release checklist passes explicit paths (for the
release gate: skills/ docs/ README.md CHANGELOG.md, which covers the
format profiles under skills/mc-setup/assets/formats/); this script does
no config discovery. The lint skips its own source file and its test
suite (both necessarily contain the banned terms as data).

Exit 0 clean, exit 1 findings, exit 2 usage error.
"""

import argparse
import re
import sys
from pathlib import Path

TEXT_SUFFIXES = {
    ".md", ".py", ".toml", ".json", ".html", ".txt",
    ".yaml", ".yml", ".css", ".js", ".svg", ".template",
}
SKIP_DIRS = {".git", "__pycache__", "node_modules", ".venv"}
# The lint's own source and its test suite necessarily contain the banned
# terms as data (the default term list and its fixtures); skip both.
# The plugin manifest legitimately carries the module author's identity and
# the module keywords; it is not shipped studio content.
SELF_NAMES = {"lint_genericity.py", "test-lint_genericity.py", "marketplace.json"}

DEFAULT_TERMS = ["bmad", "bmadcode", "madison", "pinkyd"]

# Legitimate ecosystem usages: a brand-term hit fully inside a match of one
# of these (case-insensitive) is allowed.
DEFAULT_ALLOW_CONTEXTS = [
    r"bmad method",
    r"bmad manticore",
    r"bmad-method",            # npx bmad-method install commands
    r"bmad-code-org",          # org URLs
    r"bmad-manticore",         # this repo's name in URLs
    r"_bmad\b",                # installed runtime dir ({project-root}/_bmad/)
    r"bmad[- ]core",           # the installed BMad core
    r"bmad-install",           # installer alias
    r"bmad-autopilot",         # sibling modules and builder skills
    r"bmad-bmm",
    r"bmad-workflow-builder",
    r"bmad-agent-builder",
    r"bmad-agent-analyst",
    r"bmad-plugins-marketplace",
    r"bmad agent([- ]skill)? pattern",
    r"bmad structural rules",
    r"bmad ecosystem",
    r"bmad-initialized",       # "the project is not BMad-initialized"
    r"bmad-help",              # the core help skill and the merged bmad-help.csv catalog
    r"bmad help convention",   # the ecosystem help-catalog convention by name
    r"bmad code,? llc",        # trademark holder in license notices
    r"bmadcode\.com",          # the maintainer's official site in ecosystem links
    r"@bmadcode",              # the maintainer's official channel handles
]

# README.md / AGENTS.md sections where ecosystem links, support links, and
# trademark notices (channel handles, sponsor URLs, holder names)
# legitimately appear.
ECOSYSTEM_SECTION = re.compile(r"ecosystem|support|community|license|trademark", re.IGNORECASE)
ECOSYSTEM_FILES = {"README.md", "AGENTS.md"}

HEX_RE = re.compile(r"#([0-9A-Fa-f]{6})\b")
# Shipped placeholder palette (tokens.template.json, scaffold_ograf.py,
# html_to_png.py safe-zone guides, mc-ograf preview chrome). Generic by
# design; not dogfood brand colors.
DEFAULT_HEX_ALLOW = {"4f8cff", "2f6fe0", "7faaff", "ff3355", "ffcc00", "0c1322"}

USERS_PATH_RE = re.compile(r"/Users/[A-Za-z0-9_.-]+")


def die(msg: str) -> None:
    print(msg, file=sys.stderr)
    sys.exit(2)


def iter_files(paths: list[Path]) -> list[Path]:
    files: list[Path] = []
    for p in paths:
        if not p.exists():
            die(f"error: {p} not found")
        if p.is_file():
            files.append(p)
            continue
        for f in sorted(p.rglob("*")):
            if f.is_file() and not (SKIP_DIRS & set(f.parts)):
                files.append(f)
    return [f for f in files if f.suffix.lower() in TEXT_SUFFIXES and f.name not in SELF_NAMES]


def is_grayscale(hexval: str) -> bool:
    h = hexval.lower()
    return h[0:2] == h[2:4] == h[4:6]


def allowed_spans(line: str, contexts: list[re.Pattern]) -> list[tuple[int, int]]:
    return [m.span() for ctx in contexts for m in ctx.finditer(line)]


def covered(span: tuple[int, int], allowed: list[tuple[int, int]]) -> bool:
    return any(a <= span[0] and span[1] <= b for a, b in allowed)


def scan_file(path: Path, term_res: list[re.Pattern], contexts: list[re.Pattern],
              hex_allow: set[str]) -> list[str]:
    try:
        text = path.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        return []
    findings: list[str] = []
    is_ecosystem_file = path.name in ECOSYSTEM_FILES
    in_ecosystem_section = False
    token_file = "tokens" in path.name.lower()
    in_tests = "tests" in path.parts
    # Illustrations carry their own palettes by design: .svg diagrams anywhere,
    # and the self-contained HTML slide decks under docs/. Skill HTML templates
    # are NOT exempt; a brand hex there would ship into studio output.
    is_illustration = path.suffix.lower() == ".svg" or (
        path.suffix.lower() == ".html" and "docs" in path.parts)

    for lineno, line in enumerate(text.splitlines(), start=1):
        heading = re.match(r"#{1,6}\s+(.*)", line)
        if is_ecosystem_file and heading:
            in_ecosystem_section = bool(ECOSYSTEM_SECTION.search(heading.group(1)))

        if not (is_ecosystem_file and in_ecosystem_section):
            allowed = allowed_spans(line, contexts)
            for term_re in term_res:
                for m in term_re.finditer(line):
                    if not covered(m.span(), allowed):
                        findings.append(
                            f"{path}:{lineno}: [brand-term] {m.group(0)!r} in: {line.strip()[:120]}")

        if not (token_file or in_tests or is_illustration):
            for m in HEX_RE.finditer(line):
                h = m.group(1).lower()
                if h not in hex_allow and not is_grayscale(h):
                    findings.append(
                        f"{path}:{lineno}: [hex-color] #{m.group(1)} in: {line.strip()[:120]}")

        for m in USERS_PATH_RE.finditer(line):
            findings.append(
                f"{path}:{lineno}: [machine-path] {m.group(0)!r} in: {line.strip()[:120]}")
    return findings


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("paths", nargs="+", help="files or directories to scan")
    ap.add_argument("--terms", default=",".join(DEFAULT_TERMS),
                    help="comma-separated brand terms (case-insensitive)")
    ap.add_argument("--allow-extra", action="append", default=[],
                    help="extra allowed-context regex (repeatable)")
    ap.add_argument("--hex-allow", action="append", default=[],
                    help="extra allowed hex value, RRGGBB without # (repeatable)")
    args = ap.parse_args()

    terms = [t.strip() for t in args.terms.split(",") if t.strip()]
    if not terms:
        die("error: --terms is empty")
    try:
        term_res = [re.compile(re.escape(t), re.IGNORECASE) for t in terms]
        contexts = [re.compile(c, re.IGNORECASE)
                    for c in DEFAULT_ALLOW_CONTEXTS + args.allow_extra]
    except re.error as e:
        die(f"error: bad regex: {e}")
    hex_allow = DEFAULT_HEX_ALLOW | {h.lower().lstrip("#") for h in args.hex_allow}

    findings: list[str] = []
    files = iter_files([Path(p) for p in args.paths])
    for f in files:
        findings.extend(scan_file(f, term_res, contexts, hex_allow))

    for line in findings:
        print(line)
    if findings:
        print(f"\n{len(findings)} genericity finding(s) across {len(files)} file(s). "
              "Nothing user-, brand-, or show-specific may ship; fix or allowlist with a reason.")
        raise SystemExit(1)
    print(f"clean: {len(files)} file(s) passed the genericity gate")


if __name__ == "__main__":
    main()
