#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Tests for edl_to_fcpxml.py: the deterministic, ffprobe-free parts: the frame
grid math (outward snapping, no float drift), the FCPXML document structure from
a canned EDL with mocked probe data, and the format/exit-code switches.

The ffprobe path and editor-import sync are exercised by running the script
against a real source; they are not unit-tested here."""
import importlib.util
import subprocess
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET
from fractions import Fraction
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / "edl_to_fcpxml.py"

spec = importlib.util.spec_from_file_location("edl_to_fcpxml", SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


def probe(num=30, den=1, width=1280, height=720, dur="172.67",
          has_audio=True, rate=48000, channels=2):
    return {
        "num": num, "den": den, "width": width, "height": height,
        "duration": Fraction(dur), "has_audio": has_audio,
        "audio_rate": rate, "audio_channels": channels,
    }


def canned_edl():
    return {
        "source": "raw/camera-a.mp4",
        "source_duration": Fraction("172.67"),
        "fade_ms": 30,
        "pad_ms": 60,
        "segments": [
            {"source": "raw/camera-a.mp4", "start": Fraction("1.28"),
             "end": Fraction("9.76"), "beat": "intro"},
            {"source": "raw/camera-a.mp4", "start": Fraction("14.0"),
             "end": Fraction("14.8"), "beat": "intro"},
        ],
    }


class TestRateParsing(unittest.TestCase):
    def test_cfr_and_vfr_rates(self):
        self.assertEqual(mod.parse_rate("30/1"), Fraction(30, 1))
        self.assertEqual(mod.parse_rate("30000/1001"), Fraction(30000, 1001))

    def test_unknown_sentinel_is_none(self):
        self.assertIsNone(mod.parse_rate("0/0"))
        self.assertIsNone(mod.parse_rate(""))
        self.assertIsNone(mod.parse_rate(None))


class TestSnapping(unittest.TestCase):
    fps = Fraction(30, 1)

    def test_start_floors_end_ceils_outward(self):
        # 1.28s -> frame 38 (floor of 38.4); 9.76s -> frame 293 (ceil of 292.8).
        self.assertEqual(mod.snap_start(Fraction("1.28"), self.fps), 38)
        self.assertEqual(mod.snap_end(Fraction("9.76"), self.fps), 293)

    def test_exact_boundary_is_not_pushed(self):
        # A time already on the grid stays put in both directions.
        self.assertEqual(mod.snap_start(Fraction(2, 1), self.fps), 60)
        self.assertEqual(mod.snap_end(Fraction(2, 1), self.fps), 60)

    def test_ntsc_rate_no_float_drift_over_many_segments(self):
        # 29.97fps: accumulate 500 one-second clips; the running frame count must
        # stay an exact integer with zero drift.
        fps = Fraction(30000, 1001)
        running = 0
        for k in range(500):
            s = Fraction(k)
            e = Fraction(k + 1)
            running += mod.snap_end(e, fps) - mod.snap_start(s, fps)
        # 1s at 29.97 ceils/floors to whole frames; no fractional residue.
        self.assertIsInstance(running, int)
        self.assertGreater(running, 0)

    def test_fmt_time_uniform_timebase(self):
        self.assertEqual(mod.fmt_time(0, 30, 1), "0s")
        self.assertEqual(mod.fmt_time(38, 30, 1), "38/30s")
        self.assertEqual(mod.fmt_time(10, 30000, 1001), "10010/30000s")
        self.assertEqual(mod.fmt_frame_duration(30000, 1001), "1001/30000s")

    def test_fmt_time_is_exact_multiple_of_frame_duration(self):
        num, den = 30000, 1001
        fd = mod.parse_time(mod.fmt_frame_duration(num, den))
        for k in (1, 7, 293, 1000):
            t = mod.parse_time(mod.fmt_time(k, num, den))
            self.assertEqual((t / fd).denominator, 1)


class TestBuildDocument(unittest.TestCase):
    def build(self, project_dir=Path("/tmp/my project")):
        edl = canned_edl()
        sources = {"raw/camera-a.mp4": probe()}
        root, meta = mod.build_document(edl, sources, project_dir)
        return root, meta

    def test_well_formed_and_reparses(self):
        root, _ = self.build()
        text = mod.serialize(root)
        self.assertTrue(text.startswith('<?xml'))
        self.assertIn("<!DOCTYPE fcpxml>", text)
        # The full document (declaration + entity-free doctype) round-trips.
        self.assertEqual(ET.fromstring(text).tag, "fcpxml")

    def test_one_asset_per_source_with_encoded_file_url(self):
        root, _ = self.build()
        assets = root.findall("./resources/asset")
        self.assertEqual(len(assets), 1)
        rep = assets[0].find("media-rep")
        self.assertTrue(rep.get("src").startswith("file:///"))
        self.assertIn("my%20project", rep.get("src"))
        self.assertTrue(rep.get("src").endswith("raw/camera-a.mp4"))

    def test_version_and_format(self):
        root, _ = self.build()
        self.assertEqual(root.get("version"), "1.9")
        fmt = root.find("./resources/format")
        self.assertEqual(fmt.get("frameDuration"), "1/30s")
        self.assertEqual(fmt.get("width"), "1280")
        self.assertEqual(fmt.get("height"), "720")

    def test_spine_gapless_and_whole_frames(self):
        root, meta = self.build()
        # self_check raises if any duration is fractional or an offset gaps.
        checked = mod.self_check(root, meta["num"], meta["den"])
        clips = root.findall("./library/event/project/sequence/spine/asset-clip")
        self.assertEqual(len(clips), 2)
        # seg1: start 38, dur 293-38=255; seg2 offset must equal 255.
        self.assertEqual(clips[0].get("offset"), "0s")
        self.assertEqual(clips[0].get("start"), "38/30s")
        self.assertEqual(clips[0].get("duration"), "255/30s")
        self.assertEqual(clips[1].get("offset"), "255/30s")
        self.assertEqual(meta["total_frames"], 255 + 24)
        self.assertEqual(checked, Fraction(279, 30))

    def test_mixed_frame_rate_refused(self):
        edl = canned_edl()
        edl["segments"][1]["source"] = "raw/b-roll.mp4"
        sources = {
            "raw/camera-a.mp4": probe(num=30, den=1),
            "raw/b-roll.mp4": probe(num=25, den=1),
        }
        with self.assertRaises(SystemExit):
            mod.build_document(edl, sources, Path("/tmp/x"))

    def test_two_sources_two_assets(self):
        edl = canned_edl()
        edl["segments"][1]["source"] = "raw/b-roll.mp4"
        sources = {
            "raw/camera-a.mp4": probe(),
            "raw/b-roll.mp4": probe(),
        }
        root, _ = mod.build_document(edl, sources, Path("/tmp/x"))
        self.assertEqual(len(root.findall("./resources/asset")), 2)
        refs = {c.get("ref") for c
                in root.findall("./library/event/project/sequence/spine/asset-clip")}
        self.assertEqual(refs, {"a1", "a2"})


def run(args):
    return subprocess.run([sys.executable, str(SCRIPT), *args],
                          capture_output=True, text=True)


class TestCli(unittest.TestCase):
    def test_planned_format_exits_3(self):
        with tempfile.TemporaryDirectory() as tmp:
            edl = Path(tmp) / "edl.json"
            edl.write_text('{"source":"x","segments":[]}')
            for fmt in ("xmeml", "edl"):
                r = run([str(edl), "-o", str(Path(tmp) / "o"), "--format", fmt])
                self.assertEqual(r.returncode, 3, r.stderr)
                self.assertIn("planned", r.stderr.lower())

    def test_missing_edl_exits_2(self):
        r = run(["/nonexistent/edl.json", "-o", "/tmp/o.fcpxml"])
        self.assertEqual(r.returncode, 2)

    def test_missing_source_exits_1(self):
        with tempfile.TemporaryDirectory() as tmp:
            edl = Path(tmp) / "cut" / "edl.json"
            edl.parent.mkdir()
            edl.write_text(
                '{"source":"raw/missing.mp4","fade_ms":30,"pad_ms":60,'
                '"segments":[{"source":"raw/missing.mp4","start":0,"end":1}]}')
            r = run([str(edl), "-o", str(Path(tmp) / "o.fcpxml")])
            self.assertEqual(r.returncode, 1, r.stderr)


if __name__ == "__main__":
    unittest.main()
