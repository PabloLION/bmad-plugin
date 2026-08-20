#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Tests for render_final.py and the shared composite_core.py: pure logic
(timecode parsing, beat-table parsing, overlay resolution, chunk planning,
encoder selection, disk estimation, progress parsing) plus CLI exit codes,
and one end-to-end render over fixtures synthesized with ffmpeg color/test
sources (skipped when ffmpeg is not installed). No model downloads, no real
footage."""
import importlib.util
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SCRIPTS))

import composite_core as core  # noqa: E402

spec = importlib.util.spec_from_file_location("render_final",
                                              SCRIPTS / "render_final.py")
render_final = importlib.util.module_from_spec(spec)
spec.loader.exec_module(render_final)

FFMPEG = shutil.which("ffmpeg") and shutil.which("ffprobe")


class TestTimecode(unittest.TestCase):
    def test_parse_forms(self):
        self.assertEqual(core.parse_timecode("90"), 90.0)
        self.assertEqual(core.parse_timecode("90.5"), 90.5)
        self.assertEqual(core.parse_timecode("12.5s"), 12.5)
        self.assertEqual(core.parse_timecode("1:30"), 90.0)
        self.assertEqual(core.parse_timecode("01:02:03.25"), 3723.25)

    def test_parse_rejects_garbage(self):
        for bad in ("", "a:b", "1:2:3:4", "-5"):
            with self.assertRaises(ValueError):
                core.parse_timecode(bad)

    def test_format(self):
        self.assertEqual(core.format_timecode(90), "1:30")
        self.assertEqual(core.format_timecode(3723), "1:02:03")
        self.assertEqual(core.format_timecode(5.25, precision=3), "0:05.250")


BEATS_MD = """# Beats

| id | start | dur | end | anchor word | anchor ts | spoken phrase | type | engine | asset | composition |
|---|---|---|---|---|---|---|---|---|---|---|
| b1 | 0:02 | 3 | 0:05 | alpha | 0:02 | "alpha beta" | overlay | html | null | keyword callout |
| b2 | 12.5 | 2.5 |  | gamma | 12.5 | "gamma" | cta | remotion | cta-card | subscribe |
| b3 | 30 |  | 34 | delta | 30 | "delta" |  |  |  | legacy 0.x row |
| bad | oops | 2 |  | x | 0 | "x" | overlay |  |  | broken start |
| b4 | 40 |  |  | x | 40 | "x" | overlay |  |  | no dur or end |
"""


class TestParseBeats(unittest.TestCase):
    def test_rows_and_tolerance(self):
        beats, skipped = core.parse_beats_table(BEATS_MD)
        self.assertEqual([b["id"] for b in beats], ["b1", "b2", "b3"])
        self.assertEqual(beats[0], {"id": "b1", "start": 2.0, "dur": 3.0,
                                    "type": "overlay", "asset": None})
        self.assertEqual(beats[1]["type"], "cta")
        self.assertEqual(beats[1]["asset"], "cta-card")
        # 0.x row missing type/engine/asset: type defaults, dur from end-start
        self.assertEqual(beats[2]["type"], "overlay")
        self.assertEqual(beats[2]["dur"], 4.0)
        self.assertEqual(len(skipped), 2)

    def test_no_table_means_no_beats(self):
        beats, skipped = core.parse_beats_table("just prose, no table")
        self.assertEqual(beats, [])
        self.assertEqual(skipped, [])


class TestResolveOverlays(unittest.TestCase):
    def test_extension_priority_and_missing(self):
        with tempfile.TemporaryDirectory() as tmp:
            g = Path(tmp)
            (g / "b1.mov").touch()
            (g / "b1.png").touch()  # .mov wins
            (g / "b2.png").touch()
            beats = [{"id": "b2", "start": 9.0, "dur": 1.0},
                     {"id": "b1", "start": 2.0, "dur": 3.0},
                     {"id": "b3", "start": 20.0, "dur": 1.0}]
            found, missing = core.resolve_overlays(beats, g)
            self.assertEqual([o["id"] for o in found], ["b1", "b2"])  # sorted
            self.assertEqual(found[0]["path"], str(g / "b1.mov"))
            self.assertFalse(found[0]["image"])
            self.assertTrue(found[1]["image"])
            self.assertEqual(missing, ["b3"])


def edl_4x10():
    segs = [{"source": "raw/a.mp4", "start": i * 20.0, "end": i * 20.0 + 10.0}
            for i in range(4)]
    return {"source": "raw/a.mp4", "fade_ms": 30, "segments": segs}


class TestPlanChunks(unittest.TestCase):
    def test_even_split_no_overlays(self):
        chunks = core.plan_chunks(edl_4x10(), parallel=2)
        self.assertEqual(len(chunks), 2)
        self.assertEqual(chunks[0]["seg_start"], 0)
        self.assertEqual(chunks[0]["seg_end"], 2)
        self.assertEqual(chunks[0]["duration"], 20.0)
        self.assertEqual(chunks[1]["offset"], 20.0)
        self.assertEqual(chunks[1]["duration"], 20.0)

    def test_split_avoids_overlay_windows(self):
        ov = [{"index": 1, "start": 19.0, "dur": 2.0, "image": True,
               "path": "g/x.png", "id": "x"}]
        chunks = core.plan_chunks(edl_4x10(), ov, parallel=2)
        self.assertEqual(len(chunks), 2)
        # boundary 20 is inside the overlay; 10 and 30 are the valid picks
        split = chunks[0]["duration"]
        self.assertIn(split, (10.0, 30.0))
        # the overlay lands whole in exactly one chunk, with a local start
        owners = [c for c in chunks if c["overlays"]]
        self.assertEqual(len(owners), 1)
        local = owners[0]["overlays"][0]
        self.assertEqual(local["start"], 19.0 - owners[0]["offset"])

    def test_parallel_one_and_cap(self):
        self.assertEqual(len(core.plan_chunks(edl_4x10(), parallel=1)), 1)
        edl = {"segments": [{"source": "s", "start": 0.0, "end": 5.0}]}
        self.assertEqual(len(core.plan_chunks(edl, parallel=4)), 1)

    def test_chunks_cover_everything_in_order(self):
        chunks = core.plan_chunks(edl_4x10(), parallel=3)
        self.assertEqual(chunks[0]["seg_start"], 0)
        self.assertEqual(chunks[-1]["seg_end"], 4)
        for a, b in zip(chunks, chunks[1:]):
            self.assertEqual(a["seg_end"], b["seg_start"])
            self.assertAlmostEqual(a["offset"] + a["duration"], b["offset"])


class TestEncoderSelection(unittest.TestCase):
    def test_auto_prefers_videotoolbox_on_macos(self):
        avail = {"libx264", "h264_videotoolbox"}
        self.assertEqual(core.pick_encoder("auto", avail, "Darwin"),
                         "h264_videotoolbox")
        self.assertEqual(core.pick_encoder("auto", avail, "Linux"), "libx264")
        self.assertEqual(core.pick_encoder("auto", {"libx264"}, "Darwin"),
                         "libx264")

    def test_explicit_falls_back_when_unavailable(self):
        self.assertEqual(core.pick_encoder("hevc_videotoolbox", {"libx264"},
                                           "Darwin"), "libx264")
        self.assertEqual(core.pick_encoder("libx264", {"libx264"}, "Linux"),
                         "libx264")

    def test_encode_args(self):
        x264 = core.encode_args("libx264", crf=20, height=1080)
        self.assertIn("-crf", x264)
        self.assertIn("20", x264)
        self.assertIn("yuv420p", x264)
        vt = core.encode_args("h264_videotoolbox", height=1080)
        self.assertIn("-b:v", vt)
        self.assertIn("12000k", vt)
        self.assertNotIn("-crf", vt)
        hevc = core.encode_args("hevc_videotoolbox", height=2160)
        self.assertIn("hvc1", hevc)
        self.assertIn("40000k", hevc)

    def test_bitrate_ladder(self):
        self.assertEqual(core.bitrate_for(720), 8000)
        self.assertEqual(core.bitrate_for(540), 5000)
        self.assertEqual(core.bitrate_for(1440), 24000)


class TestDiskPreflight(unittest.TestCase):
    def test_estimate_scales_with_duration_and_height(self):
        small = core.estimate_output_bytes(60, 720)
        self.assertGreater(core.estimate_output_bytes(120, 720), small)
        self.assertGreater(core.estimate_output_bytes(60, 2160), small)
        # 60s of 1080p at ~12.2 Mbps is on the order of 90 MB
        self.assertAlmostEqual(core.estimate_output_bytes(60, 1080) / 1e6,
                               91.4, delta=5)

    def test_check_disk(self):
        ok, free = core.check_disk(Path("."), 1)
        self.assertTrue(ok)
        self.assertGreater(free, 0)
        ok, _ = core.check_disk(Path("."), 10 ** 18)
        self.assertFalse(ok)


class TestParseProgress(unittest.TestCase):
    def test_out_time_us_and_state(self):
        info = core.parse_progress("frame=100\nout_time_us=2500000\n"
                                   "progress=continue\n")
        self.assertEqual(info["seconds"], 2.5)
        self.assertEqual(info["state"], "continue")

    def test_out_time_fallback_and_garbage(self):
        info = core.parse_progress("out_time=00:00:01.500000\nprogress=end\n")
        self.assertEqual(info["seconds"], 1.5)
        self.assertEqual(info["state"], "end")
        self.assertEqual(core.parse_progress("not progress output"), {})
        self.assertEqual(core.parse_progress("out_time_us=N/A"), {})


def run_cli(args):
    return subprocess.run([sys.executable, str(SCRIPTS / "render_final.py"),
                           *args], capture_output=True, text=True)


class TestCli(unittest.TestCase):
    def test_missing_edl_exits_2(self):
        r = run_cli(["/nonexistent/edl.json", "-o", "/tmp/f.mp4"])
        self.assertEqual(r.returncode, 2)

    def test_empty_segments_exits_2(self):
        with tempfile.TemporaryDirectory() as tmp:
            edl = Path(tmp) / "edl.json"
            edl.write_text('{"source":"x","segments":[]}')
            r = run_cli([str(edl), "-o", str(Path(tmp) / "f.mp4")])
            self.assertEqual(r.returncode, 2)

    def test_beats_without_graphics_dir_exits_2(self):
        with tempfile.TemporaryDirectory() as tmp:
            edl = Path(tmp) / "edl.json"
            edl.write_text('{"source":"x","segments":[{"source":"x",'
                           '"start":0,"end":1}]}')
            r = run_cli([str(edl), "-o", str(Path(tmp) / "f.mp4"),
                         "--beats", "beats.md"])
            self.assertEqual(r.returncode, 2)


@unittest.skipUnless(FFMPEG, "ffmpeg/ffprobe not installed")
class TestEndToEnd(unittest.TestCase):
    """Synthesized-fixture render: a 4s test source, a two-segment EDL, one
    PNG overlay from a beat table, two parallel chunks, boundary frames."""

    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        proj = Path(cls.tmp.name)
        (proj / "raw").mkdir()
        (proj / "cut").mkdir()
        (proj / "graphics").mkdir()
        # Source: 4s color bars + tone, 320x180, CFR 30. Explicit -t caps on
        # both synthetic lavfi inputs plus -shortest (the runaway lesson).
        r = subprocess.run(
            ["ffmpeg", "-y",
             "-f", "lavfi", "-t", "4", "-i",
             "testsrc2=size=320x180:rate=30",
             "-f", "lavfi", "-t", "4", "-i", "sine=frequency=440:sample_rate=48000",
             "-t", "4", "-shortest",
             "-c:v", "libx264", "-preset", "ultrafast", "-crf", "30",
             "-pix_fmt", "yuv420p", "-c:a", "aac",
             str(proj / "raw" / "a.mp4")],
            capture_output=True, text=True)
        assert r.returncode == 0, r.stderr
        # Overlay: a single red PNG frame for beat b1.
        r = subprocess.run(
            ["ffmpeg", "-y", "-f", "lavfi", "-t", "1", "-i",
             "color=c=red@0.8:size=120x60", "-frames:v", "1",
             str(proj / "graphics" / "b1.png")],
            capture_output=True, text=True)
        assert r.returncode == 0, r.stderr
        edl = {"source": "raw/a.mp4", "fade_ms": 30, "pad_ms": 60,
               "segments": [
                   {"source": "raw/a.mp4", "start": 0.5, "end": 1.5},
                   {"source": "raw/a.mp4", "start": 2.0, "end": 3.0}]}
        (proj / "cut" / "edl.json").write_text(json.dumps(edl))
        (proj / "beats.md").write_text(
            "| id | start | dur | type |\n|---|---|---|---|\n"
            "| b1 | 0.3 | 0.5 | overlay |\n"
            "| b9 | 1.6 | 0.2 | overlay |\n")
        cls.proj = proj

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_parallel_composited_render(self):
        out = self.proj / "renders" / "final.mp4"
        r = run_cli([str(self.proj / "cut" / "edl.json"), "-o", str(out),
                     "--beats", str(self.proj / "beats.md"),
                     "--graphics-dir", str(self.proj / "graphics"),
                     "--codec", "libx264", "--crf", "30", "--parallel", "2",
                     "--boundary-frames", str(self.proj / "renders" / "bf")])
        self.assertEqual(r.returncode, 0, r.stderr)
        summary = json.loads(r.stdout)
        self.assertEqual(summary["segments"], 2)
        self.assertEqual(summary["chunks"], 2)
        self.assertEqual(summary["overlays"], 1)
        self.assertEqual(summary["overlays_missing"], ["b9"])
        self.assertTrue(out.is_file())
        self.assertAlmostEqual(summary["actual_duration_seconds"], 2.0,
                               delta=0.5)
        self.assertEqual(summary["boundary_frames"], 2)
        # progress lines reached stderr
        self.assertIn("render_final:", r.stderr)
        # chunk intermediates were cleaned up
        self.assertEqual(list((self.proj / "renders").glob("*.ts")), [])

    def test_single_chunk_plain_render(self):
        out = self.proj / "renders" / "plain.mp4"
        r = run_cli([str(self.proj / "cut" / "edl.json"), "-o", str(out),
                     "--codec", "libx264", "--crf", "30", "--parallel", "1"])
        self.assertEqual(r.returncode, 0, r.stderr)
        summary = json.loads(r.stdout)
        self.assertEqual(summary["chunks"], 1)
        self.assertEqual(summary["overlays"], 0)
        self.assertTrue(out.is_file())


if __name__ == "__main__":
    unittest.main()
