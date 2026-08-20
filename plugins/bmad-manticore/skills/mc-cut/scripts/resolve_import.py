#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Push a project's cut + graphics into DaVinci Resolve Studio (phase 3/4).

Usage:
    uv run {skill-root}/scripts/resolve_import.py --project <slug> [--timeline-only]

Contract:
    uses    Resolve Studio's external Python scripting API (requires DaVinci
            Resolve Studio; the scripting API is not in the free edition):
            ImportTimelineFromFile for cut/rough.fcpxml, MediaPool import for
            graphics/ alpha MOVs and assets/, AppendToTimeline with clipInfo
            dicts for positioned placement
    output  a Resolve project with the rough timeline + media bins, ready for
            the creator's polish pass
    note    Resolve must be running with scripting enabled (or -nogui); a
            community DaVinci Resolve MCP server is the interactive
            alternative, this script is the deterministic pipeline lane

STATUS: stub. Implement in build-order item 3 (timeline import) and extend in
phase 4 (graphics bins).
"""

import sys

sys.exit("resolve_import.py is not implemented yet (build-order item 3). See docstring for the contract.")
