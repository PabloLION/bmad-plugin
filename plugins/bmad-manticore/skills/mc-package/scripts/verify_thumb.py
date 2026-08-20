#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Downscale-verify a thumbnail: write a small proof image and check platform specs.

Usage:
    uv run verify_thumb.py <image> --out-dir <dir> [--width 120]

The calling skill passes explicit paths; this script does no config discovery.
Requires ffmpeg and ffprobe on PATH (the studio's standing dependency).

Checks (YouTube-generic upload specs):
  - resolution at least 1280x720
  - aspect ratio 16:9 within 2 percent
  - file size at most 2 MiB (the platform's thumbnail upload cap)

Writes <out-dir>/<stem>.<width>px.png, the proof the calling skill MUST view
before presenting the thumbnail (no thumbnail ships unseen at 120px), and
prints a one-line JSON report to stdout:

    {"source": ..., "width": ..., "height": ..., "size_bytes": ...,
     "min_resolution_ok": ..., "aspect_ok": ..., "size_ok": ..., "proof": ...}

Exit codes: 0 all checks pass (proof written), 1 at least one check failed
(proof still written so the creator can see it), 2 usage/environment error
(missing file, ffmpeg/ffprobe not found, unreadable image).
"""

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

MIN_WIDTH = 1280
MIN_HEIGHT = 720
MAX_BYTES = 2 * 1024 * 1024
TARGET_ASPECT = 16 / 9
ASPECT_TOLERANCE = 0.02


def die(msg: str) -> None:
    """Usage/environment error: print to stderr and exit 2 (per the contract above)."""
    print(msg, file=sys.stderr)
    sys.exit(2)


def probe(image: Path) -> tuple[int, int]:
    """Return (width, height) of the first video stream via ffprobe."""
    cmd = [
        "ffprobe", "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=width,height", "-of", "json", str(image),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        die(f"error: ffprobe could not read {image}:\n{result.stderr.strip()}")
    streams = json.loads(result.stdout).get("streams") or []
    if not streams or "width" not in streams[0] or "height" not in streams[0]:
        die(f"error: no image stream found in {image}")
    return int(streams[0]["width"]), int(streams[0]["height"])


def evaluate(width: int, height: int, size_bytes: int) -> dict:
    """Pure spec check, separated from I/O so it is unit-testable."""
    aspect_ok = height > 0 and abs((width / height) - TARGET_ASPECT) / TARGET_ASPECT <= ASPECT_TOLERANCE
    return {
        "width": width,
        "height": height,
        "size_bytes": size_bytes,
        "min_resolution_ok": width >= MIN_WIDTH and height >= MIN_HEIGHT,
        "aspect_ok": aspect_ok,
        "size_ok": size_bytes <= MAX_BYTES,
    }


def write_proof(image: Path, out_dir: Path, width: int) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    proof = out_dir / f"{image.stem}.{width}px.png"
    cmd = [
        "ffmpeg", "-y", "-v", "error", "-i", str(image),
        "-vf", f"scale={width}:-1", "-frames:v", "1", str(proof),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0 or not proof.exists():
        die(f"error: ffmpeg could not write the proof image:\n{result.stderr.strip()}")
    return proof


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("image", type=Path, help="thumbnail image to verify")
    parser.add_argument("--out-dir", type=Path, required=True, help="folder for the downscaled proof image")
    parser.add_argument("--width", type=int, default=120, help="proof width in pixels (default 120)")
    args = parser.parse_args()

    if args.width < 1:
        die(f"error: --width must be positive, got {args.width}")
    if not args.image.is_file():
        die(f"error: image not found: {args.image}")
    for tool in ("ffprobe", "ffmpeg"):
        if shutil.which(tool) is None:
            die(f"error: {tool} not found on PATH; install ffmpeg (the studio's standing dependency)")

    width, height = probe(args.image)
    report = evaluate(width, height, args.image.stat().st_size)
    proof = write_proof(args.image, args.out_dir, args.width)
    report = {"source": str(args.image), **report, "proof": str(proof)}
    print(json.dumps(report))
    checks_ok = report["min_resolution_ok"] and report["aspect_ok"] and report["size_ok"]
    return 0 if checks_ok else 1


if __name__ == "__main__":
    sys.exit(main())
