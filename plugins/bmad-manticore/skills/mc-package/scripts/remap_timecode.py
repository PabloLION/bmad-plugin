#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Dual-timecode remap between original source time and the clean edited
timeline, driven by cut/edl.json.

Duplicated from mc-cut's remap utility per the module script-duplication
convention (every script lives in the skill that runs it); the two timecode
helpers are inlined here because this skill carries no composite core.

Usage:
    uv run {skill-root}/scripts/remap_timecode.py <edl.json> \
        --direction orig-to-clean --time 42:20 [--source raw/a.mp4]
    uv run {skill-root}/scripts/remap_timecode.py <edl.json> \
        --direction orig-to-clean --chapters chapters.md -o chapters.clean.md \
        [--gap snap|drop]
    uv run {skill-root}/scripts/remap_timecode.py <edl.json> \
        --direction clean-to-orig --events events.json -o events.orig.json

Purpose:
    cut/edl.json defines the mapping between each source's original timecode
    and the clean edited timeline. mc-package runs this copy in
    clean-to-orig direction over its edited-timecode chapter list to fill
    the original-source column of the dual-timeline chapters deliverable;
    orig-to-clean remaps chapter lists and event logs written against the
    raw recording onto the edited timeline.

Mapping:
    orig-to-clean  the time is read against --source (default: the EDL's only
                   source; required when segments use several). A time inside
                   a kept segment maps to segment offset + (t - segment
                   start), first hit in timeline order. A time inside cut
                   material follows --gap: snap (default) maps to the clean
                   time where the next kept segment of that source begins (or
                   the source's last kept clean time when nothing follows)
                   and marks the result snapped; drop omits the line
                   (chapters) or nulls the value (events).
    clean-to-orig  the time is read against the concatenated edited timeline;
                   the result carries the source and its original time. A
                   time past the end of the timeline is an error.

Files:
    --chapters  a text/markdown file; the first timecode token on each line
                ([h:]m:ss or m:ss, optional fraction) is remapped in place;
                lines without a timecode pass through unchanged; dropped
                lines are omitted.
    --events    a JSON file holding a list of objects (or {"events": [...]}).
                On each object, "time", "start", "end", and "ts" values are
                remapped: numbers stay seconds, timecode strings stay
                timecode. Snapped or dropped values are noted per object
                under "_remap"; clean-to-orig adds "source".
    Exactly one of --time, --chapters, --events. -o is required for the file
    modes.

Output: --time prints a JSON result to stdout; the file modes write -o and
print a JSON summary. Exit codes: 0 ok, 1 failure, 2 usage.

STATUS: implemented (covered by scripts/tests/test-remap_timecode.py).
"""

import argparse
import json
import re
import sys
from pathlib import Path

TC_RE = re.compile(r"(?<![\d:.])(?:\d+:)?\d{1,4}:\d{2}(?:\.\d+)?(?![\d:])")


def parse_timecode(text):
    """'90', '90.5', '12.5s', '1:30', '01:02:03.25' -> seconds (float)."""
    s = str(text).strip()
    if s.endswith("s") and ":" not in s:
        s = s.rstrip("s")
    if not s:
        raise ValueError("empty timecode")
    parts = s.split(":")
    if len(parts) > 3:
        raise ValueError(f"unparseable timecode: {text!r}")
    total = 0.0
    for p in parts:
        total = total * 60 + float(p.strip())
    if total < 0:
        raise ValueError(f"negative timecode: {text!r}")
    return total


def format_timecode(seconds, precision=0):
    """Seconds -> 'm:ss' or 'h:mm:ss', with optional fractional digits."""
    seconds = max(0.0, seconds)
    total = round(seconds, precision) if precision else int(round(seconds))
    h = int(total // 3600)
    m = int((total % 3600) // 60)
    s = total - h * 3600 - m * 60
    if precision:
        sec_str = f"{s:0{3 + precision}.{precision}f}"
    else:
        sec_str = f"{int(s):02d}"
    if h:
        return f"{h}:{m:02d}:{sec_str}"
    return f"{m}:{sec_str}"


def build_map(edl):
    """EDL segments as [{source, start, end, offset}] in timeline order."""
    out = []
    offset = 0.0
    for seg in edl["segments"]:
        out.append({"source": seg["source"], "start": seg["start"],
                    "end": seg["end"], "offset": offset})
        offset += seg["end"] - seg["start"]
    return out


def orig_to_clean(mapping, t, source=None, gap="snap"):
    """Map an original-source time to clean time.

    Returns (clean_seconds_or_None, note) with note in ("", "snapped",
    "dropped"). Raises ValueError when the source has no segments."""
    segs = [s for s in mapping if source is None or s["source"] == source]
    if not segs:
        raise ValueError(f"no EDL segments for source {source!r}")
    for s in segs:
        if s["start"] <= t <= s["end"]:
            return s["offset"] + (t - s["start"]), ""
    if gap == "drop":
        return None, "dropped"
    after = [s for s in segs if s["start"] > t]
    if after:
        s = min(after, key=lambda x: x["start"])
        return s["offset"], "snapped"
    s = max(segs, key=lambda x: x["offset"] + (x["end"] - x["start"]))
    return s["offset"] + (s["end"] - s["start"]), "snapped"


def clean_to_orig(mapping, t):
    """Map a clean-timeline time to (source, original_seconds).

    Raises ValueError when t is outside the edited timeline."""
    if not mapping:
        raise ValueError("empty EDL")
    total = mapping[-1]["offset"] + (mapping[-1]["end"] - mapping[-1]["start"])
    if t < 0 or t > total + 1e-6:
        raise ValueError(f"clean time {t:.3f}s is outside the edited "
                         f"timeline (0 to {total:.3f}s)")
    for s in mapping:
        dur = s["end"] - s["start"]
        if s["offset"] <= t <= s["offset"] + dur:
            return s["source"], s["start"] + (t - s["offset"])
    raise ValueError(f"clean time {t:.3f}s not covered by any segment")


def remap_value(mapping, seconds, direction, source, gap):
    """One time value -> (mapped_seconds_or_None, note, orig_source_or_None)."""
    if direction == "orig-to-clean":
        mapped, note = orig_to_clean(mapping, seconds, source, gap)
        return mapped, note, None
    src, mapped = clean_to_orig(mapping, seconds)
    return mapped, "", src


def remap_chapters(text, mapping, direction, source, gap):
    """Remap the first timecode token on each line. Returns (lines, stats)."""
    out = []
    stats = {"remapped": 0, "snapped": 0, "dropped": 0, "passed": 0}
    for line in text.splitlines():
        m = TC_RE.search(line)
        if not m:
            out.append(line)
            stats["passed"] += 1
            continue
        seconds = parse_timecode(m.group(0))
        mapped, note, _src = remap_value(mapping, seconds, direction,
                                         source, gap)
        if mapped is None:
            stats["dropped"] += 1
            continue
        precision = 3 if "." in m.group(0) else 0
        tc = format_timecode(mapped, precision=precision)
        out.append(line[:m.start()] + tc + line[m.end():])
        stats["remapped"] += 1
        if note == "snapped":
            stats["snapped"] += 1
    return out, stats


EVENT_KEYS = ("time", "start", "end", "ts")


def remap_events(data, mapping, direction, source, gap):
    """Remap EVENT_KEYS on each object of an events list, in place-ish.

    Returns (new_data, stats). Notes land under each object's "_remap"."""
    events = data["events"] if isinstance(data, dict) and "events" in data \
        else data
    if not isinstance(events, list):
        raise ValueError("events file must hold a list, or {'events': [...]}")
    stats = {"remapped": 0, "snapped": 0, "dropped": 0, "passed": 0}
    for obj in events:
        if not isinstance(obj, dict):
            stats["passed"] += 1
            continue
        notes = {}
        for key in EVENT_KEYS:
            if key not in obj or obj[key] is None:
                continue
            raw = obj[key]
            seconds = parse_timecode(raw) if isinstance(raw, str) \
                else float(raw)
            mapped, note, src = remap_value(mapping, seconds, direction,
                                            source, gap)
            if mapped is None:
                obj[key] = None
                notes[key] = "dropped"
                stats["dropped"] += 1
                continue
            if isinstance(raw, str):
                precision = 3 if "." in raw else 0
                obj[key] = format_timecode(mapped, precision=precision)
            else:
                obj[key] = round(mapped, 3)
            if src is not None:
                obj["source"] = src
            if note:
                notes[key] = note
                stats["snapped"] += 1
            stats["remapped"] += 1
        if notes:
            obj["_remap"] = notes
    return data, stats


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("edl", help="path to cut/edl.json")
    parser.add_argument("--direction", required=True,
                        choices=("orig-to-clean", "clean-to-orig"))
    parser.add_argument("--time", default=None,
                        help="a single timecode or seconds value to remap")
    parser.add_argument("--chapters", default=None,
                        help="chapters/text file whose line timecodes remap")
    parser.add_argument("--events", default=None,
                        help="JSON events file whose time keys remap")
    parser.add_argument("-o", "--output", default=None,
                        help="output path (required with --chapters/--events)")
    parser.add_argument("--source", default=None,
                        help="source path for orig-to-clean on multi-source EDLs")
    parser.add_argument("--gap", default="snap", choices=("snap", "drop"),
                        help="policy for orig times inside cut material")
    args = parser.parse_args(argv)

    modes = [m for m in (args.time, args.chapters, args.events)
             if m is not None]
    if len(modes) != 1:
        print("exactly one of --time, --chapters, --events is required",
              file=sys.stderr)
        return 2
    if (args.chapters or args.events) and not args.output:
        print("-o is required with --chapters/--events", file=sys.stderr)
        return 2

    try:
        edl = json.loads(Path(args.edl).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as e:
        print(f"remap_timecode: cannot read {args.edl}: {e}", file=sys.stderr)
        return 1
    if not edl.get("segments"):
        print("edl has no segments", file=sys.stderr)
        return 1
    mapping = build_map(edl)

    source = args.source
    if args.direction == "orig-to-clean" and source is None:
        sources = sorted({s["source"] for s in mapping})
        if len(sources) > 1:
            print(f"EDL uses several sources ({', '.join(sources)}); pass "
                  "--source for orig-to-clean", file=sys.stderr)
            return 2
        source = sources[0]

    try:
        if args.time is not None:
            seconds = parse_timecode(args.time)
            mapped, note, src = remap_value(mapping, seconds, args.direction,
                                            source, args.gap)
            result = {
                "direction": args.direction,
                "input": args.time,
                "input_seconds": round(seconds, 3),
                "mapped_seconds": None if mapped is None else round(mapped, 3),
                "mapped_timecode": None if mapped is None
                else format_timecode(mapped, precision=3),
            }
            if note:
                result["note"] = note
            if src is not None:
                result["source"] = src
            print(json.dumps(result, indent=2))
            return 0

        if args.chapters is not None:
            text = Path(args.chapters).read_text(encoding="utf-8")
            lines, stats = remap_chapters(text, mapping, args.direction,
                                          source, args.gap)
            Path(args.output).write_text("\n".join(lines) + "\n",
                                         encoding="utf-8")
        else:
            data = json.loads(Path(args.events).read_text(encoding="utf-8"))
            data, stats = remap_events(data, mapping, args.direction,
                                       source, args.gap)
            Path(args.output).write_text(
                json.dumps(data, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8")
    except (OSError, ValueError, json.JSONDecodeError) as e:
        print(f"remap_timecode: {e}", file=sys.stderr)
        return 1

    print(json.dumps({"ok": True, "output": args.output, **stats}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
