#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Export cut/edl.json as an editable FCPXML timeline for the creator's editor.

Usage:
    uv run {skill-root}/scripts/edl_to_fcpxml.py <edl.json> -o <rough.fcpxml> \
        [--format fcpxml] [--project-dir <dir>]

Contract:
    input   edl.json: {source, source_duration, fade_ms, pad_ms, segments[]}.
            Each segment is {source, start, end, beat, quote, reason}; start/end
            are seconds against that segment's source file. edl.json is the
            editor-neutral source of truth; this script is only the export step.
            N distinct sources are supported (one <asset> each); every source
            must share the primary source's frame rate (mixed-rate timelines are
            refused, see below).
    output  an FCPXML document written to -o. json.dumps summary on stdout
            (segments, sources, fps, total duration seconds, output path).
    format  --format (default fcpxml). fcpxml is implemented here. xmeml and edl
            are the planned lanes: they exit 3 with a pointer ("planned lane, see
            TODO; use cutplan.md + edl.json meanwhile"). This script is the single
            export switch; the planned lanes land here (tracked in TODO.md).
    project-dir
            defaults to the edl.json's parent's parent (edl lives in
            <project>/cut/). Source paths resolve against it.

FCPXML version:
    Emits version 1.9. 1.9 is the highest DTD that both DaVinci Resolve's
    File > Import > Timeline importer and Final Cut Pro (10.4.9+) parse without
    dropping clips; 1.10+ adds elements (conform-rate variants, sync-clip
    changes) that older Resolve importers reject, and nothing here needs them.

Frame quantization (the correctness trap this converter exists to get right):
    EDL times are seconds; FCPXML needs frame-aligned rational times. Every
    boundary is snapped OUTWARD on the frame grid -- start floors, end ceils --
    so a cut never lands inside a word; the EDL's pad_ms budget (default 60ms)
    absorbs the snap. All arithmetic is exact integer rational (fractions.
    Fraction / integer frame counts); no float is ever accumulated across the
    spine. Times are emitted over a uniform timebase of the frame-rate numerator
    (frame k -> "{k*den}/{num}s"), so every value is an exact integer multiple of
    frameDuration ("{den}/{num}s"). Sequence offsets are the running sum of
    snapped clip durations (gapless), verified after emission.

Constant frame rate:
    VFR sources are refused (exit 1): r_frame_rate is compared against
    avg_frame_rate and a meaningful difference means re-mux to CFR first. This is
    the module's known FCPXML-desync failure mode. Mixed frame rates across
    sources are refused for the same reason.

Audio fades:
    FCPXML asset-clip volume/fade handling is honored inconsistently across
    importers, so no fade element is emitted here. The 30ms boundary fades are
    guaranteed by render_preview.py (the watch copy); re-applying them in the
    editor is a taste call left to the creator.

Verify:
    The output is parsed back with xml.etree and self-checked: every clip
    duration is a whole number of frames and offsets are gapless. Sync must still
    be verified in the editor on the first project this converter touches
    (timeline desync is the known failure mode).

Exit codes: 0 ok, 1 failure (incl. VFR / mixed-rate), 2 usage, 3 unimplemented
format.

STATUS: implemented (build-order item 1).
"""

import argparse
import json
import math
import subprocess
import sys
import xml.etree.ElementTree as ET
from fractions import Fraction
from pathlib import Path
from urllib.parse import quote


# --- rational / frame-grid helpers (pure, unit-tested) --------------------

def parse_rate(text):
    """Parse an ffprobe rate string ('30/1', '30000/1001', '0/0') to a Fraction.

    Returns None for the '0/0'/'0' unknown sentinel."""
    text = (text or "").strip()
    if "/" in text:
        num, den = text.split("/", 1)
        num, den = int(num), int(den)
        if den == 0 or num == 0:
            return None
        return Fraction(num, den)
    if not text or text == "0":
        return None
    return Fraction(text)


def snap_start(seconds, fps):
    """Frame index for a start time, floored (snapped earlier / outward)."""
    return math.floor(Fraction(seconds) * fps)


def snap_end(seconds, fps):
    """Frame index for an end time, ceiled (snapped later / outward)."""
    return math.ceil(Fraction(seconds) * fps)


def fmt_time(frames, num, den):
    """A whole-frame time as an FCPXML rational string over the num/den timebase.

    frame k == k * (den/num) seconds, emitted unreduced as '{k*den}/{num}s' so
    the whole document shares one denominator and every value is an exact
    multiple of the frame duration. Zero collapses to '0s'."""
    if frames == 0:
        return "0s"
    return f"{frames * den}/{num}s"


def fmt_frame_duration(num, den):
    """The single-frame duration as an FCPXML rational string ('{den}/{num}s')."""
    return f"{den}/{num}s"


def parse_time(text):
    """Inverse of fmt_time: an FCPXML rational time string to a Fraction seconds."""
    text = text.strip()
    if text.endswith("s"):
        text = text[:-1]
    if "/" in text:
        num, den = text.split("/", 1)
        return Fraction(int(num), int(den))
    return Fraction(text)


# --- source probing -------------------------------------------------------

def probe_source(path):
    """ffprobe one source; return the fields the timeline needs.

    Raises SystemExit(1) on a VFR source (r_frame_rate vs avg_frame_rate diverge
    meaningfully) or when the video stream / frame rate cannot be read."""
    proc = subprocess.run(
        ["ffprobe", "-v", "error", "-print_format", "json",
         "-show_streams", "-show_format", str(path)],
        capture_output=True, text=True,
    )
    if proc.returncode != 0:
        sys.exit(f"ffprobe failed on {path}:\n{proc.stderr.strip()}")
    data = json.loads(proc.stdout)
    streams = data.get("streams", [])
    video = next((s for s in streams if s.get("codec_type") == "video"), None)
    if video is None:
        sys.exit(f"no video stream in {path}")

    r_rate = parse_rate(video.get("r_frame_rate"))
    avg_rate = parse_rate(video.get("avg_frame_rate"))
    if r_rate is None:
        sys.exit(f"could not read a frame rate for {path}")
    if avg_rate is not None and r_rate != avg_rate:
        # Relative difference over 0.5% -> treat as variable frame rate.
        diff = abs(r_rate - avg_rate) / r_rate
        if diff > Fraction(1, 200):
            sys.exit(
                f"{path} looks variable frame rate "
                f"(r_frame_rate={video.get('r_frame_rate')} "
                f"avg_frame_rate={video.get('avg_frame_rate')}). "
                "Re-mux to constant frame rate before cutting "
                "(this is the module's known FCPXML-desync failure mode)."
            )

    audio = next((s for s in streams if s.get("codec_type") == "audio"), None)
    fmt_dur = data.get("format", {}).get("duration")
    dur = video.get("duration") or fmt_dur
    return {
        "num": r_rate.numerator,
        "den": r_rate.denominator,
        "width": int(video.get("width")),
        "height": int(video.get("height")),
        "duration": Fraction(str(dur)) if dur is not None else None,
        "has_audio": audio is not None,
        "audio_rate": int(audio["sample_rate"]) if audio and audio.get("sample_rate") else None,
        "audio_channels": int(audio["channels"]) if audio and audio.get("channels") else None,
    }


# --- document construction (pure, unit-tested) ----------------------------

def _fps_label(num, den):
    return str(num) if den == 1 else f"{round(num / den, 2)}"


def _audio_rate_label(rate):
    if rate is None:
        return "48k"
    if rate % 1000 == 0:
        return f"{rate // 1000}k"
    return f"{rate / 1000:g}k"


def build_document(edl, sources, project_dir):
    """Build the FCPXML ElementTree root from an EDL and probed source info.

    sources maps each source path (as written in the EDL) to a probe dict
    (see probe_source). project_dir is the base the source paths resolve
    against. The primary source (edl['source']) sets the timeline frame rate;
    every source must match it (mixed rates raise SystemExit(1))."""
    primary = edl["source"]
    if primary not in sources:
        sys.exit(f"primary source {primary} missing from probe data")
    num = sources[primary]["num"]
    den = sources[primary]["den"]
    fps = Fraction(num, den)

    for src, info in sources.items():
        if (info["num"], info["den"]) != (num, den):
            sys.exit(
                f"{src} is {info['num']}/{info['den']} fps but the timeline is "
                f"{num}/{den} fps. Mixed-frame-rate timelines are out of scope; "
                "conform all sources to one frame rate first."
            )

    # Stable asset ids in first-seen order across the segment list.
    order = []
    for seg in edl["segments"]:
        if seg["source"] not in order:
            order.append(seg["source"])
    for src in sources:
        if src not in order:
            order.append(src)
    asset_ids = {src: f"a{i + 1}" for i, src in enumerate(order)}

    # Snap every segment to the frame grid; carry integer frame counts only.
    clips = []
    offset_frames = 0
    for seg in edl["segments"]:
        info = sources[seg["source"]]
        start_f = snap_start(seg["start"], fps)
        end_f = snap_end(seg["end"], fps)
        if start_f < 0:
            start_f = 0
        if end_f <= start_f:
            end_f = start_f + 1
        # Clamp the in-point to the media if we know its length.
        if info["duration"] is not None:
            total = math.floor(info["duration"] * fps)
            if total >= 1:
                start_f = min(start_f, total - 1)
                end_f = min(end_f, total)
                if end_f <= start_f:
                    start_f = end_f - 1
        dur_f = end_f - start_f
        clips.append({
            "ref": asset_ids[seg["source"]],
            "name": seg.get("beat") or seg.get("quote", "")[:40] or "clip",
            "offset_f": offset_frames,
            "start_f": start_f,
            "dur_f": dur_f,
        })
        offset_frames += dur_f
    total_frames = offset_frames

    # --- resources ---
    fcpxml = ET.Element("fcpxml", {"version": "1.9"})
    resources = ET.SubElement(fcpxml, "resources")
    fmt_id = "r1"
    ET.SubElement(resources, "format", {
        "id": fmt_id,
        "name": f"FFVideoFormat{sources[primary]['height']}p{_fps_label(num, den)}",
        "frameDuration": fmt_frame_duration(num, den),
        "width": str(sources[primary]["width"]),
        "height": str(sources[primary]["height"]),
    })

    for src in order:
        info = sources[src]
        abs_path = (project_dir / src).resolve()
        media_frames = (
            math.floor(info["duration"] * fps) if info["duration"] is not None
            else total_frames
        )
        # An asset must cover every in-point it is cut against.
        max_end = max((c["start_f"] + 0 for c in clips), default=0)
        for c in clips:
            if c["ref"] == asset_ids[src]:
                max_end = max(max_end, c["start_f"] + c["dur_f"])
        media_frames = max(media_frames, max_end, 1)
        attrs = {
            "id": asset_ids[src],
            "name": Path(src).stem,
            "start": "0s",
            "duration": fmt_time(media_frames, num, den),
            "hasVideo": "1",
            "format": fmt_id,
            "videoSources": "1",
        }
        if info["has_audio"]:
            attrs["hasAudio"] = "1"
            attrs["audioSources"] = "1"
            attrs["audioChannels"] = str(info["audio_channels"] or 2)
            attrs["audioRate"] = str(info["audio_rate"] or 48000)
        asset = ET.SubElement(resources, "asset", attrs)
        ET.SubElement(asset, "media-rep", {
            "kind": "original-media",
            "src": "file://" + quote(str(abs_path)),
        })

    # --- library / event / project / sequence / spine ---
    slug = project_dir.name
    library = ET.SubElement(fcpxml, "library")
    event = ET.SubElement(library, "event", {"name": slug})
    project = ET.SubElement(event, "project", {"name": f"{slug} rough cut"})
    seq_attrs = {
        "format": fmt_id,
        "duration": fmt_time(total_frames, num, den),
        "tcStart": "0s",
        "tcFormat": "NDF",
        "audioLayout": "stereo",
        "audioRate": _audio_rate_label(sources[primary].get("audio_rate")),
    }
    sequence = ET.SubElement(project, "sequence", seq_attrs)
    spine = ET.SubElement(sequence, "spine")
    for c in clips:
        ET.SubElement(spine, "asset-clip", {
            "ref": c["ref"],
            "offset": fmt_time(c["offset_f"], num, den),
            "name": c["name"],
            "start": fmt_time(c["start_f"], num, den),
            "duration": fmt_time(c["dur_f"], num, den),
            "format": fmt_id,
            "tcFormat": "NDF",
        })

    return fcpxml, {"num": num, "den": den, "total_frames": total_frames}


def self_check(root, num, den):
    """Re-parse the emitted spine: whole-frame durations and gapless offsets."""
    fps = Fraction(num, den)
    spine = root.find("./library/event/project/sequence/spine")
    if spine is None:
        raise ValueError("no spine in output")
    running = Fraction(0)
    for clip in spine.findall("asset-clip"):
        offset = parse_time(clip.get("offset"))
        dur = parse_time(clip.get("duration"))
        start = parse_time(clip.get("start"))
        for label, value in (("duration", dur), ("start", start)):
            if (value * fps).denominator != 1:
                raise ValueError(f"{label} {value}s is not a whole number of frames")
        if offset != running:
            raise ValueError(f"gap at offset {offset}s (expected {running}s)")
        running += dur
    return running


def serialize(root):
    ET.indent(root, space="    ")
    body = ET.tostring(root, encoding="unicode")
    return '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE fcpxml>\n' + body + "\n"


# --- cli ------------------------------------------------------------------

def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, add_help=True)
    parser.add_argument("edl", help="path to cut/edl.json")
    parser.add_argument("-o", "--output", required=True, help="output timeline path")
    parser.add_argument("--format", default="fcpxml",
                        choices=["fcpxml", "xmeml", "edl"])
    parser.add_argument("--project-dir", default=None,
                        help="base for source paths (default: edl parent's parent)")
    args = parser.parse_args(argv)

    if args.format != "fcpxml":
        print(
            f"--format {args.format} is a planned lane (see TODO); "
            "use cutplan.md + edl.json meanwhile.",
            file=sys.stderr,
        )
        return 3

    edl_path = Path(args.edl).resolve()
    if not edl_path.is_file():
        print(f"edl not found: {edl_path}", file=sys.stderr)
        return 2
    project_dir = (
        Path(args.project_dir).resolve() if args.project_dir
        else edl_path.parent.parent
    )

    # parse_float=Fraction keeps EDL times exact from the source decimal tokens.
    edl = json.loads(edl_path.read_text(), parse_float=Fraction)

    distinct = []
    for seg in edl["segments"]:
        if seg["source"] not in distinct:
            distinct.append(seg["source"])
    if edl["source"] not in distinct:
        distinct.insert(0, edl["source"])

    sources = {}
    for src in distinct:
        src_path = (project_dir / src).resolve()
        if not src_path.is_file():
            print(f"source not found: {src_path}", file=sys.stderr)
            return 1
        sources[src] = probe_source(src_path)

    root, meta = build_document(edl, sources, project_dir)
    text = serialize(root)
    out_path = Path(args.output)
    out_path.write_text(text)

    # Round-trip validation: re-parse the file we just wrote (the parser skips
    # the XML declaration and the entity-free DOCTYPE) and check the spine.
    reparsed = ET.parse(out_path).getroot()
    checked = self_check(reparsed, meta["num"], meta["den"])
    fps = Fraction(meta["num"], meta["den"])
    total_seconds = float(meta["total_frames"] / fps)

    summary = {
        "format": "fcpxml",
        "fcpxml_version": "1.9",
        "segments": len(edl["segments"]),
        "sources": len(sources),
        "fps": f"{meta['num']}/{meta['den']}",
        "total_frames": meta["total_frames"],
        "total_duration_seconds": round(total_seconds, 3),
        "checked_duration_seconds": round(float(checked), 3),
        "output": str(Path(args.output).resolve()),
    }
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
