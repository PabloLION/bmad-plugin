#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Verify a rendered graphic before it is called done.

Usage:
    uv run {skill-root}/scripts/render_verify.py <rendered-file>
        [--meta PATH] [--pixfmt prores4444|yuva420p|<raw pix_fmt>]
        [--expect-dur SECONDS] [--expect-fps FPS] [--expect-res WxH]
        [--dur-tol SECONDS] [--frames 5] [--checker] [--out-dir PATH]

Contract:
    input   a rendered MOV/WebM/mp4; every expectation arrives explicitly from
            the calling skill, either as flags (--pixfmt from the delivery
            target, --expect-dur from the beat's dur, --expect-fps and
            --expect-res from the format profile) or as --meta pointing at the
            comp's meta.json render contract; the script does no config
            discovery of its own
    meta    meta.json keys: "pixfmt", "res" ("WxH"), "fps" (number),
            "dur" (seconds, number); unknown keys are ignored; an explicit
            flag always overrides the meta value
    checks  ffprobe: pixel format vs the expectation ("prores4444" accepts
            prores with yuva444p10le/yuva444p12le; "yuva420p" accepts native
            yuva420p or WebM/VP9 alpha signalled via the alpha_mode tag; any
            other value is compared raw), resolution vs WxH, fps vs expected
            (tolerance 0.05), duration vs expected (tolerance --dur-tol,
            default 0.2s); checks are skipped for expectations not provided
            ffmpeg: extract N frames evenly spaced (composited over a
            checkerboard when the file carries alpha, or when --checker is
            passed) into a _verify/ folder next to the input (or --out-dir)
            for visual inspection by the calling skill
    output  structured JSON to stdout: probe summary, per-check
            expected/actual/pass, extracted frame paths; exit 0 when every
            check passes, exit 1 when any check fails, exit 2 on hard errors
            (missing input, no video stream, missing ffprobe/ffmpeg)
    rule    a render is NOT done until frames have been extracted and visually
            checked (the self-QA loop: edit, lint, preview, draft render
            CRF 28, single-frame verify, final render)
"""

import argparse
import json
import shutil
import subprocess
import sys
from fractions import Fraction
from pathlib import Path

FPS_TOL = 0.05
CHECKER_CELL = 32

# pix_fmt names (ffprobe vocabulary) that carry an alpha plane/channel
ALPHA_HINTS = ("yuva", "rgba", "bgra", "argb", "abgr", "gbrap", "ya8", "ya16")


def die(msg: str) -> None:
    print(json.dumps({"ok": False, "error": msg}))
    sys.exit(2)


def probe(path: Path) -> dict:
    if shutil.which("ffprobe") is None:
        die("ffprobe not found on PATH (install ffmpeg)")
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-print_format", "json",
         "-show_streams", "-show_format", str(path)],
        capture_output=True, text=True)
    if r.returncode != 0:
        die(f"ffprobe failed: {r.stderr.strip()}")
    return json.loads(r.stdout)


def parse_fps(stream: dict) -> float | None:
    for key in ("avg_frame_rate", "r_frame_rate"):
        raw = stream.get(key, "")
        if raw and raw != "0/0":
            try:
                return float(Fraction(raw))
            except (ValueError, ZeroDivisionError):
                continue
    return None


def parse_duration(stream: dict, fmt: dict, fps: float | None) -> float | None:
    for source in (stream, fmt):
        raw = source.get("duration")
        if raw is not None:
            try:
                return float(raw)
            except ValueError:
                continue
    nb = stream.get("nb_frames")
    if nb and fps:
        try:
            return int(nb) / fps
        except ValueError:
            pass
    return None


def has_alpha(stream: dict) -> bool:
    pix_fmt = stream.get("pix_fmt", "")
    if any(h in pix_fmt for h in ALPHA_HINTS):
        return True
    tags = {k.lower(): v for k, v in stream.get("tags", {}).items()}
    return tags.get("alpha_mode") == "1"


def check_pixfmt(expected: str, stream: dict) -> bool:
    pix_fmt = stream.get("pix_fmt", "")
    codec = stream.get("codec_name", "")
    if expected == "prores4444":
        return codec == "prores" and pix_fmt in ("yuva444p10le", "yuva444p12le")
    if expected == "yuva420p":
        return pix_fmt == "yuva420p" or (pix_fmt == "yuv420p" and has_alpha(stream))
    return pix_fmt == expected


def extract_frames(path: Path, out_dir: Path, count: int, duration: float | None,
                   width: int, height: int, checker: bool) -> list[str]:
    if shutil.which("ffmpeg") is None:
        die("ffmpeg not found on PATH")
    out_dir.mkdir(parents=True, exist_ok=True)
    if duration is None or duration <= 0:
        timestamps = [0.0]
    else:
        timestamps = [duration * (i + 0.5) / count for i in range(count)]
    frames = []
    for i, t in enumerate(timestamps):
        out = out_dir / f"{path.stem}_f{i:02d}_t{t:.2f}s.png"
        if checker:
            # Two passes on purpose: grab the frame first, then composite the
            # still over the board. A single seek+overlay command can emit its
            # first output frame before the seeked input reaches the overlay's
            # framesync, which silently writes a bare checkerboard.
            raw = out_dir / f"{path.stem}_f{i:02d}_raw.png"
            grab = ["ffmpeg", "-y", "-v", "error", "-ss", f"{t:.6f}", "-i", str(path),
                    "-frames:v", "1", str(raw)]
            r = subprocess.run(grab, capture_output=True, text=True)
            if r.returncode != 0 or not raw.exists():
                die(f"frame extraction failed at t={t:.2f}s: {r.stderr.strip()}")
            board = (
                f"color=c=black:s={width}x{height}:r=30,format=gray,"
                f"geq=lum='if(mod(floor(X/{CHECKER_CELL})+floor(Y/{CHECKER_CELL}),2),176,118)',"
                "format=rgb24"
            )
            cmd = ["ffmpeg", "-y", "-v", "error",
                   "-f", "lavfi", "-i", board, "-i", str(raw),
                   "-filter_complex",
                   "[1:v]format=rgba[fg];[0:v][fg]overlay=format=auto,format=rgb24",
                   "-frames:v", "1", str(out)]
            r = subprocess.run(cmd, capture_output=True, text=True)
            raw.unlink(missing_ok=True)
            if r.returncode != 0 or not out.exists():
                die(f"checkerboard compositing failed at t={t:.2f}s: {r.stderr.strip()}")
        else:
            cmd = ["ffmpeg", "-y", "-v", "error", "-ss", f"{t:.6f}", "-i", str(path),
                   "-frames:v", "1", str(out)]
            r = subprocess.run(cmd, capture_output=True, text=True)
            if r.returncode != 0 or not out.exists():
                die(f"frame extraction failed at t={t:.2f}s: {r.stderr.strip()}")
        frames.append(str(out))
    return frames


def main() -> None:
    p = argparse.ArgumentParser(description="Verify a rendered graphic (ffprobe checks + frame extraction)")
    p.add_argument("input", help="rendered MOV/WebM/mp4")
    p.add_argument("--meta", help="comp meta.json render contract (keys: pixfmt, res, fps, dur)")
    p.add_argument("--pixfmt", help="prores4444 | yuva420p | raw pix_fmt name")
    p.add_argument("--expect-dur", type=float, help="expected duration in seconds (the beat's dur)")
    p.add_argument("--expect-fps", type=float, help="expected frame rate")
    p.add_argument("--expect-res", help="expected resolution WxH, e.g. 1920x1080")
    p.add_argument("--dur-tol", type=float, default=0.2, help="duration tolerance in seconds (default 0.2)")
    p.add_argument("--frames", type=int, default=5, help="frames to extract, evenly spaced (default 5)")
    p.add_argument("--checker", action="store_true",
                   help="force checkerboard compositing (automatic for alpha files)")
    p.add_argument("--out-dir", help="frame output folder (default: _verify/ next to the input)")
    args = p.parse_args()

    path = Path(args.input)
    if not path.is_file():
        die(f"input not found: {path}")

    expect: dict = {}
    if args.meta:
        meta_path = Path(args.meta)
        if not meta_path.is_file():
            die(f"--meta not found: {meta_path}")
        try:
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            die(f"--meta is not valid JSON: {e}")
        for key in ("pixfmt", "res", "fps", "dur"):
            if key in meta and meta[key] not in (None, ""):
                expect[key] = meta[key]
    if args.pixfmt:
        expect["pixfmt"] = args.pixfmt
    if args.expect_res:
        expect["res"] = args.expect_res
    if args.expect_fps is not None:
        expect["fps"] = args.expect_fps
    if args.expect_dur is not None:
        expect["dur"] = args.expect_dur

    data = probe(path)
    streams = [s for s in data.get("streams", []) if s.get("codec_type") == "video"]
    if not streams:
        die(f"no video stream in {path}")
    stream = streams[0]
    fmt = data.get("format", {})

    width = int(stream.get("width", 0))
    height = int(stream.get("height", 0))
    fps = parse_fps(stream)
    duration = parse_duration(stream, fmt, fps)
    alpha = has_alpha(stream)

    checks: dict = {}
    if "pixfmt" in expect:
        checks["pixfmt"] = {
            "expected": str(expect["pixfmt"]),
            "actual": f"{stream.get('codec_name', '?')}/{stream.get('pix_fmt', '?')}",
            "pass": check_pixfmt(str(expect["pixfmt"]), stream),
        }
    if "res" in expect:
        try:
            ew, eh = (int(v) for v in str(expect["res"]).lower().split("x"))
        except ValueError:
            die(f"bad resolution expectation (want WxH): {expect['res']}")
        checks["res"] = {"expected": f"{ew}x{eh}", "actual": f"{width}x{height}",
                         "pass": (width, height) == (ew, eh)}
    if "fps" in expect:
        efps = float(expect["fps"])
        checks["fps"] = {"expected": efps, "actual": fps,
                         "pass": fps is not None and abs(fps - efps) <= FPS_TOL}
    if "dur" in expect:
        edur = float(expect["dur"])
        checks["dur"] = {"expected": edur, "actual": duration, "tolerance": args.dur_tol,
                         "pass": duration is not None and abs(duration - edur) <= args.dur_tol}

    out_dir = Path(args.out_dir) if args.out_dir else path.parent / "_verify"
    use_checker = alpha or args.checker
    frames = extract_frames(path, out_dir, max(1, args.frames), duration,
                            width, height, use_checker)

    ok = all(c["pass"] for c in checks.values())
    print(json.dumps({
        "ok": ok,
        "input": str(path),
        "probe": {"codec": stream.get("codec_name"), "pix_fmt": stream.get("pix_fmt"),
                  "width": width, "height": height, "fps": fps,
                  "duration": duration, "alpha": alpha},
        "checks": checks,
        "checkerboard": use_checker,
        "frames": frames,
        "note": "A render is not done until the extracted frames have been visually checked.",
    }, indent=2))
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
