#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Tests for render_preview.py: the deterministic, ffmpeg-free parts: the
timeline math (segment durations, internal boundary times) and the
filter_complex / command construction from a canned EDL, plain and with the
composited-overlay mode (shared with render_final.py via composite_core.py).

The actual render, ffprobe, and boundary-frame extraction are exercised by
the synthesized-fixture integration test in test-render_final.py (same
compositing core) and by running the script against a real source."""
import importlib.util
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / "render_preview.py"

spec = importlib.util.spec_from_file_location("render_preview", SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


def canned_edl():
    return {
        "source": "raw/camera-a.mp4",
        "fade_ms": 30,
        "pad_ms": 60,
        "segments": [
            {"source": "raw/camera-a.mp4", "start": 1.28, "end": 9.76},
            {"source": "raw/camera-a.mp4", "start": 14.0, "end": 14.8},
            {"source": "raw/camera-a.mp4", "start": 20.72, "end": 23.28},
        ],
    }


class TestTimelineMath(unittest.TestCase):
    def test_segment_durations(self):
        durs = mod.segment_durations(canned_edl())
        self.assertEqual(len(durs), 3)
        self.assertAlmostEqual(durs[0], 8.48)
        self.assertAlmostEqual(durs[1], 0.8)
        self.assertAlmostEqual(durs[2], 2.56)

    def test_boundary_times_are_internal_cumulative(self):
        # Two internal cuts for three segments: at 8.48 and 9.28.
        times = mod.boundary_times(canned_edl())
        self.assertEqual(len(times), 2)
        self.assertAlmostEqual(times[0], 8.48)
        self.assertAlmostEqual(times[1], 9.28)

    def test_expected_duration_is_sum(self):
        self.assertAlmostEqual(sum(mod.segment_durations(canned_edl())), 11.84)


class TestFilterComplex(unittest.TestCase):
    def build(self):
        edl = canned_edl()
        idx = {"raw/camera-a.mp4": 0}
        return mod.build_filter_complex(edl, idx, 720)

    def test_trim_endpoints_and_scale(self):
        fc = self.build()
        self.assertIn("trim=start=1.28:end=9.76", fc)
        self.assertIn("atrim=start=1.28:end=9.76", fc)
        self.assertIn("scale=-2:720", fc)

    def test_fades_at_every_boundary(self):
        fc = self.build()
        # in-fade at the head of each segment...
        self.assertEqual(fc.count("afade=t=in:st=0:d=0.03"), 3)
        # ...and an out-fade timed to (segment duration - fade) on each.
        self.assertIn("afade=t=out:st=8.45:d=0.03", fc)   # 8.48 - 0.03
        self.assertIn("afade=t=out:st=0.77:d=0.03", fc)   # 0.80 - 0.03

    def test_concat_over_all_segments(self):
        fc = self.build()
        self.assertIn("concat=n=3:v=1:a=1[outv][outa]", fc)

    def test_short_segment_does_not_overlap_fades(self):
        edl = canned_edl()
        edl["segments"] = [{"source": "raw/camera-a.mp4", "start": 0.0, "end": 0.04}]
        fc = mod.build_filter_complex(edl, {"raw/camera-a.mp4": 0}, 720)
        # 40ms clip, 30ms fade -> fade clamped to dur/2 = 20ms.
        self.assertIn("afade=t=in:st=0:d=0.02", fc)


class TestCompositedMode(unittest.TestCase):
    def overlays(self):
        return [
            {"index": 1, "start": 1.0, "dur": 2.5, "image": False,
             "path": "graphics/b1.mov", "id": "b1"},
            {"index": 2, "start": 9.0, "dur": 1.5, "image": True,
             "path": "graphics/b2.png", "id": "b2"},
        ]

    def test_overlay_chain_and_windows(self):
        edl = canned_edl()
        fc = mod.build_filter_complex(edl, {"raw/camera-a.mp4": 0}, 720,
                                      overlays=self.overlays(),
                                      overlay_size=(1280, 720))
        # concat feeds the overlay chain, which ends in [outv]
        self.assertIn("concat=n=3:v=1:a=1[basev][outa]", fc)
        self.assertIn("[1:v]format=rgba,scale=1280:720,"
                      "setpts=PTS-STARTPTS+1/TB[ov0]", fc)
        self.assertIn("overlay=eof_action=pass:enable='between(t,1,3.5)'", fc)
        self.assertIn("overlay=eof_action=pass:enable='between(t,9,10.5)'", fc)
        self.assertIn("[base2]format=yuv420p[outv]", fc)

    def test_no_overlays_keeps_plain_labels(self):
        fc = mod.build_filter_complex(canned_edl(), {"raw/camera-a.mp4": 0}, 720)
        self.assertIn("concat=n=3:v=1:a=1[outv][outa]", fc)
        self.assertNotIn("overlay=", fc)
        self.assertNotIn("format=yuv420p", fc)

    def test_command_caps_looped_image_inputs(self):
        cmd, _ = mod.build_command(canned_edl(), Path("/proj"),
                                   Path("/out/p.mp4"), 720,
                                   overlays=self.overlays(),
                                   overlay_size=(1280, 720))
        joined = " ".join(cmd)
        # video overlay input capped to its beat dur
        self.assertIn("-t 2.5 -i graphics/b1.mov", joined)
        # image overlay looped AND explicitly duration-capped
        self.assertIn("-loop 1 -t 1.5 -i graphics/b2.png", joined)
        self.assertEqual(cmd.count("-i"), 3)

    def test_beats_without_graphics_dir_is_usage_error(self):
        with tempfile.TemporaryDirectory() as tmp:
            edl = Path(tmp) / "edl.json"
            edl.write_text('{"source":"x","segments":[{"source":"x",'
                           '"start":0,"end":1}]}')
            r = run([str(edl), "-o", str(Path(tmp) / "p.mp4"),
                     "--beats", str(Path(tmp) / "beats.md")])
            self.assertEqual(r.returncode, 2)


class TestCommand(unittest.TestCase):
    def test_multi_source_inputs_and_encode_flags(self):
        edl = canned_edl()
        edl["segments"][2]["source"] = "raw/b-roll.mp4"
        cmd, index = mod.build_command(edl, Path("/proj"), Path("/out/p.mp4"), 720)
        self.assertEqual(index, {"raw/camera-a.mp4": 0, "raw/b-roll.mp4": 1})
        self.assertEqual(cmd.count("-i"), 2)
        self.assertIn("libx264", cmd)
        self.assertIn("-crf", cmd)
        self.assertIn("28", cmd)
        self.assertIn("veryfast", cmd)
        self.assertIn("aac", cmd)
        self.assertEqual(cmd[-1], "/out/p.mp4")


def run(args):
    return subprocess.run([sys.executable, str(SCRIPT), *args],
                          capture_output=True, text=True)


class TestCli(unittest.TestCase):
    def test_missing_edl_exits_2(self):
        r = run(["/nonexistent/edl.json", "-o", "/tmp/p.mp4"])
        self.assertEqual(r.returncode, 2)

    def test_empty_segments_exits_2(self):
        with tempfile.TemporaryDirectory() as tmp:
            edl = Path(tmp) / "edl.json"
            edl.write_text('{"source":"x","segments":[]}')
            r = run([str(edl), "-o", str(Path(tmp) / "p.mp4")])
            self.assertEqual(r.returncode, 2)


if __name__ == "__main__":
    unittest.main()
