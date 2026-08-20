#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = ["parakeet-mlx"]
# ///
"""Word-level transcription for the cut stage (build-order item 1).

Usage:
    uv run {skill-root}/scripts/transcribe.py {projects-path}/<slug>/raw/<take> \
        -o {projects-path}/<slug>/transcript/words.json \
        [--provider parakeet-mlx] [--model mlx-community/parakeet-tdt-0.6b-v3]

Contract:
    input     a media file (audio or video); the transcriber extracts audio via
              ffmpeg, so video containers (mp4, mov) are read directly.
    output    transcript JSON with word-level timestamps, confidence, and gap
              data, written to -o in a provider-neutral shape:
                  {
                    "provider": "parakeet-mlx",
                    "model":    "mlx-community/parakeet-tdt-0.6b-v3",
                    "media":    "<the media path as given>",
                    "duration": 172.67,
                    "text":     "<full transcript>",
                    "words": [
                      {"word": "Alright,", "start": 1.28, "end": 1.76,
                       "confidence": 0.9079, "i": 0,
                       "gap_before": 1.28, "gap_after": 0.0},
                      ...
                    ]
                  }
              times round to 2 decimals, confidence to 4. "i" is the word index.
              gap_before = start - previous word's end (first word: its start).
              gap_after  = next word's start - end (last word: duration - end).
              gaps never go negative (clamped to 0.0).
    provider  from the studio config [transcription] table; this script is the
              switch. parakeet-mlx is the reference and the default: free, local
              on Apple Silicon, native word timestamps, and empirically it keeps
              verbatim fillers ("uh", "um", "Hmm") that cutting depends on.
              Metered API providers (for example elevenlabs-scribe or
              deepgram-nova3) are possible future OPT-IN lanes behind
              --provider and the [transcription] switch; none is implemented
              here, nothing defaults to them, and no API key name ships in
              any default.

Why parakeet-mlx over generic Whisper: cutting needs verbatim fillers ("um",
"uh", restarts) plus word gap data; Whisper normalizes exactly those away.
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path

DEFAULT_PROVIDER = "parakeet-mlx"
DEFAULT_MODEL = "mlx-community/parakeet-tdt-0.6b-v3"


def _get(t, key):
    return t[key] if isinstance(t, dict) else getattr(t, key)


def group_subwords(tokens):
    """Collapse parakeet subword tokens into whole words.

    parakeet emits subword tokens (e.g. " Al", "rig", "ht", ","), where a
    leading space in the RAW token text marks the start of a new word and
    tokens without one (continuations, punctuation) attach to the current word.
    Each word's text is the concatenation of its tokens (stripped); its span is
    the first token's start to the last token's end; its confidence is the
    minimum over its tokens (the weakest subword governs). Returns a list of
    (text, start, end, confidence) tuples.
    """
    words = []
    for t in tokens:
        raw = _get(t, "text")
        start = float(_get(t, "start"))
        end = float(_get(t, "end"))
        conf = float(_get(t, "confidence"))
        starts_word = not words or raw[:1] == " "
        if starts_word:
            words.append([raw, start, end, conf])
        else:
            w = words[-1]
            w[0] += raw
            w[2] = end
            w[3] = min(w[3], conf)
    return [(text.strip(), start, end, conf) for text, start, end, conf in words]


def normalize_words(tokens, duration):
    """Map provider tokens to the pinned word schema (pure; no model needed).

    tokens is a list of dicts (or objects) carrying subword text, start, end,
    and confidence. Subwords are grouped into words (see group_subwords). Times
    round to 2 decimals, confidence to 4. gap_before/gap_after are computed on
    the rounded times and clamped to 0.0. Returns the list of word dicts.
    """
    rounded = [
        (text, round(start, 2), round(end, 2), round(conf, 4))
        for text, start, end, conf in group_subwords(tokens)
    ]
    dur = round(float(duration), 2)
    n = len(rounded)
    words = []
    for i, (text, start, end, conf) in enumerate(rounded):
        if i == 0:
            gap_before = start
        else:
            gap_before = round(start - rounded[i - 1][2], 2)
        if i == n - 1:
            gap_after = round(dur - end, 2)
        else:
            gap_after = round(rounded[i + 1][1] - end, 2)
        words.append({
            "word": text,
            "start": start,
            "end": end,
            "confidence": conf,
            "i": i,
            "gap_before": max(0.0, gap_before),
            "gap_after": max(0.0, gap_after),
        })
    return words


def probe_duration(media):
    """Media duration in seconds via ffprobe. Raises on failure."""
    out = subprocess.run(
        [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=nokey=1:noprint_wrappers=1",
            str(media),
        ],
        capture_output=True, text=True, check=True,
    )
    return float(out.stdout.strip())


def transcribe_parakeet(media, model_id):
    """Run parakeet-mlx and return (full_text, tokens, duration).

    tokens are AlignedToken objects (text/start/end/confidence). Import is
    local so the pure helpers stay importable without the model dependency.
    """
    import parakeet_mlx

    model = parakeet_mlx.from_pretrained(model_id)
    result = model.transcribe(str(media))
    duration = probe_duration(media)
    return result.text, result.tokens, duration


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("media", help="path to the media file (audio or video)")
    parser.add_argument("-o", "--output", required=True,
                        help="path to write the words.json transcript")
    parser.add_argument("--provider", default=DEFAULT_PROVIDER,
                        help=f"transcription provider (default: {DEFAULT_PROVIDER})")
    parser.add_argument("--model", default=DEFAULT_MODEL,
                        help=f"model id (default: {DEFAULT_MODEL})")
    args = parser.parse_args(argv)

    if args.provider != DEFAULT_PROVIDER:
        print(
            f"provider {args.provider} not implemented; parakeet-mlx is the "
            "default. See the [transcription] switch in the studio config.",
            file=sys.stderr,
        )
        return 3

    media = Path(args.media)
    if not media.is_file():
        print(f"error: media not found: {media}", file=sys.stderr)
        return 2

    output = Path(args.output)

    try:
        text, tokens, duration = transcribe_parakeet(media, args.model)
    except Exception as exc:  # transcription failure
        print(f"error: transcription failed: {exc}", file=sys.stderr)
        return 1

    words = normalize_words(tokens, duration)
    payload = {
        "provider": DEFAULT_PROVIDER,
        "model": args.model,
        "media": args.media,
        "duration": round(float(duration), 2),
        "text": text.strip(),
        "words": words,
    }

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2, ensure_ascii=False))

    print(json.dumps({
        "provider": DEFAULT_PROVIDER,
        "model": args.model,
        "media": args.media,
        "duration": payload["duration"],
        "words": len(words),
        "output": str(output),
    }))
    return 0


if __name__ == "__main__":
    code = main()
    if code:
        sys.exit(code)
