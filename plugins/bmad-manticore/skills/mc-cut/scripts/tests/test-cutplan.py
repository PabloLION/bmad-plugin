#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Tests for cutplan.py: the cut-candidate finder must catch every planted
defect class, gate soft fillers to sentence starts, and emit the pinned schema
shape (cls on fillers only, candidates sorted by start)."""
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / "cutplan.py"


def word(w, start, end, i, gap_before=0.0, gap_after=0.0, conf=1.0):
    return {"word": w, "start": start, "end": end, "confidence": conf,
            "i": i, "gap_before": gap_before, "gap_after": gap_after}


def seq(pairs, wgap=0.0):
    """Build words from (text, dur) pairs laid end to end, honoring an optional
    leading gap per word via a 3-tuple (text, dur, gap_before)."""
    words = []
    t = 0.0
    for idx, item in enumerate(pairs):
        if len(item) == 3:
            text, dur, gap = item
        else:
            text, dur = item
            gap = 0.0
        t = round(t + gap, 2)
        words.append(word(text, round(t, 2), round(t + dur, 2), idx,
                          gap_before=gap))
        t = round(t + dur, 2)
    return words


def run(words, duration=None, extra=None, expect=0):
    if duration is None:
        duration = words[-1]["end"] if words else 0.0
    data = {"media": "m.mp4", "duration": duration, "text": "", "words": words}
    with tempfile.TemporaryDirectory() as tmp:
        src = Path(tmp) / "words.json"
        out = Path(tmp) / "candidates.json"
        src.write_text(json.dumps(data))
        r = subprocess.run([sys.executable, str(SCRIPT), str(src), "-o",
                            str(out), *(extra or [])],
                           capture_output=True, text=True)
        assert r.returncode == expect, f"rc={r.returncode} stderr={r.stderr}"
        result = json.loads(out.read_text()) if r.returncode == 0 else None
        return result, r


def by_type(result, t):
    return [c for c in result["candidates"] if c["type"] == t]


class TestSilence(unittest.TestCase):
    def test_leading_mid_trailing(self):
        words = seq([("Hello,", 0.4, 1.0), ("world.", 0.4, 1.5)])
        result, _ = run(words, duration=round(words[-1]["end"] + 0.9, 2))
        sil = by_type(result, "silence")
        starts = [c["start"] for c in sil]
        self.assertEqual(len(sil), 3)  # leading, mid, trailing
        self.assertEqual(starts[0], 0.0)  # leading from 0
        self.assertEqual(sil[-1]["end"], result["duration"])  # trailing to dur

    def test_severity_threshold(self):
        words = seq([("a", 0.3), ("b", 0.3, 1.0), ("c", 0.3, 2.5)])
        result, _ = run(words)
        sev = {c["dur"]: c["severity"] for c in by_type(result, "silence")}
        self.assertEqual(sev[1.0], "med")
        self.assertEqual(sev[2.5], "high")

    def test_below_threshold_ignored(self):
        words = seq([("a", 0.3), ("b", 0.3, 0.5)])
        result, _ = run(words, duration=round(words[-1]["end"] + 0.2, 2))
        self.assertEqual(by_type(result, "silence"), [])


class TestFiller(unittest.TestCase):
    def test_hard_filler(self):
        words = seq([("So", 0.3), ("uh", 0.3), ("yes.", 0.3)])
        result, _ = run(words)
        hard = [c for c in by_type(result, "filler") if c["cls"] == "hard"]
        self.assertEqual(len(hard), 1)
        self.assertEqual(hard[0]["text"], "uh")
        self.assertEqual(hard[0]["severity"], "high")

    def test_consecutive_hard_merge(self):
        words = seq([("Um", 0.3), ("uh", 0.3), ("hmm.", 0.3), ("go.", 0.3)])
        result, _ = run(words)
        hard = [c for c in by_type(result, "filler") if c["cls"] == "hard"]
        self.assertEqual(len(hard), 1)
        self.assertEqual(hard[0]["start"], words[0]["start"])
        self.assertEqual(hard[0]["end"], words[2]["end"])
        self.assertIn("run", hard[0]["reason"])

    def test_soft_at_sentence_start(self):
        # "So" opens the clip -> flagged; the mid-sentence "right" is not
        words = seq([("So", 0.3), ("that", 0.3), ("is", 0.3), ("right", 0.3)])
        result, _ = run(words)
        soft = [c for c in by_type(result, "filler") if c["cls"] == "soft"]
        self.assertEqual([c["text"] for c in soft], ["So"])

    def test_soft_gated_after_period(self):
        # "so" mid-sentence (no period, no gap) is NOT flagged
        words = seq([("I", 0.3), ("think", 0.3), ("so", 0.3)])
        result, _ = run(words)
        self.assertEqual([c for c in by_type(result, "filler")
                          if c["cls"] == "soft"], [])

    def test_soft_gated_by_gap(self):
        # "so" after a >=0.5 gap counts as a sentence start
        words = seq([("wait", 0.3), ("so", 0.3, 0.6), ("yes", 0.3)])
        result, _ = run(words)
        soft = [c for c in by_type(result, "filler") if c["cls"] == "soft"]
        self.assertEqual([c["text"] for c in soft], ["so"])


class TestStutter(unittest.TestCase):
    def test_immediate_repeat(self):
        words = seq([("the", 0.3), ("the", 0.3), ("cat.", 0.3)])
        result, _ = run(words)
        st = by_type(result, "stutter")
        self.assertEqual(len(st), 1)
        self.assertEqual(st[0]["start"], words[0]["start"])
        self.assertEqual(st[0]["end"], words[0]["end"])  # first occurrence

    def test_punctuation_normalized(self):
        words = seq([("you.", 0.3), ("You", 0.3), ("win.", 0.3)])
        result, _ = run(words)
        self.assertEqual(len(by_type(result, "stutter")), 1)


class TestRetake(unittest.TestCase):
    def test_spoken_cue_take_n(self):
        words = seq([("hi.", 0.3), ("Take", 0.3), ("three,", 0.3), ("go.", 0.3)])
        result, _ = run(words)
        rt = by_type(result, "retake")
        self.assertEqual(len(rt), 1)
        self.assertIn("take three", rt[0]["reason"])

    def test_spoken_cue_phrase(self):
        words = seq([("try", 0.3), ("that", 0.3), ("again.", 0.3)])
        result, _ = run(words)
        self.assertEqual(len(by_type(result, "retake")), 1)

    def test_take_not_followed_by_number(self):
        words = seq([("take", 0.3), ("your", 0.3), ("time.", 0.3)])
        result, _ = run(words)
        self.assertEqual(by_type(result, "retake"), [])

    def test_verbatim_repeat_picks_earlier(self):
        words = seq([("get", 0.3), ("rid", 0.3), ("of", 0.3), ("it.", 0.3),
                     ("get", 0.3), ("rid", 0.3), ("of", 0.3), ("that.", 0.3)])
        result, _ = run(words)
        rt = by_type(result, "retake")
        self.assertEqual(len(rt), 1)
        self.assertEqual(rt[0]["start"], words[0]["start"])  # earlier occurrence
        self.assertEqual(rt[0]["end"], words[2]["end"])

    def test_short_repeat_below_run_ignored(self):
        words = seq([("go", 0.3), ("now.", 0.3), ("go", 0.3), ("now.", 0.3)])
        result, _ = run(words)
        # only a 2-word repeat, below retake-run 3
        self.assertEqual(by_type(result, "retake"), [])


class TestMarker(unittest.TestCase):
    def test_marker_phrase_spans_words(self):
        words = seq([("hi.", 0.3), ("question", 0.3), ("from", 0.3),
                     ("the", 0.3), ("interviewer", 0.3), ("next.", 0.3)])
        result, _ = run(words)
        mk = by_type(result, "marker")
        self.assertEqual(len(mk), 1)
        self.assertEqual(mk[0]["start"], words[1]["start"])
        self.assertEqual(mk[0]["end"], words[4]["end"])
        self.assertEqual(mk[0]["severity"], "med")

    def test_default_has_no_marker(self):
        words = seq([("just", 0.3), ("talking.", 0.3)])
        result, _ = run(words)
        self.assertEqual(by_type(result, "marker"), [])

    def test_legacy_phrase_not_matched_by_default(self):
        words = seq([("question", 0.3), ("from", 0.3), ("claude", 0.3)])
        result, _ = run(words)
        self.assertEqual(by_type(result, "marker"), [])

    def test_legacy_phrase_works_via_flag(self):
        words = seq([("question", 0.3), ("from", 0.3), ("claude", 0.3)])
        result, _ = run(words, extra=["--marker-cues", "question from claude"])
        self.assertEqual(len(by_type(result, "marker")), 1)

    def test_custom_marker_cues(self):
        words = seq([("ask", 0.3), ("the", 0.3), ("panel.", 0.3)])
        result, _ = run(words, extra=["--marker-cues", "ask the panel"])
        self.assertEqual(len(by_type(result, "marker")), 1)


class TestSchema(unittest.TestCase):
    def test_cls_only_on_fillers(self):
        words = seq([("So", 0.3), ("uh", 0.3), ("the", 0.3), ("the", 0.3)])
        result, _ = run(words)
        for c in result["candidates"]:
            if c["type"] == "filler":
                self.assertIn("cls", c)
            else:
                self.assertNotIn("cls", c)

    def test_sorted_by_start(self):
        words = seq([("So", 0.3), ("uh", 0.3, 1.0), ("the", 0.3), ("the", 0.3)])
        result, _ = run(words)
        starts = [c["start"] for c in result["candidates"]]
        self.assertEqual(starts, sorted(starts))

    def test_counts_has_all_types(self):
        result, _ = run(seq([("hi.", 0.3)]))
        self.assertEqual(set(result["counts"]),
                         {"silence", "filler", "stutter", "retake", "marker"})

    def test_thresholds_reflect_flags(self):
        result, _ = run(seq([("hi.", 0.3)]),
                        extra=["--min-silence", "1.5", "--retake-run", "4",
                               "--retake-window", "20"])
        self.assertEqual(result["thresholds"],
                         {"min_silence": 1.5, "retake_window": 20,
                          "retake_run": 4})


class TestExitCodes(unittest.TestCase):
    def test_missing_input_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            r = subprocess.run([sys.executable, str(SCRIPT),
                                str(Path(tmp) / "nope.json"), "-o",
                                str(Path(tmp) / "out.json")],
                               capture_output=True, text=True)
            self.assertEqual(r.returncode, 1)

    def test_usage_error(self):
        r = subprocess.run([sys.executable, str(SCRIPT)],
                           capture_output=True, text=True)
        self.assertEqual(r.returncode, 2)

    def test_bad_json_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            src = Path(tmp) / "bad.json"
            src.write_text("{not json")
            r = subprocess.run([sys.executable, str(SCRIPT), str(src), "-o",
                                str(Path(tmp) / "out.json")],
                               capture_output=True, text=True)
            self.assertEqual(r.returncode, 1)


if __name__ == "__main__":
    unittest.main()
