#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Tests for preflight.py: the pure parts (rate parsing, VFR detection,
standard-rate selection, remux command construction) plus CLI exit codes and
a probe/QC integration pass over a fixture synthesized with an ffmpeg test
source (skipped when ffmpeg is not installed)."""
import importlib.util
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from fractions import Fraction
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SCRIPTS))

spec = importlib.util.spec_from_file_location("preflight",
                                              SCRIPTS / "preflight.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

FFMPEG = shutil.which("ffmpeg") and shutil.which("ffprobe")


class TestParseRate(unittest.TestCase):
    def test_forms(self):
        self.assertEqual(mod.parse_rate("30000/1001"), Fraction(30000, 1001))
        self.assertEqual(mod.parse_rate("30"), Fraction(30))
        self.assertIsNone(mod.parse_rate("0/0"))
        self.assertIsNone(mod.parse_rate(""))
        self.assertIsNone(mod.parse_rate(None))
        self.assertIsNone(mod.parse_rate("garbage"))


class TestIsVfr(unittest.TestCase):
    def test_cfr_matches(self):
        self.assertFalse(mod.is_vfr("30/1", "30/1"))
        self.assertFalse(mod.is_vfr("30000/1001", "30000/1001"))
        # tiny measurement wobble under 0.5% is still CFR
        self.assertFalse(mod.is_vfr("30/1", "2999/100"))

    def test_vfr_disagreement(self):
        self.assertTrue(mod.is_vfr("60/1", "47/1"))
        self.assertTrue(mod.is_vfr("1000/1", "30/1"))  # webcam-style nominal

    def test_unknown_rates_count_as_vfr(self):
        self.assertTrue(mod.is_vfr("0/0", "30/1"))
        self.assertTrue(mod.is_vfr("30/1", None))


class TestNearestStandardRate(unittest.TestCase):
    def test_common_rates(self):
        self.assertEqual(mod.nearest_standard_rate("2997/100"), "30000/1001")
        self.assertEqual(mod.nearest_standard_rate("30/1"), "30/1")
        self.assertEqual(mod.nearest_standard_rate("47/1"), "50/1")
        self.assertEqual(mod.nearest_standard_rate("24/1"), "24/1")
        self.assertEqual(mod.nearest_standard_rate(None), "30/1")


class TestRemuxCommand(unittest.TestCase):
    def test_software_encode(self):
        cmd = mod.remux_command("in.mov", "out.mp4", "30/1", "libx264")
        joined = " ".join(cmd)
        self.assertIn("-vf fps=30/1", joined)
        self.assertIn("-crf 18", joined)
        self.assertIn("-c:a copy", joined)
        self.assertEqual(cmd[-1], "out.mp4")

    def test_hardware_encode_bitrate_follows_source_height(self):
        cmd = mod.remux_command("in.mov", "out.mp4", "30000/1001",
                                "h264_videotoolbox", height=1080)
        joined = " ".join(cmd)
        self.assertIn("h264_videotoolbox", joined)
        self.assertIn("-b:v 24000k", joined)  # 2x the 1080 delivery tier
        self.assertNotIn("-crf", joined)
        cmd_4k = mod.remux_command("in.mov", "out.mp4", "30/1",
                                   "h264_videotoolbox", height=2160)
        self.assertIn("-b:v 80000k", " ".join(cmd_4k))

    def test_hardware_encode_unknown_height_uses_1080_tier(self):
        cmd = mod.remux_command("in.mov", "out.mp4", "30/1",
                                "h264_videotoolbox")
        self.assertIn("-b:v 24000k", " ".join(cmd))


class TestMasterEstimate(unittest.TestCase):
    def test_master_bitrate(self):
        self.assertEqual(mod.master_bitrate_for(1080), 24000)
        self.assertEqual(mod.master_bitrate_for(2160), 80000)
        self.assertEqual(mod.master_bitrate_for(None), 24000)

    def test_estimate_from_duration(self):
        # 93 minutes of 1080p at the 24000 kbps master rate is about 16.7 GB
        est = mod.estimate_master_bytes(93 * 60, 1080, 1)
        self.assertEqual(est, int(93 * 60 * 24000 * 1000 / 8))

    def test_unknown_duration_falls_back_to_source_size(self):
        self.assertEqual(mod.estimate_master_bytes(None, 1080, 5000), 10000)


def run_cli(args):
    return subprocess.run([sys.executable, str(SCRIPTS / "preflight.py"),
                           *args], capture_output=True, text=True)


class TestCli(unittest.TestCase):
    def test_missing_file_exits_1(self):
        r = run_cli(["/nonexistent/take.mov"])
        self.assertEqual(r.returncode, 1)

    def test_no_args_is_usage_error(self):
        r = run_cli([])
        self.assertEqual(r.returncode, 2)


@unittest.skipUnless(FFMPEG, "ffmpeg/ffprobe not installed")
class TestIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.src = Path(cls.tmp.name) / "take.mp4"
        r = subprocess.run(
            ["ffmpeg", "-y", "-f", "lavfi", "-t", "2", "-i",
             "testsrc2=size=320x180:rate=30",
             "-c:v", "libx264", "-preset", "ultrafast", "-crf", "30",
             "-pix_fmt", "yuv420p", str(cls.src)],
            capture_output=True, text=True)
        assert r.returncode == 0, r.stderr

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_probe_qc_and_disk(self):
        qc = Path(self.tmp.name) / "qc"
        r = run_cli([str(self.src), "--qc-frames", str(qc)])
        self.assertEqual(r.returncode, 0, r.stderr)
        summary = json.loads(r.stdout)
        f = summary["files"][0]
        self.assertEqual(f["width"], 320)
        self.assertEqual(f["height"], 180)
        self.assertFalse(f["vfr"])
        self.assertIsNone(f["cfr_master"])
        self.assertAlmostEqual(f["duration"], 2.0, delta=0.2)
        self.assertAlmostEqual(f["fps"], 30.0, delta=0.1)
        self.assertEqual(len(f["qc_frames"]), 2)
        for frame in f["qc_frames"]:
            self.assertTrue(Path(frame).is_file())
        self.assertTrue(summary["all_cfr"])
        self.assertIn("free_bytes", summary["disk"])

    def test_disk_gate_refuses_remux_before_any_write(self):
        """When the disk estimate does not fit, a planned remux must be
        refused BEFORE ffmpeg writes anything (runaway-write hardening)."""
        import contextlib
        import io
        real_is_vfr = mod.is_vfr
        real_check_disk = mod.core.check_disk
        mod.is_vfr = lambda *a, **k: True          # force a remux plan
        mod.core.check_disk = lambda *a, **k: (False, 0)  # force a full disk
        out, err = io.StringIO(), io.StringIO()
        try:
            with contextlib.redirect_stdout(out), \
                    contextlib.redirect_stderr(err):
                rc = mod.main([str(self.src), "--remux"])
        finally:
            mod.is_vfr = real_is_vfr
            mod.core.check_disk = real_check_disk
        self.assertEqual(rc, 1)
        self.assertIn("insufficient disk space", err.getvalue())
        summary = json.loads(out.getvalue())
        self.assertFalse(summary["disk"]["ok"])
        self.assertFalse(summary["all_cfr"])
        self.assertIsNone(summary["files"][0]["cfr_master"])
        cfr = self.src.with_name(self.src.stem + "-cfr.mp4")
        self.assertFalse(cfr.exists(), "remux output written despite refusal")

    def test_low_disk_without_remux_reports_and_exits_0(self):
        """A CFR-only pass on a tight disk still exits 0; the caller reads
        disk.ok false and stops before rendering."""
        import contextlib
        import io
        real_check_disk = mod.core.check_disk
        mod.core.check_disk = lambda *a, **k: (False, 0)
        out = io.StringIO()
        try:
            with contextlib.redirect_stdout(out):
                rc = mod.main([str(self.src)])
        finally:
            mod.core.check_disk = real_check_disk
        self.assertEqual(rc, 0)
        summary = json.loads(out.getvalue())
        self.assertFalse(summary["disk"]["ok"])
        self.assertTrue(summary["all_cfr"])


if __name__ == "__main__":
    unittest.main()
