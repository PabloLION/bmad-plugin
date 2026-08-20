#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Source preflight for the cut stage: probe, VFR detection, disk check,
CFR remux, and QC frame extraction. Runs before any transcription or render.

Usage:
    uv run {skill-root}/scripts/preflight.py raw/<take> [raw/<other> ...] \
        [--remux] [--remux-suffix -cfr] [--qc-frames cut/qc/] \
        [--disk-path <dir>] [--json]

Contract:
    probe    each media file is ffprobed for its video stream (codec, width,
             height, r_frame_rate, avg_frame_rate) and container duration.
             A file is VFR when r_frame_rate and avg_frame_rate disagree by
             more than 0.5 percent.
    disk     free bytes on --disk-path (default: the first file's directory)
             are checked BEFORE any remux write against a rough estimate:
             3x total source size (transcripts, previews, renders) plus the
             estimated CFR-master size of each planned remux (duration times
             the master bitrate for the source height). "ok" false means stop
             and tell the creator before rendering; when a --remux is planned
             and the estimate does not fit, the remux is refused (exit 1, the
             summary still printed) so a runaway master is never written.
    remux    with --remux, each VFR file is re-encoded to constant frame rate
             at the nearest standard rate (23.976, 24, 25, 29.97, 30, 50,
             59.94, 60) into <stem><suffix>.mp4 beside the original (audio
             copied; hardware encoder when available at the master bitrate
             for the source height, 2x the delivery ladder for headroom;
             libx264 crf 18 otherwise). Runs only after the disk gate passes.
             The remuxed path is reported as cfr_master so the caller records
             it in project.json sources as the project source of truth; every
             later step (transcription, EDL times, renders, timeline export)
             must use it, never the VFR original.
    qc       with --qc-frames <dir>, the first and last frame of each source
             are extracted as <stem>-first.jpg / <stem>-last.jpg for the
             source QC pass (edge defects, wrong aspect, letterboxed or
             cropped content), inspected before any render is built.
    summary  json.dumps on stdout: per-file {path, codec, width, height,
             duration, fps, vfr, cfr_master, qc_frames}, plus
             {"disk": {free_bytes, needed_bytes, ok}} and "all_cfr".

Exit codes: 0 ok (VFR found still exits 0; the caller reads "vfr" and
"all_cfr"), 1 probe/remux failure or disk refusal of a planned remux, 2 usage.

STATUS: implemented (pure logic covered by scripts/tests/test-preflight.py;
probe/remux path covered by the synthesized-fixture integration test there).
"""

import argparse
import json
import subprocess
import sys
from fractions import Fraction
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import composite_core as core

STANDARD_RATES = ("24000/1001", "24/1", "25/1", "30000/1001", "30/1",
                  "50/1", "60000/1001", "60/1")


def parse_rate(text):
    """'30000/1001' or '30' -> Fraction, None for unknown/zero sentinels."""
    if not text:
        return None
    try:
        f = Fraction(text)
    except (ValueError, ZeroDivisionError):
        return None
    return f if f > 0 else None


def is_vfr(r_rate, avg_rate, tolerance=0.005):
    """True when the container's nominal and average rates disagree by more
    than `tolerance` (fraction). Unknown rates count as VFR (must remux)."""
    r, avg = parse_rate(r_rate), parse_rate(avg_rate)
    if r is None or avg is None:
        return True
    return abs(float(r) - float(avg)) / float(r) > tolerance


def nearest_standard_rate(avg_rate):
    """The standard CFR rate string closest to the measured average rate."""
    avg = parse_rate(avg_rate)
    if avg is None:
        return "30/1"
    return min(STANDARD_RATES, key=lambda r: abs(float(Fraction(r)) - float(avg)))


def master_bitrate_for(height):
    """CFR-master video bitrate (kbps): 2x the delivery ladder for the source
    height, for master headroom. Unknown height falls back to the 1080 tier."""
    return core.bitrate_for(height or 1080) * 2


def estimate_master_bytes(duration, height, source_bytes):
    """Rough CFR-master output size: duration times the master bitrate.
    Unknown duration falls back to 2x the source file size."""
    if not duration:
        return source_bytes * 2
    return int(duration * master_bitrate_for(height) * 1000 / 8)


def remux_command(src, dst, rate, encoder="libx264", crf=18, height=None):
    """ffmpeg argv re-encoding src to CFR at `rate` (audio copied).
    videotoolbox encoders have no CRF mode, so they take the master bitrate
    for the source height; libx264 takes -crf."""
    argv = ["ffmpeg", "-y", "-i", str(src), "-vf", f"fps={rate}"]
    if encoder.endswith("_videotoolbox"):
        argv += ["-c:v", encoder, "-b:v",
                 f"{master_bitrate_for(height)}k", "-allow_sw", "1"]
    else:
        argv += ["-c:v", encoder, "-crf", str(crf), "-preset", "fast"]
    argv += ["-pix_fmt", "yuv420p", "-c:a", "copy",
             "-movflags", "+faststart", str(dst)]
    return argv


def probe_media(path):
    """First video stream facts + duration, or None on probe failure."""
    proc = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries",
         "stream=codec_name,width,height,r_frame_rate,avg_frame_rate"
         ":format=duration",
         "-print_format", "json", str(path)],
        capture_output=True, text=True,
    )
    if proc.returncode != 0:
        return None
    data = json.loads(proc.stdout)
    streams = data.get("streams") or []
    if not streams:
        return None
    s = streams[0]
    dur = data.get("format", {}).get("duration")
    return {
        "codec": s.get("codec_name"),
        "width": s.get("width"),
        "height": s.get("height"),
        "r_frame_rate": s.get("r_frame_rate"),
        "avg_frame_rate": s.get("avg_frame_rate"),
        "duration": float(dur) if dur is not None else None,
    }


def extract_qc_frames(media, qc_dir, duration):
    """First and last frame stills for the edge-defect QC pass."""
    qc_dir.mkdir(parents=True, exist_ok=True)
    stem = Path(media).stem
    written = []
    jobs = [("first", ["-i", str(media)])]
    if duration and duration > 0.5:
        jobs.append(("last", ["-sseof", "-0.5", "-i", str(media)]))
    for name, input_args in jobs:
        dest = qc_dir / f"{stem}-{name}.jpg"
        proc = subprocess.run(
            ["ffmpeg", "-y", *input_args, "-frames:v", "1", "-q:v", "3",
             "-update", "1", str(dest)],
            capture_output=True, text=True,
        )
        if proc.returncode == 0 and dest.is_file():
            written.append(str(dest))
    return written


def build_summary(files, disk):
    return {
        "files": files,
        "all_cfr": all(not f["vfr"] or f["cfr_master"] for f in files),
        "disk": disk,
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("media", nargs="+", help="media files to preflight")
    parser.add_argument("--remux", action="store_true",
                        help="re-encode VFR files to CFR beside the original")
    parser.add_argument("--remux-suffix", default="-cfr")
    parser.add_argument("--qc-frames", default=None,
                        help="dir for first/last frame QC stills")
    parser.add_argument("--disk-path", default=None,
                        help="volume to disk-check (default: first file's dir)")
    args = parser.parse_args(argv)

    files = []
    remux_jobs = []
    total_bytes = 0
    master_bytes = 0
    for m in args.media:
        path = Path(m)
        if not path.is_file():
            print(f"preflight: media not found: {path}", file=sys.stderr)
            return 1
        info = probe_media(path)
        if info is None:
            print(f"preflight: cannot probe {path}", file=sys.stderr)
            return 1
        size = path.stat().st_size
        total_bytes += size
        vfr = is_vfr(info["r_frame_rate"], info["avg_frame_rate"])
        avg = parse_rate(info["avg_frame_rate"])
        entry = {
            "path": str(path),
            "codec": info["codec"],
            "width": info["width"],
            "height": info["height"],
            "duration": info["duration"],
            "fps": round(float(avg), 3) if avg else None,
            "vfr": vfr,
            "cfr_master": None,
            "qc_frames": [],
        }
        files.append(entry)
        if vfr and args.remux:
            master_bytes += estimate_master_bytes(
                info["duration"], info["height"], size)
            remux_jobs.append((entry, path, info))

    # Disk gate BEFORE any remux write: the CFR masters are the biggest
    # writes this script makes, so their estimated size is checked up front
    # and the remux refused when it does not fit (runaway-write hardening).
    disk_dir = Path(args.disk_path) if args.disk_path else Path(args.media[0]).parent
    needed = total_bytes * 3 + master_bytes
    ok, free = core.check_disk(disk_dir, needed, factor=1.0)
    disk = {"free_bytes": free, "needed_bytes": needed, "ok": ok}
    if not ok and remux_jobs:
        print(f"preflight: insufficient disk space: needs about "
              f"{needed / 1e9:.1f} GB (3x source size plus "
              f"{master_bytes / 1e9:.1f} GB of estimated CFR masters), "
              f"{free / 1e9:.1f} GB free on {disk_dir}. Refusing the remux; "
              "free space and re-run.", file=sys.stderr)
        print(json.dumps(build_summary(files, disk), indent=2))
        return 1

    for entry, path, info in remux_jobs:
        rate = nearest_standard_rate(info["avg_frame_rate"])
        dst = path.with_name(path.stem + args.remux_suffix + ".mp4")
        encoder = core.pick_encoder("auto")
        cmd = remux_command(path, dst, rate, encoder, height=info["height"])
        print(f"preflight: remuxing VFR {path.name} to CFR {rate} "
              f"({encoder})...", file=sys.stderr)
        proc = subprocess.run(cmd, capture_output=True, text=True)
        if proc.returncode != 0:
            print("preflight: remux failed:", file=sys.stderr)
            print(" ".join(cmd), file=sys.stderr)
            print(proc.stderr.strip()[-2000:], file=sys.stderr)
            return 1
        entry["cfr_master"] = str(dst)

    if args.qc_frames:
        for entry in files:
            entry["qc_frames"] = extract_qc_frames(
                entry["cfr_master"] or entry["path"], Path(args.qc_frames),
                entry["duration"])

    print(json.dumps(build_summary(files, disk), indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
