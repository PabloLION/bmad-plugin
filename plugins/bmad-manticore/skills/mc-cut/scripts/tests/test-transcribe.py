#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Tests for transcribe.py: the deterministic, model-free parts: the
token->word mapping (indexing, gap computation, clamping, rounding) and the
provider-switch exit code.

The real transcription requires the parakeet-mlx model and a media file; it is
exercised by running the script directly, not unit-tested here. These tests
import only stdlib and the script's pure helpers, so they run without the
parakeet-mlx dependency, no model download, and no network."""
import importlib.util
import subprocess
import sys
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / "transcribe.py"

spec = importlib.util.spec_from_file_location("transcribe", SCRIPT)
transcribe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(transcribe)


def run(args):
    return subprocess.run([sys.executable, str(SCRIPT), *args],
                          capture_output=True, text=True)


class TestGroupSubwords(unittest.TestCase):
    def test_leading_space_starts_a_word_and_conf_is_min(self):
        # The validated run's first words, as real parakeet subword tokens:
        # a leading space marks a new word; continuations/punctuation attach.
        tokens = [
            {"text": " Al", "start": 1.28, "end": 1.52, "confidence": 0.9079},
            {"text": "rig", "start": 1.52, "end": 1.68, "confidence": 1.0},
            {"text": "ht", "start": 1.68, "end": 1.68, "confidence": 1.0},
            {"text": ",", "start": 1.68, "end": 1.76, "confidence": 0.9564},
            {"text": " I", "start": 1.76, "end": 1.84, "confidence": 0.9994},
            {"text": "'", "start": 1.84, "end": 1.92, "confidence": 0.9998},
            {"text": "m", "start": 1.92, "end": 2.0, "confidence": 0.9999},
        ]
        groups = transcribe.group_subwords(tokens)
        self.assertEqual([g[0] for g in groups], ["Alright,", "I'm"])
        # span = first token start .. last token end
        self.assertEqual(groups[0][1], 1.28)
        self.assertEqual(groups[0][2], 1.76)
        # confidence is the minimum over the subwords
        self.assertEqual(groups[0][3], 0.9079)
        self.assertEqual(groups[1][3], 0.9994)

    def test_first_token_starts_a_word_even_without_leading_space(self):
        groups = transcribe.group_subwords(
            [{"text": "hi", "start": 0.0, "end": 0.5, "confidence": 1.0}])
        self.assertEqual([g[0] for g in groups], ["hi"])


class TestNormalizeWords(unittest.TestCase):
    def test_basic_mapping_matches_pinned_schema(self):
        tokens = [
            {"text": " Al", "start": 1.28, "end": 1.52, "confidence": 0.9079},
            {"text": "rig", "start": 1.52, "end": 1.68, "confidence": 1.0},
            {"text": "ht", "start": 1.68, "end": 1.68, "confidence": 1.0},
            {"text": ",", "start": 1.68, "end": 1.76, "confidence": 0.9564},
            {"text": " I", "start": 1.76, "end": 1.84, "confidence": 0.9994},
            {"text": "'", "start": 1.84, "end": 1.92, "confidence": 0.9998},
            {"text": "m", "start": 1.92, "end": 2.0, "confidence": 0.9999},
            {"text": " doing", "start": 2.0, "end": 2.24, "confidence": 1.0},
        ]
        words = transcribe.normalize_words(tokens, duration=10.0)
        self.assertEqual(words[0], {
            "word": "Alright,", "start": 1.28, "end": 1.76, "confidence": 0.9079,
            "i": 0, "gap_before": 1.28, "gap_after": 0.0,
        })
        self.assertEqual([w["word"] for w in words], ["Alright,", "I'm", "doing"])
        self.assertEqual([w["i"] for w in words], [0, 1, 2])

    def test_first_word_gap_before_is_its_start(self):
        tokens = [{"text": "hi", "start": 2.5, "end": 3.0, "confidence": 1.0}]
        words = transcribe.normalize_words(tokens, duration=5.0)
        self.assertEqual(words[0]["gap_before"], 2.5)

    def test_last_word_gap_after_is_duration_minus_end(self):
        tokens = [
            {"text": " a", "start": 0.0, "end": 1.0, "confidence": 1.0},
            {"text": " b", "start": 1.5, "end": 2.0, "confidence": 1.0},
        ]
        words = transcribe.normalize_words(tokens, duration=2.19)
        self.assertEqual(words[-1]["gap_after"], 0.19)

    def test_interior_gaps(self):
        tokens = [
            {"text": " a", "start": 0.0, "end": 1.0, "confidence": 1.0},
            {"text": " b", "start": 1.5, "end": 2.0, "confidence": 1.0},
            {"text": " c", "start": 2.0, "end": 2.5, "confidence": 1.0},
        ]
        words = transcribe.normalize_words(tokens, duration=3.0)
        self.assertEqual(words[0]["gap_after"], 0.5)
        self.assertEqual(words[1]["gap_before"], 0.5)
        self.assertEqual(words[1]["gap_after"], 0.0)

    def test_negative_gaps_are_clamped(self):
        # Overlapping timestamps must never produce a negative gap.
        tokens = [
            {"text": " a", "start": 0.0, "end": 2.0, "confidence": 1.0},
            {"text": " b", "start": 1.5, "end": 3.0, "confidence": 1.0},
        ]
        words = transcribe.normalize_words(tokens, duration=2.5)
        self.assertEqual(words[0]["gap_after"], 0.0)
        self.assertEqual(words[1]["gap_before"], 0.0)
        # duration < last end: gap_after clamps to 0.0
        self.assertEqual(words[1]["gap_after"], 0.0)

    def test_rounding(self):
        tokens = [{"text": " x", "start": 1.23456, "end": 1.78912,
                   "confidence": 0.907891}]
        words = transcribe.normalize_words(tokens, duration=5.0)
        self.assertEqual(words[0]["start"], 1.23)
        self.assertEqual(words[0]["end"], 1.79)
        self.assertEqual(words[0]["confidence"], 0.9079)

    def test_accepts_objects_not_just_dicts(self):
        class Tok:
            def __init__(self, text, start, end, confidence):
                self.text, self.start, self.end, self.confidence = (
                    text, start, end, confidence)
        tokens = [Tok(" hey", 0.0, 0.5, 1.0)]
        words = transcribe.normalize_words(tokens, duration=1.0)
        self.assertEqual(words[0]["word"], "hey")
        self.assertEqual(words[0]["gap_after"], 0.5)


class TestProviderSwitch(unittest.TestCase):
    def test_unimplemented_provider_exits_3(self):
        r = run(["some.mp4", "-o", "out.json", "--provider", "deepgram-nova3"])
        self.assertEqual(r.returncode, 3)
        self.assertIn("not implemented", r.stderr.lower())

    def test_missing_output_arg_is_usage_error(self):
        r = run(["some.mp4"])
        self.assertEqual(r.returncode, 2)


if __name__ == "__main__":
    unittest.main()
