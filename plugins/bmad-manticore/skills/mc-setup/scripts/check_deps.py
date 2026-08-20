#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Check the external dependencies the Manticore pipeline needs.

Usage:
    uv run check_deps.py [--json]

Checks presence on PATH (and Python version), plus a platform gate: the
default transcription lane (parakeet-mlx) runs only on Apple Silicon. On
other machines the report points at the documented local fallbacks
(whisper.cpp or faster-whisper); the gate never fails the check. Prints a
table (or JSON) and exits 0 if all required deps are present, 1 otherwise.
Installs nothing.
"""

import argparse
import json
import platform
import shutil
import sys

DEPS = [
    # (command, required, why)
    ("uv", True, "runs every pipeline script (installs Python automatically if needed)"),
    ("ffmpeg", True, "frame extraction, re-mux to constant frame rate, preview renders"),
    ("ffprobe", True, "frame-rate and pixel-format verification"),
    ("node", True, "HyperFrames and Remotion render engines"),
    ("npx", True, "hyperframes CLI and registry blocks"),
    ("git", True, "project history"),
    ("yt-dlp", False, "pulling your published transcripts for the voice bible"),
]


def is_apple_silicon() -> bool:
    return sys.platform == "darwin" and platform.machine() == "arm64"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    results = []
    py_ok = sys.version_info >= (3, 11)
    results.append({
        "dep": "python3.11+",
        "required": False,
        "found": py_ok,
        "detail": f"running {sys.version_info.major}.{sys.version_info.minor}; uv provisions a suitable Python if the system one is old",
    })
    apple_silicon = is_apple_silicon()
    results.append({
        "dep": "apple-silicon",
        "required": False,
        "found": apple_silicon,
        "detail": (
            "default transcription lane (parakeet-mlx) is supported on this machine"
            if apple_silicon
            else "default transcription lane (parakeet-mlx) is Apple-Silicon-only; use a "
            "local whisper.cpp or faster-whisper fallback on this machine (word "
            "timestamps, but fillers get normalized, so cut quality drops; a supported "
            "cross-platform lane is planned). See the README platform matrix."
        ),
    })
    for cmd, required, why in DEPS:
        path = shutil.which(cmd)
        results.append({"dep": cmd, "required": required, "found": bool(path), "detail": path or why})

    missing_required = [r for r in results if r["required"] and not r["found"]]

    if args.json:
        print(json.dumps({"results": results, "ok": not missing_required}, indent=2))
    else:
        for r in results:
            mark = "ok " if r["found"] else ("MISSING " if r["required"] else "missing (optional) ")
            print(f"{mark:22} {r['dep']:14} {r['detail']}")
        if not apple_silicon:
            print(
                "\nNOTE: this machine cannot run the default transcription lane "
                "(parakeet-mlx is Apple-Silicon-only). Until the cross-platform lane "
                "ships, run whisper.cpp or faster-whisper locally instead; see the "
                "README platform matrix."
            )
        if missing_required:
            print(f"\n{len(missing_required)} required dependency(ies) missing.")

    raise SystemExit(1 if missing_required else 0)


if __name__ == "__main__":
    main()
