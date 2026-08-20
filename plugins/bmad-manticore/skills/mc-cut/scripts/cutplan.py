#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Derive a mechanical cut candidate list from a word-level transcript (phase 3).

Usage:
    uv run {skill-root}/scripts/cutplan.py {projects-path}/<slug>/transcript/words.json \
        -o {projects-path}/<slug>/cut/candidates.json

Contract:
    input   Scribe word-level transcript JSON (from transcribe.py) with shape
            {"media": str, "duration": float, "text": str,
             "words": [{"word", "start", "end", "confidence", "i",
                        "gap_before", "gap_after"}, ...]}
    output  candidates.json: every mechanical cut candidate the detectors below
            find, each with timestamps, the surrounding words, a human reason,
            and a severity. Shape:
            {"media", "duration",
             "thresholds": {"min_silence", "retake_window", "retake_run"},
             "counts": {"silence", "filler", "stutter", "retake", "marker"},
             "candidates": [ {"type", ["cls"], "start", "end", "dur",
                              "text", "reason", "severity"}, ... ]}
            Candidates are sorted by start time; times carry 2 decimals; "cls"
            (hard|soft) appears on filler candidates only.
    note    this script finds CANDIDATES only; taste calls (keep or cut) happen
            in mc-cut's plan, which the creator approves at gate 2. Cutting rules
            live in this skill's SKILL.md (the "Cutting rules" section).

Detectors (all pure stdlib):
    silence   any inter-word gap >= min-silence (default 0.7s), plus leading
              silence (0 -> first word) and trailing silence (last word ->
              duration). severity med if < 2.0s, high if >= 2.0s.
    filler    hard fillers (um uh hmm er ah mm; severity high) matched word-
              boundary, case-insensitive, punctuation-stripped; consecutive hard
              fillers merge into one candidate spanning the run. soft fillers
              (sentence-initial connectives: so right okay well actually
              basically anyway "you know" "i mean"; severity low) flagged only at
              a sentence start (prev word ends ./!/? or gap_before >= 0.5) so
              mid-sentence natural use is not flagged.
    stutter   immediate normalized word repetition ("weird weird"); candidate
              covers the first occurrence. severity med.
    retake    (a) spoken cues (case-insensitive): "take N", "try that again",
              "whoops", "let me start over", "start over", "scratch that";
              (b) verbatim repeats: a run of >= retake-run (default 3) consecutive
              normalized words that reappears within the next retake-window
              (default 16) words -- the EARLIER occurrence is the candidate.
              severity high.
    marker    interview-mode cue: any marker phrase (default "question from
              the interviewer") in the normalized word stream; marks a segment
              boundary (the creator read an interviewer question aloud on
              camera). severity med. --marker-cues overrides the list
              (comma-separated, so several phrases can be active at once);
              projects recorded against the older "question from claude"
              convention pass --marker-cues "question from claude".

CLI:
    positional  words.json
    -o/--output candidates.json (required)
    --min-silence FLOAT     (default 0.7)
    --retake-window INT     (default 16)
    --retake-run INT        (default 3)
    --marker-cues STR       comma-separated override (default "question from
                            the interviewer"; the legacy phrase "question from
                            claude" is a supported alternative)
    exit 0 ok, 1 failure, 2 usage error. A JSON summary (counts + output path)
    is printed to stdout.
"""

import argparse
import json
import string
import sys

HARD_FILLERS = {"um", "uh", "hmm", "er", "ah", "mm"}
SOFT_SINGLE = {"so", "right", "okay", "well", "actually", "basically", "anyway"}
SOFT_PHRASES = [["you", "know"], ["i", "mean"]]
NUMBER_WORDS = {"one", "two", "three", "four", "five", "six", "seven", "eight",
                "nine", "ten"}
# spoken retake cues, checked longest-first at each position ("take N" handled
# separately because its second token is a number, not a literal)
CUE_PHRASES = [
    ["let", "me", "start", "over"],
    ["try", "that", "again"],
    ["scratch", "that"],
    ["start", "over"],
    ["whoops"],
]

_STRIP = string.punctuation


def norm(word):
    """Lowercase and strip surrounding punctuation; keep internal apostrophes."""
    return word.strip(_STRIP).lower()


def fmt(x):
    """Round to 2 decimals and render without trailing zeros, for reasons."""
    return str(round(x, 2))


def r2(x):
    return round(x, 2)


def _cand(ctype, start, end, text, reason, severity, cls=None):
    c = {"type": ctype}
    if cls is not None:
        c["cls"] = cls
    c["start"] = r2(start)
    c["end"] = r2(end)
    c["dur"] = r2(end - start)
    c["text"] = text
    c["reason"] = reason
    c["severity"] = severity
    return c


def detect_silence(words, duration, min_silence):
    out = []
    if not words:
        return out
    lead = words[0]["start"]
    if lead >= min_silence:
        dur = r2(lead)
        sev = "high" if dur >= 2.0 else "med"
        out.append(_cand("silence", 0.0, lead, "",
                          f'{fmt(dur)}s gap before "{words[0]["word"]}"', sev))
    for prev, cur in zip(words, words[1:]):
        gap = cur["start"] - prev["end"]
        if gap >= min_silence:
            dur = r2(gap)
            sev = "high" if dur >= 2.0 else "med"
            out.append(_cand("silence", prev["end"], cur["start"], "",
                              f'{fmt(dur)}s gap before "{cur["word"]}"', sev))
    tail = duration - words[-1]["end"]
    if tail >= min_silence:
        dur = r2(tail)
        sev = "high" if dur >= 2.0 else "med"
        out.append(_cand("silence", words[-1]["end"], duration, "",
                          f'{fmt(dur)}s gap after "{words[-1]["word"]}"', sev))
    return out


def _is_sentence_start(words, i):
    if i == 0:
        return True
    prev = words[i - 1]["word"]
    if any(prev.endswith(p) for p in ".!?"):
        return True
    gap = words[i]["start"] - words[i - 1]["end"]
    return gap >= 0.5


def detect_fillers(words, nwords):
    out = []
    n = len(words)
    i = 0
    while i < n:
        if nwords[i] in HARD_FILLERS:
            j = i
            while j + 1 < n and nwords[j + 1] in HARD_FILLERS:
                j += 1
            text = " ".join(w["word"] for w in words[i:j + 1])
            if j > i:
                reason = f'hard filler run "{text}"'
            else:
                reason = f'hard filler "{text}"'
            out.append(_cand("filler", words[i]["start"], words[j]["end"],
                             text, reason, "high", cls="hard"))
            i = j + 1
            continue
        # soft fillers: only at a sentence start
        if _is_sentence_start(words, i):
            matched = None
            for phrase in SOFT_PHRASES:
                L = len(phrase)
                if nwords[i:i + L] == phrase:
                    matched = (L, " ".join(phrase))
                    break
            if matched is None and nwords[i] in SOFT_SINGLE:
                matched = (1, nwords[i])
            if matched is not None:
                L, canon = matched
                text = " ".join(w["word"] for w in words[i:i + L])
                out.append(_cand("filler", words[i]["start"],
                                 words[i + L - 1]["end"], text,
                                 f'soft filler "{text}"', "low", cls="soft"))
                i += L
                continue
        i += 1
    return out


def detect_stutter(words, nwords):
    out = []
    for i in range(len(words) - 1):
        a, b = nwords[i], nwords[i + 1]
        if a and a == b:
            out.append(_cand("stutter", words[i]["start"], words[i]["end"],
                             words[i]["word"],
                             f'stutter "{words[i]["word"]} {words[i + 1]["word"]}"',
                             "med"))
    return out


def _match_cue(nwords, i):
    """Return (length, canonical cue) if a spoken retake cue starts at i."""
    if nwords[i] == "take" and i + 1 < len(nwords):
        nxt = nwords[i + 1]
        if nxt in NUMBER_WORDS or nxt.isdigit():
            return 2, f"take {nxt}"
    for phrase in CUE_PHRASES:
        L = len(phrase)
        if nwords[i:i + L] == phrase:
            return L, " ".join(phrase)
    return 0, None


def _find_verbatim(nwords, run_min, window):
    """Runs of >= run_min normalized words that recur (non-overlapping) within
    `window` words. Yields (start_i, end_i) of the EARLIER occurrence."""
    n = len(nwords)
    out = []
    i = 0
    while i < n:
        best_m = 0
        jmax = min(n - 1, i + window)
        for j in range(i + 1, jmax + 1):
            m = 0
            while (i + m < j and j + m < n and nwords[i + m]
                   and nwords[i + m] == nwords[j + m]):
                m += 1
            if m >= run_min and m > best_m:
                best_m = m
        if best_m >= run_min:
            out.append((i, i + best_m - 1))
            i += best_m
        else:
            i += 1
    return out


def detect_retakes(words, nwords, run_min, window):
    out = []
    n = len(words)
    # (a) spoken cues
    i = 0
    while i < n:
        L, canon = _match_cue(nwords, i)
        if L:
            text = " ".join(w["word"] for w in words[i:i + L])
            out.append(_cand("retake", words[i]["start"], words[i + L - 1]["end"],
                             text, f'retake cue "{canon}"', "high"))
            i += L
        else:
            i += 1
    # (b) verbatim repeats
    for a, b in _find_verbatim(nwords, run_min, window):
        text = " ".join(w["word"] for w in words[a:b + 1])
        out.append(_cand("retake", words[a]["start"], words[b]["end"], text,
                         f'repeated phrase "{text}"', "high"))
    return out


def detect_markers(words, nwords, cues):
    out = []
    n = len(words)
    for cue in cues:
        toks = cue.split()
        L = len(toks)
        if L == 0:
            continue
        i = 0
        while i <= n - L:
            if nwords[i:i + L] == toks:
                text = " ".join(w["word"] for w in words[i:i + L])
                out.append(_cand("marker", words[i]["start"],
                                 words[i + L - 1]["end"], text,
                                 f'interview marker "{cue}"', "med"))
                i += L
            else:
                i += 1
    return out


def build(data, min_silence, retake_window, retake_run, marker_cues):
    words = data["words"]
    duration = data["duration"]
    nwords = [norm(w["word"]) for w in words]

    cands = []
    cands += detect_silence(words, duration, min_silence)
    cands += detect_fillers(words, nwords)
    cands += detect_stutter(words, nwords)
    cands += detect_retakes(words, nwords, retake_run, retake_window)
    cands += detect_markers(words, nwords, marker_cues)

    cands.sort(key=lambda c: (c["start"], c["end"], c["type"]))

    counts = {t: 0 for t in ("silence", "filler", "stutter", "retake", "marker")}
    for c in cands:
        counts[c["type"]] += 1

    return {
        "media": data.get("media", ""),
        "duration": duration,
        "thresholds": {
            "min_silence": min_silence,
            "retake_window": retake_window,
            "retake_run": retake_run,
        },
        "counts": counts,
        "candidates": cands,
    }


def main(argv=None):
    p = argparse.ArgumentParser(description="Find mechanical cut candidates in a "
                                            "word-level transcript.")
    p.add_argument("words", help="path to words.json (from transcribe.py)")
    p.add_argument("-o", "--output", required=True, help="path to candidates.json")
    p.add_argument("--min-silence", type=float, default=0.7)
    p.add_argument("--retake-window", type=int, default=16)
    p.add_argument("--retake-run", type=int, default=3)
    p.add_argument("--marker-cues", default="question from the interviewer",
                   help='comma-separated marker phrases (legacy alternative: '
                        '"question from claude")')
    args = p.parse_args(argv)

    try:
        with open(args.words, encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        print(f"cutplan: cannot read {args.words}: {e}", file=sys.stderr)
        return 1
    if "words" not in data or "duration" not in data:
        print("cutplan: input missing required 'words'/'duration' keys",
              file=sys.stderr)
        return 1

    marker_cues = [norm_phrase for c in args.marker_cues.split(",")
                   if (norm_phrase := " ".join(norm(w) for w in c.split()))]

    result = build(data, args.min_silence, args.retake_window,
                   args.retake_run, marker_cues)

    try:
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
            f.write("\n")
    except OSError as e:
        print(f"cutplan: cannot write {args.output}: {e}", file=sys.stderr)
        return 1

    print(json.dumps({"ok": True, "output": args.output,
                      "counts": result["counts"]}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
