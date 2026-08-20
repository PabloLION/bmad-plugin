#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Tests for render_verify.py against synthetic ffmpeg fixtures: the verifier
must probe correctly, honor explicit and meta.json expectations, extract
frames (checkerboarded for alpha), and fail loudly on mismatches."""
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / "render_verify.py"
HAVE_FFMPEG = shutil.which("ffmpeg") is not None and shutil.which("ffprobe") is not None


def run(args):
    r = subprocess.run([sys.executable, str(SCRIPT), *args], capture_output=True, text=True)
    out = None
    if r.stdout.strip():
        out = json.loads(r.stdout)
    return r, out


def make_fixture(out: Path, *, codec_args, color="red@0.5", size="320x180", rate=30, dur=2,
                 pixel="rgba"):
    cmd = ["ffmpeg", "-y", "-v", "error", "-f", "lavfi",
           "-i", f"color=c={color}:s={size}:r={rate}:d={dur},format={pixel}",
           *codec_args, str(out)]
    subprocess.run(cmd, check=True, capture_output=True)


@unittest.skipUnless(HAVE_FFMPEG, "ffmpeg/ffprobe not on PATH")
class TestRenderVerify(unittest.TestCase):
    tmp: tempfile.TemporaryDirectory

    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        root = Path(cls.tmp.name)
        cls.prores = root / "prores.mov"
        make_fixture(cls.prores, codec_args=["-c:v", "prores_ks", "-profile:v", "4444",
                                             "-pix_fmt", "yuva444p10le"])
        cls.vp9 = root / "vp9.webm"
        make_fixture(cls.vp9, color="lime@0.5", dur=1,
                     codec_args=["-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p",
                                 "-b:v", "100k", "-deadline", "realtime", "-cpu-used", "8"])
        cls.opaque = root / "opaque.mp4"
        make_fixture(cls.opaque, color="blue", rate=25, pixel="yuv420p",
                     codec_args=["-c:v", "libx264", "-pix_fmt", "yuv420p"])

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def _out_dir(self):
        d = tempfile.mkdtemp(dir=self.tmp.name)
        return Path(d) / "_verify"

    def test_prores_all_checks_pass(self):
        r, out = run([str(self.prores), "--pixfmt", "prores4444",
                      "--expect-res", "320x180", "--expect-fps", "30",
                      "--expect-dur", "2", "--out-dir", str(self._out_dir())])
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertTrue(out["ok"])
        self.assertTrue(all(c["pass"] for c in out["checks"].values()))
        self.assertTrue(out["probe"]["alpha"])
        self.assertTrue(out["checkerboard"])

    def test_checkerboard_frames_contain_the_graphic(self):
        # The fixture is half-transparent red over the full frame, so every
        # extracted checkerboard frame must be visibly red, not a bare board
        # (regression: seek+overlay in one command emitted board-only frames).
        d = self._out_dir()
        r, out = run([str(self.prores), "--frames", "2", "--out-dir", str(d)])
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        for f in out["frames"]:
            px = subprocess.run(
                ["ffmpeg", "-v", "error", "-i", f, "-vf", "crop=1:1:160:90",
                 "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                capture_output=True, check=True).stdout
            rr, gg, bb = px[0], px[1], px[2]
            self.assertGreater(rr, gg + 60,
                               f"{f}: expected red-tinted composite, got rgb({rr},{gg},{bb})")

    def test_extracts_requested_frame_count(self):
        d = self._out_dir()
        r, out = run([str(self.prores), "--frames", "3", "--out-dir", str(d)])
        self.assertEqual(r.returncode, 0)
        self.assertEqual(len(out["frames"]), 3)
        for f in out["frames"]:
            self.assertTrue(Path(f).is_file(), f"missing extracted frame {f}")

    def test_resolution_mismatch_fails(self):
        r, out = run([str(self.prores), "--expect-res", "1920x1080",
                      "--out-dir", str(self._out_dir())])
        self.assertNotEqual(r.returncode, 0)
        self.assertFalse(out["ok"])
        self.assertFalse(out["checks"]["res"]["pass"])

    def test_duration_mismatch_fails(self):
        r, out = run([str(self.prores), "--expect-dur", "5",
                      "--out-dir", str(self._out_dir())])
        self.assertNotEqual(r.returncode, 0)
        self.assertFalse(out["checks"]["dur"]["pass"])

    def test_pixfmt_mismatch_fails(self):
        r, out = run([str(self.opaque), "--pixfmt", "prores4444",
                      "--out-dir", str(self._out_dir())])
        self.assertNotEqual(r.returncode, 0)
        self.assertFalse(out["checks"]["pixfmt"]["pass"])

    def test_vp9_webm_alpha_mode_counts_as_yuva420p(self):
        # libvpx-vp9 alpha in WebM probes as yuv420p + alpha_mode tag
        r, out = run([str(self.vp9), "--pixfmt", "yuva420p", "--expect-dur", "1",
                      "--out-dir", str(self._out_dir())])
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertTrue(out["probe"]["alpha"])
        self.assertTrue(out["checks"]["pixfmt"]["pass"])

    def test_opaque_file_skips_checkerboard(self):
        r, out = run([str(self.opaque), "--out-dir", str(self._out_dir())])
        self.assertEqual(r.returncode, 0)
        self.assertFalse(out["probe"]["alpha"])
        self.assertFalse(out["checkerboard"])

    def test_checker_flag_forces_checkerboard(self):
        r, out = run([str(self.opaque), "--checker", "--out-dir", str(self._out_dir())])
        self.assertEqual(r.returncode, 0)
        self.assertTrue(out["checkerboard"])

    def test_meta_json_contract(self):
        meta = Path(self.tmp.name) / "meta.json"
        meta.write_text(json.dumps({"pixfmt": "prores4444", "res": "320x180",
                                    "fps": 30, "dur": 2}))
        r, out = run([str(self.prores), "--meta", str(meta),
                      "--out-dir", str(self._out_dir())])
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertEqual(set(out["checks"]), {"pixfmt", "res", "fps", "dur"})
        self.assertTrue(out["ok"])

    def test_explicit_flag_overrides_meta(self):
        meta = Path(self.tmp.name) / "meta-wrong.json"
        meta.write_text(json.dumps({"res": "1920x1080"}))
        r, out = run([str(self.prores), "--meta", str(meta),
                      "--expect-res", "320x180", "--out-dir", str(self._out_dir())])
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertTrue(out["checks"]["res"]["pass"])

    def test_missing_input_is_hard_error(self):
        r, out = run(["/nonexistent/render.mov"])
        self.assertEqual(r.returncode, 2)
        self.assertFalse(out["ok"])
        self.assertIn("error", out)

    def test_json_output_parses_on_failure(self):
        r, out = run([str(self.prores), "--expect-fps", "60",
                      "--out-dir", str(self._out_dir())])
        self.assertNotEqual(r.returncode, 0)
        self.assertIsInstance(out, dict)  # json.loads already succeeded in run()


if __name__ == "__main__":
    unittest.main()
