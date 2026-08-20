#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Frame a photo snugly at its NATIVE aspect ratio, ffprobe-driven.

Usage:
    uv run {skill-root}/scripts/snug_frame.py <image> --out <out.png>
        --max-w 1200 --max-h 800 [--border 24] [--frame-color #ffffff]
        [--radius 0] [--allow-upscale]

Why:
    Photos dropped into uniform 16:9 panels get letterboxed: dead bars around
    the image inside the panel. The Production Bible rule is snug native-aspect
    frames, never uniform letterboxed panels. This script probes the photo's
    real dimensions and builds a frame that hugs them: the framed panel is
    exactly the scaled photo plus its border, so one edge meets the bounding
    box and the other stays snug. It never pads the photo to fill the box.

Contract:
    input   any image ffmpeg can decode; --max-w/--max-h bound the TOTAL framed
            size (border included); all values arrive as explicit flags, no
            config discovery (pass --frame-color and --radius from
            {brand-path}/tokens.json / the Production Bible)
    scaling ffprobe reads the native size; the photo scales by one uniform
            factor to the largest size whose framed result fits the box;
            aspect is never changed; upscaling past native size is refused
            unless --allow-upscale (blurry blowups are a defect)
    frame   --border px of --frame-color on all four sides; --radius rounds
            the framed panel's corners, and the cut corners are TRANSPARENT
            (alpha 0) so the panel composites cleanly over video
    output  a PNG with alpha and a structured JSON report to stdout (native
            size, scale factor, content size, framed size); exit 0 on
            success, nonzero otherwise
"""

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path


def die(msg: str) -> None:
    print(json.dumps({"ok": False, "error": msg}))
    sys.exit(2)


def probe_size(path: Path) -> tuple[int, int]:
    if shutil.which("ffprobe") is None:
        die("ffprobe not found on PATH (install ffmpeg)")
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", str(path)],
        capture_output=True, text=True)
    if r.returncode != 0:
        die(f"ffprobe failed: {r.stderr.strip()}")
    streams = [s for s in json.loads(r.stdout).get("streams", [])
               if s.get("codec_type") == "video"]
    if not streams:
        die(f"no image/video stream in {path}")
    return int(streams[0]["width"]), int(streams[0]["height"])


def main() -> None:
    p = argparse.ArgumentParser(description="Snug native-aspect photo framing")
    p.add_argument("image", help="source photo")
    p.add_argument("--out", required=True, help="output png path")
    p.add_argument("--max-w", type=int, required=True, help="max total framed width")
    p.add_argument("--max-h", type=int, required=True, help="max total framed height")
    p.add_argument("--border", type=int, default=24, help="frame border in px (default 24)")
    p.add_argument("--frame-color", default="#ffffff",
                   help="frame color (pass from tokens.json; default #ffffff)")
    p.add_argument("--radius", type=int, default=0,
                   help="corner radius in px; cut corners are transparent (default 0)")
    p.add_argument("--allow-upscale", action="store_true",
                   help="permit scaling the photo past its native size")
    args = p.parse_args()

    src = Path(args.image)
    if not src.is_file():
        die(f"input not found: {src}")
    if shutil.which("ffmpeg") is None:
        die("ffmpeg not found on PATH")

    w, h = probe_size(src)
    b = max(0, args.border)
    avail_w = args.max_w - 2 * b
    avail_h = args.max_h - 2 * b
    if avail_w < 1 or avail_h < 1:
        die(f"--border {b} leaves no room inside {args.max_w}x{args.max_h}")

    factor = min(avail_w / w, avail_h / h)
    if factor > 1 and not args.allow_upscale:
        factor = 1.0
    sw = max(1, round(w * factor))
    sh = max(1, round(h * factor))
    fw, fh = sw + 2 * b, sh + 2 * b

    filters = [f"scale={sw}:{sh}"]
    if b:
        filters.append(f"pad={fw}:{fh}:{b}:{b}:color={args.frame_color}")
    filters.append("format=rgba")
    if args.radius > 0:
        r = min(args.radius, fw // 2, fh // 2)
        corner = (f"pow(max({r}-min(X,W-1-X),0),2)+"
                  f"pow(max({r}-min(Y,H-1-Y),0),2)")
        filters.append(
            f"geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':"
            f"a='if(lte({corner},pow({r},2)),alpha(X,Y),0)'")

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    cmd = ["ffmpeg", "-y", "-v", "error", "-i", str(src),
           "-vf", ",".join(filters), "-frames:v", "1", str(out)]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0 or not out.is_file():
        die(f"ffmpeg failed: {r.stderr.strip()}")

    got_w, got_h = probe_size(out)
    if (got_w, got_h) != (fw, fh):
        die(f"output size {got_w}x{got_h} != expected {fw}x{fh}")

    print(json.dumps({
        "ok": True,
        "input": str(src),
        "out": str(out),
        "native": {"width": w, "height": h},
        "scale": round(factor, 6),
        "content": {"width": sw, "height": sh},
        "framed": {"width": fw, "height": fh},
        "border": b,
        "radius": args.radius,
        "note": "Framed snug at native aspect; never letterboxed to a uniform panel.",
    }, indent=2))


if __name__ == "__main__":
    main()
