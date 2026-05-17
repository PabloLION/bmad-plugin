#!/usr/bin/env python3
"""Scaffold _bmad/ into the user's project on first BMAD skill invocation.

Wired as a PreToolUse hook for the Skill tool in plugin.json. When Claude
calls a `bmad-*` or `gds-*` skill and the project root has no `_bmad/`,
copy the bundled template (`${CLAUDE_PLUGIN_ROOT}/_bmad-template`) so the
skill's `python3 {project-root}/_bmad/scripts/resolve_customization.py …`
step succeeds instead of failing with [Errno 2].

Idempotent: skips when _bmad/ already exists. Silent for non-BMAD tool
calls. Never blocks the original call — always exits 0 even on copy
failures so users see the underlying skill output, not a hook crash.
"""

from __future__ import annotations

import json
import os
import shutil
import sys


def _skill_name(payload: dict) -> str:
    tool_input = payload.get("tool_input") or {}
    return (
        tool_input.get("skill")
        or tool_input.get("skill_name")
        or tool_input.get("name")
        or ""
    )


def _is_bmad_skill(skill: str) -> bool:
    bare = skill.split(":", 1)[-1]
    return bare.startswith("bmad") or bare.startswith("gds")


def main() -> int:
    try:
        raw = sys.stdin.read()
        payload = json.loads(raw) if raw.strip() else {}
    except (json.JSONDecodeError, ValueError):
        return 0

    if payload.get("tool_name") != "Skill":
        return 0

    skill = _skill_name(payload)
    if not skill or not _is_bmad_skill(skill):
        return 0

    plugin_root = os.environ.get("CLAUDE_PLUGIN_ROOT")
    if not plugin_root:
        return 0

    project_dir = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
    target = os.path.join(project_dir, "_bmad")
    source = os.path.join(plugin_root, "_bmad-template")

    if os.path.isdir(target):
        return 0
    if not os.path.isdir(source):
        return 0

    try:
        shutil.copytree(source, target)
    except OSError as exc:
        print(f"[bmad-plugin] could not seed _bmad/ ({exc})", file=sys.stderr)
        return 0

    print(
        f"[bmad-plugin] seeded _bmad/ in {project_dir} "
        f"(edit _bmad/config.user.toml to personalize, or re-run "
        f"`npx bmad-method install` to walk the installer prompts)",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
