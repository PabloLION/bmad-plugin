#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Scaffold a new video project from a format profile.

Usage:
    uv run new_project.py <slug> --format talking-head \
        --projects-dir {projects-path} --formats-dir {formats-path} \
        [--title "..."] [--parent <slug>] [--series <series-slug>] \
        [--deadline YYYY-MM-DD] \
        [--ingest /abs/path/to/footage.mp4 [--source-id <id>] [--source-role primary|interview|screen]]

The calling skill resolves the two directories from the studio config
([modules.manticore] in {project-root}/_bmad/custom/config.toml) and passes
them explicitly; this script does no config discovery. Format profiles must
already exist in --formats-dir (mc-setup copies the defaults there).

Modes:

- Idea-first (default): the full pipeline from the format profile; next
  stage is whatever follows "new" in the profile (usually braindump).
- Footage-first (--ingest FILE): the project starts from existing footage
  (a livestream VOD, a recorded talk). The format profile must be a
  footage-first profile: its stage list goes straight to post-production
  and contains none of the ideation stages (braindump, outline, script,
  record). The source file is registered in "sources" in project.json and
  the next stage is typically cut.
- Series (--series SLUG): the project is an episode of a series. Episodes
  live at {projects-path}/<series>/<slug>/ beside a shared
  {projects-path}/<series>/common/ folder for evergreen assets; the series
  slug is written to the "series" field in project.json.
- Deadline (--deadline YYYY-MM-DD): an external event gates delivery. The
  date is written to the "deadline" field in project.json; downstream
  stages in deadline mode order deliverables by hard external gates and
  cap iteration loops in favor of good-enough delivery.

Reads the stage list from the format profile's frontmatter, creates the
project folder with the standard subfolders, and writes project.json per the
pipeline contract (skills/mc-pipeline/PIPELINE.md in the module).
"""

import argparse
import datetime
import json
import re
import sys
from pathlib import Path

SUBDIRS = ["raw", "transcript", "cut", "beats", "graphics", "assets", "packaging", "renders"]
GATES = ["outline", "cutplan", "beats", "final"]
IDEATION_STAGES = ("braindump", "outline", "script", "record")
KEBAB = r"[a-z0-9][a-z0-9-]*"


def slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug or "source"


def read_profile_stages(formats_dir: Path, fmt: str) -> list[str]:
    profile = formats_dir / f"{fmt}.md"
    if not profile.exists():
        names = sorted(p.stem for p in formats_dir.glob("*.md")) if formats_dir.is_dir() else []
        hint = f"available: {', '.join(names)}" if names else \
            f"{formats_dir} has no profiles. Run the mc-setup skill to populate it."
        sys.exit(f"error: no format profile for {fmt!r}\n{hint}")
    m = re.search(r"^stages:\s*\[(.*?)\]", profile.read_text(), re.MULTILINE)
    if not m:
        sys.exit(f"error: {profile} has no 'stages: [...]' line in frontmatter")
    return [s.strip() for s in m.group(1).split(",") if s.strip()]


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("slug", help="kebab-case project slug")
    ap.add_argument("--format", required=True, dest="fmt", help="format profile name")
    ap.add_argument("--projects-dir", required=True, help="resolved {projects-path}")
    ap.add_argument("--formats-dir", required=True, help="resolved {formats-path}")
    ap.add_argument("--title", default="", help="working title")
    ap.add_argument("--parent", default=None, help="parent project slug (shorts)")
    ap.add_argument("--series", default=None,
                    help="kebab-case series slug; episode goes in the series folder")
    ap.add_argument("--deadline", default=None, metavar="YYYY-MM-DD",
                    help="external event deadline that gates delivery (deadline mode)")
    ap.add_argument("--ingest", default=None, metavar="FILE",
                    help="existing footage file: create the project footage-first "
                         "and register this source")
    ap.add_argument("--source-id", default=None,
                    help="source id for --ingest (default: derived from the filename)")
    ap.add_argument("--source-role", default="primary",
                    choices=["primary", "interview", "screen"],
                    help="source role for --ingest (default: primary)")
    args = ap.parse_args()

    if not re.fullmatch(KEBAB, args.slug):
        sys.exit("error: slug must be kebab-case (lowercase letters, digits, hyphens)")
    if args.series is not None and not re.fullmatch(KEBAB, args.series):
        sys.exit("error: series must be kebab-case (lowercase letters, digits, hyphens)")
    if args.deadline is not None:
        try:
            datetime.date.fromisoformat(args.deadline)
        except ValueError:
            sys.exit(f"error: --deadline must be an ISO date (YYYY-MM-DD), got {args.deadline!r}")
    if args.ingest is None and (args.source_id is not None or args.source_role != "primary"):
        sys.exit("error: --source-id and --source-role require --ingest")
    if args.ingest is not None and not Path(args.ingest).is_file():
        sys.exit(f"error: --ingest file not found: {args.ingest}")

    projects_dir = Path(args.projects_dir)
    formats_dir = Path(args.formats_dir)

    stages = read_profile_stages(formats_dir, args.fmt)
    if not stages or stages[0] != "new":
        sys.exit(
            f"error: {formats_dir / f'{args.fmt}.md'} stages must start with 'new' "
            f"(got {stages!r}); fix the profile's 'stages: [...]' line"
        )
    if args.ingest is not None:
        ideation = [s for s in stages if s in IDEATION_STAGES]
        if ideation:
            sys.exit(
                f"error: --ingest creates a footage-first project, but format {args.fmt!r} "
                f"includes ideation stages {ideation}; use a footage-first profile whose "
                "stages go straight to post-production, e.g. "
                "stages: [new, cut, beats, graphics, assets, package, final, retro]"
            )

    proj = (projects_dir / args.series / args.slug) if args.series else (projects_dir / args.slug)
    if proj.exists():
        sys.exit(f"error: {proj} already exists")
    if args.series:
        (projects_dir / args.series / "common").mkdir(parents=True, exist_ok=True)

    for sub in SUBDIRS:
        (proj / sub).mkdir(parents=True)

    state = {
        "slug": args.slug,
        "title": args.title,
        "format": args.fmt,
        "created": datetime.date.today().isoformat(),
        "parent": args.parent,
        "stage": stages[1] if len(stages) > 1 else stages[0],
        "series": args.series,
        "deadline": args.deadline,
        "stages": stages,
        "stages_done": ["new"],
        "approvals": {g: None for g in GATES},
        "artifacts": {},
        "notes": "",
    }
    if args.ingest is not None:
        source_id = args.source_id or slugify(Path(args.ingest).stem)
        state["sources"] = [{
            "id": source_id,
            "file": args.ingest,
            "role": args.source_role,
            "cfr": None,
        }]
    (proj / "project.json").write_text(json.dumps(state, indent=2) + "\n")

    brief = (
        f"# Brief: {args.title or args.slug}\n\n"
        f"Format: {args.fmt}\n"
        f"Created: {state['created']}\n"
    )
    if args.series:
        brief += f"Series: {args.series}\n"
    if args.deadline:
        brief += f"Deadline: {args.deadline} (external event gates delivery)\n"
    if args.ingest is not None:
        brief += f"Source footage: {args.ingest} (role: {args.source_role})\n"
    brief += (
        "\n## The idea (one paragraph, in the creator's words)\n\n\n"
        "## Why now\n\n\n"
        "## Source material\n\n(idea notes, links, prior material)\n"
    )
    (proj / "brief.md").write_text(brief)

    extras = []
    if args.series:
        extras.append(f"series={args.series}")
    if args.deadline:
        extras.append(f"deadline={args.deadline}")
    if args.ingest is not None:
        extras.append(f"source={state['sources'][0]['id']}")
    extra = (", " + ", ".join(extras)) if extras else ""
    print(f"created {proj} (format={args.fmt}, next stage: {state['stage']}{extra})")


if __name__ == "__main__":
    main()
