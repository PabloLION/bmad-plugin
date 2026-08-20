#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Tests for remap_timecode.py: the dual-timecode mapping math (original
source time to clean edited time and back, gap snap/drop policies) and the
CLI file modes (chapters, events) over canned EDLs. Pure logic, no media."""
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SCRIPTS))

spec = importlib.util.spec_from_file_location("remap_timecode",
                                              SCRIPTS / "remap_timecode.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


def canned_edl():
    # Timeline: A[10,20) at 0-10, A[30,40) at 10-20, B[5,8) at 20-23.
    return {
        "source": "raw/a.mp4",
        "fade_ms": 30,
        "segments": [
            {"source": "raw/a.mp4", "start": 10.0, "end": 20.0},
            {"source": "raw/a.mp4", "start": 30.0, "end": 40.0},
            {"source": "raw/b.mp4", "start": 5.0, "end": 8.0},
        ],
    }


def mapping():
    return mod.build_map(canned_edl())


class TestOrigToClean(unittest.TestCase):
    def test_inside_kept_segments(self):
        self.assertEqual(mod.orig_to_clean(mapping(), 12.0, "raw/a.mp4"),
                         (2.0, ""))
        self.assertEqual(mod.orig_to_clean(mapping(), 35.0, "raw/a.mp4"),
                         (15.0, ""))
        self.assertEqual(mod.orig_to_clean(mapping(), 6.0, "raw/b.mp4"),
                         (21.0, ""))

    def test_gap_snaps_to_next_kept_segment(self):
        clean, note = mod.orig_to_clean(mapping(), 25.0, "raw/a.mp4")
        self.assertEqual(clean, 10.0)
        self.assertEqual(note, "snapped")

    def test_after_last_kept_snaps_to_last_clean_time(self):
        clean, note = mod.orig_to_clean(mapping(), 55.0, "raw/a.mp4")
        self.assertEqual(clean, 20.0)
        self.assertEqual(note, "snapped")

    def test_gap_drop_policy(self):
        clean, note = mod.orig_to_clean(mapping(), 25.0, "raw/a.mp4",
                                        gap="drop")
        self.assertIsNone(clean)
        self.assertEqual(note, "dropped")

    def test_unknown_source_raises(self):
        with self.assertRaises(ValueError):
            mod.orig_to_clean(mapping(), 1.0, "raw/nope.mp4")


class TestCleanToOrig(unittest.TestCase):
    def test_each_span(self):
        self.assertEqual(mod.clean_to_orig(mapping(), 2.0),
                         ("raw/a.mp4", 12.0))
        self.assertEqual(mod.clean_to_orig(mapping(), 15.0),
                         ("raw/a.mp4", 35.0))
        self.assertEqual(mod.clean_to_orig(mapping(), 21.0),
                         ("raw/b.mp4", 6.0))

    def test_end_boundary_ok_and_beyond_raises(self):
        src, orig = mod.clean_to_orig(mapping(), 23.0)
        self.assertEqual((src, orig), ("raw/b.mp4", 8.0))
        with self.assertRaises(ValueError):
            mod.clean_to_orig(mapping(), 24.0)
        with self.assertRaises(ValueError):
            mod.clean_to_orig(mapping(), -1.0)


class TestChapters(unittest.TestCase):
    def test_lines_remap_snap_and_pass_through(self):
        text = ("# Chapters\n"
                "0:12 Intro\n"
                "- 0:25 Cut material\n"
                "0:35 The point\n"
                "no timecode here\n")
        lines, stats = mod.remap_chapters(text, mapping(), "orig-to-clean",
                                          "raw/a.mp4", "snap")
        self.assertEqual(lines[1], "0:02 Intro")
        self.assertEqual(lines[2], "- 0:10 Cut material")  # snapped
        self.assertEqual(lines[3], "0:15 The point")
        self.assertEqual(lines[4], "no timecode here")
        self.assertEqual(stats["remapped"], 3)
        self.assertEqual(stats["snapped"], 1)

    def test_drop_removes_lines(self):
        text = "0:12 keep\n0:25 gone\n"
        lines, stats = mod.remap_chapters(text, mapping(), "orig-to-clean",
                                          "raw/a.mp4", "drop")
        self.assertEqual(lines, ["0:02 keep"])
        self.assertEqual(stats["dropped"], 1)


class TestEvents(unittest.TestCase):
    def test_numbers_strings_and_notes(self):
        data = [
            {"time": 12.0, "label": "x"},
            {"start": "0:35", "end": "0:36"},
            {"time": 25.0},
            {"label": "no time"},
        ]
        out, stats = mod.remap_events(data, mapping(), "orig-to-clean",
                                      "raw/a.mp4", "snap")
        self.assertEqual(out[0]["time"], 2.0)
        self.assertEqual(out[1]["start"], "0:15")
        self.assertEqual(out[1]["end"], "0:16")
        self.assertEqual(out[2]["time"], 10.0)
        self.assertEqual(out[2]["_remap"], {"time": "snapped"})
        self.assertNotIn("_remap", out[0])
        self.assertEqual(stats["remapped"], 4)

    def test_clean_to_orig_adds_source(self):
        data = {"events": [{"time": 21.0}]}
        out, _ = mod.remap_events(data, mapping(), "clean-to-orig", None,
                                  "snap")
        self.assertEqual(out["events"][0]["time"], 6.0)
        self.assertEqual(out["events"][0]["source"], "raw/b.mp4")


def run_cli(args):
    return subprocess.run([sys.executable, str(SCRIPTS / "remap_timecode.py"),
                           *args], capture_output=True, text=True)


class TestCli(unittest.TestCase):
    def write_edl(self, tmp):
        p = Path(tmp) / "edl.json"
        p.write_text(json.dumps(canned_edl()))
        return p

    def test_single_time(self):
        with tempfile.TemporaryDirectory() as tmp:
            edl = self.write_edl(tmp)
            r = run_cli([str(edl), "--direction", "orig-to-clean",
                         "--time", "0:12", "--source", "raw/a.mp4"])
            self.assertEqual(r.returncode, 0, r.stderr)
            out = json.loads(r.stdout)
            self.assertEqual(out["mapped_seconds"], 2.0)
            self.assertEqual(out["mapped_timecode"], "0:02.000")

    def test_clean_to_orig_time_reports_source(self):
        with tempfile.TemporaryDirectory() as tmp:
            edl = self.write_edl(tmp)
            r = run_cli([str(edl), "--direction", "clean-to-orig",
                         "--time", "21"])
            self.assertEqual(r.returncode, 0, r.stderr)
            out = json.loads(r.stdout)
            self.assertEqual(out["mapped_seconds"], 6.0)
            self.assertEqual(out["source"], "raw/b.mp4")

    def test_chapters_file_mode(self):
        with tempfile.TemporaryDirectory() as tmp:
            edl = self.write_edl(tmp)
            chapters = Path(tmp) / "chapters.md"
            chapters.write_text("0:12 Intro\n0:35 Point\n")
            out_path = Path(tmp) / "clean.md"
            r = run_cli([str(edl), "--direction", "orig-to-clean",
                         "--chapters", str(chapters), "-o", str(out_path),
                         "--source", "raw/a.mp4"])
            self.assertEqual(r.returncode, 0, r.stderr)
            self.assertEqual(out_path.read_text(),
                             "0:02 Intro\n0:15 Point\n")
            self.assertEqual(json.loads(r.stdout)["remapped"], 2)

    def test_events_file_mode(self):
        with tempfile.TemporaryDirectory() as tmp:
            edl = self.write_edl(tmp)
            events = Path(tmp) / "events.json"
            events.write_text(json.dumps([{"time": 12.0}]))
            out_path = Path(tmp) / "out.json"
            r = run_cli([str(edl), "--direction", "orig-to-clean",
                         "--events", str(events), "-o", str(out_path),
                         "--source", "raw/a.mp4"])
            self.assertEqual(r.returncode, 0, r.stderr)
            self.assertEqual(json.loads(out_path.read_text()),
                             [{"time": 2.0}])

    def test_multi_source_without_source_flag_exits_2(self):
        with tempfile.TemporaryDirectory() as tmp:
            edl = self.write_edl(tmp)
            r = run_cli([str(edl), "--direction", "orig-to-clean",
                         "--time", "12"])
            self.assertEqual(r.returncode, 2)

    def test_mode_exclusivity_and_missing_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            edl = self.write_edl(tmp)
            r = run_cli([str(edl), "--direction", "orig-to-clean"])
            self.assertEqual(r.returncode, 2)
            r = run_cli([str(edl), "--direction", "orig-to-clean",
                         "--time", "1", "--chapters", "x.md"])
            self.assertEqual(r.returncode, 2)
            r = run_cli([str(edl), "--direction", "orig-to-clean",
                         "--chapters", "x.md"])
            self.assertEqual(r.returncode, 2)

    def test_missing_edl_exits_1(self):
        r = run_cli(["/nonexistent/edl.json", "--direction", "orig-to-clean",
                     "--time", "1"])
        self.assertEqual(r.returncode, 1)


if __name__ == "__main__":
    unittest.main()
