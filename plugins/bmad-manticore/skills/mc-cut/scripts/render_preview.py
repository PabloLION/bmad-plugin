#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Render the fast low-res preview of cut/edl.json and self-verify its cut
boundaries; optionally composite the beat table's graphics onto it.

Usage:
    uv run {skill-root}/scripts/render_preview.py <edl.json> -o <preview.mp4> \
        [--project-dir <dir>] [--boundary-frames <dir>] [--height 720] \
        [--beats <beats.md> --graphics-dir <dir>]

Purpose:
    The render-first iteration artifact: a low-bitrate preview.mp4 the creator
    watches after EVERY cutplan approval, plus the boundary-frame stills the
    skill inspects to confirm no cut lands inside a word (the cutting rules'
    self-verify step). Unlike the FCPXML export, the preview uses the EDL's
    raw segment times (not frame-snapped boundaries) and bakes the fades in,
    so it is the ground truth for what the audience hears. Once the beats
    stage has run and graphics/ holds rendered overlays, pass --beats and
    --graphics-dir to re-render the preview WITH graphics composited at low
    res; the compositing core (composite_core.py) is shared with
    render_final.py, so the composited preview shows exactly what the final
    will bake.

Contract:
    input   edl.json: {source, fade_ms, pad_ms, segments[]}; each segment is
            {source, start, end, ...} with start/end in seconds against its
            source. N distinct sources become N ffmpeg inputs.
    output  a draft H.264/AAC mp4 at -o. One ffmpeg invocation builds the
            whole timeline via filter_complex: per segment a trim/atrim from
            its source, an afade in and out of fade_ms (edl.json, default
            30ms) at every boundary, scaled to --height (default 720, aspect
            kept, even width), then concat; encoded libx264 crf 28 preset
            veryfast + aac. The exact ffmpeg command is printed to stderr on
            failure.
    beats   optional composited mode: --beats beats/beats.md (the
            engine-neutral beat table; anchors measured against the EDITED
            timeline) plus --graphics-dir graphics/ holding one rendered
            overlay per beat id (<id>.mov ProRes 4444 alpha, or
            .webm/.mp4/.mkv/.png). Overlays are scaled to the preview frame
            and composited in their beat windows. Beats without a matching
            file are reported in the summary as overlays_missing, never
            fatal.
    boundary-frames
            optional dir. After the render, one frame just before and one just
            after each internal cut boundary of the OUTPUT is extracted to
            <dir>/boundary-<n>-a.jpg (before) and boundary-<n>-b.jpg (after),
            n starting at 1, so the skill can inspect each cut.
    summary json.dumps on stdout: segments, expected_duration (sum of raw
            segment durations), actual_duration (ffprobe of the output),
            boundary_frames, overlays / overlays_missing (composited mode),
            output path.

Exit codes: 0 ok (and expected vs actual duration within 0.5s), 1 failure,
2 usage.

STATUS: implemented (plain mode validated on real footage; composited mode
covered by the scripts/tests suite).
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import composite_core as core

# Re-exported so callers and tests can use the script as the single surface.
segment_durations = core.segment_durations
boundary_times = core.boundary_times
build_filter_complex = core.build_filter_complex
build_command = core.build_command
probe_duration = core.probe_duration
extract_boundary_frames = core.extract_boundary_frames


def gather_overlays(beats_path, graphics_dir):
    """Parse the beat table and resolve overlay files.

    Returns (overlays, missing, skipped) or raises OSError/ValueError with a
    readable message."""
    text = Path(beats_path).read_text(encoding="utf-8")
    beats, skipped = core.parse_beats_table(text)
    overlays, missing = core.resolve_overlays(beats, graphics_dir)
    return overlays, missing, skipped


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("edl", help="path to cut/edl.json")
    parser.add_argument("-o", "--output", required=True, help="output preview.mp4")
    parser.add_argument("--project-dir", default=None,
                        help="base for source paths (default: edl parent's parent)")
    parser.add_argument("--boundary-frames", default=None,
                        help="dir to write per-cut boundary stills into")
    parser.add_argument("--height", type=int, default=720)
    parser.add_argument("--beats", default=None,
                        help="beats/beats.md to composite graphics from")
    parser.add_argument("--graphics-dir", default=None,
                        help="dir holding one rendered overlay per beat id")
    args = parser.parse_args(argv)

    edl_path = Path(args.edl).resolve()
    if not edl_path.is_file():
        print(f"edl not found: {edl_path}", file=sys.stderr)
        return 2
    if bool(args.beats) != bool(args.graphics_dir):
        print("--beats and --graphics-dir must be given together", file=sys.stderr)
        return 2
    project_dir = (
        Path(args.project_dir).resolve() if args.project_dir
        else edl_path.parent.parent
    )
    edl = json.loads(edl_path.read_text())
    if not edl.get("segments"):
        print("edl has no segments", file=sys.stderr)
        return 2

    overlays, missing, skipped = [], [], []
    overlay_size = None
    if args.beats:
        try:
            overlays, missing, skipped = gather_overlays(args.beats,
                                                         args.graphics_dir)
        except (OSError, ValueError) as e:
            print(f"cannot read beat table: {e}", file=sys.stderr)
            return 1
        for reason in skipped:
            print(f"beat row skipped: {reason}", file=sys.stderr)
        if overlays:
            dims = core.probe_dims(project_dir / edl["segments"][0]["source"])
            if dims is None:
                print("cannot probe source dimensions for overlay scaling",
                      file=sys.stderr)
                return 1
            ow = core.even(dims[0] * args.height / dims[1])
            overlay_size = (ow, args.height)

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    cmd, _ = build_command(edl, project_dir, output, args.height,
                           overlays=overlays, overlay_size=overlay_size)
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        print("ffmpeg render failed:", file=sys.stderr)
        print(" ".join(cmd), file=sys.stderr)
        print(proc.stderr.strip()[-2000:], file=sys.stderr)
        return 1

    expected = sum(segment_durations(edl))
    actual = probe_duration(output)

    boundary_count = 0
    if args.boundary_frames:
        boundary_count = extract_boundary_frames(
            output, edl, Path(args.boundary_frames))

    summary = {
        "segments": len(edl["segments"]),
        "expected_duration_seconds": round(expected, 3),
        "actual_duration_seconds": round(actual, 3) if actual is not None else None,
        "boundary_frames": boundary_count,
        "output": str(output.resolve()),
    }
    if args.beats:
        summary["overlays"] = len(overlays)
        summary["overlays_missing"] = missing
    print(json.dumps(summary, indent=2))

    if actual is None or abs(actual - expected) > 0.5:
        print(
            f"duration mismatch: expected {expected:.3f}s, got {actual}s",
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
