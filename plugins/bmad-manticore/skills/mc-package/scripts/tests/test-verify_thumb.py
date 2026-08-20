#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Tests for verify_thumb.py: the pure spec checks (evaluate), the proof-image
CLI flow against ffmpeg-synthesized images, and the documented exit codes
(0 pass, 1 spec failure with proof still written, 2 usage/environment error)."""
import importlib.util
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / "verify_thumb.py"

spec = importlib.util.spec_from_file_location("verify_thumb", SCRIPT)
vt = importlib.util.module_from_spec(spec)
spec.loader.exec_module(vt)

HAVE_FFMPEG = shutil.which("ffmpeg") is not None and shutil.which("ffprobe") is not None


def synth(tmp: str, name: str, size: str) -> Path:
    """Synthesize a solid-color PNG of the given WxH via ffmpeg."""
    out = Path(tmp) / name
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", f"color=c=red:s={size}",
         "-frames:v", "1", str(out)],
        check=True, capture_output=True,
    )
    return out


def probe_width(image: Path) -> int:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=width", "-of", "json", str(image)],
        check=True, capture_output=True, text=True,
    )
    return int(json.loads(result.stdout)["streams"][0]["width"])


def run(args: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run([sys.executable, str(SCRIPT), *args], capture_output=True, text=True)


class TestEvaluate(unittest.TestCase):
    def test_full_spec_passes(self):
        r = vt.evaluate(1280, 720, 500_000)
        self.assertTrue(r["min_resolution_ok"] and r["aspect_ok"] and r["size_ok"])

    def test_low_resolution_fails(self):
        r = vt.evaluate(640, 360, 100_000)
        self.assertFalse(r["min_resolution_ok"])
        self.assertTrue(r["aspect_ok"])

    def test_wrong_aspect_fails(self):
        r = vt.evaluate(1440, 1440, 100_000)
        self.assertFalse(r["aspect_ok"])

    def test_aspect_within_tolerance_passes(self):
        # 1280x722 is within 2 percent of 16:9.
        self.assertTrue(vt.evaluate(1280, 722, 100_000)["aspect_ok"])

    def test_oversize_file_fails(self):
        r = vt.evaluate(1920, 1080, vt.MAX_BYTES + 1)
        self.assertFalse(r["size_ok"])
        self.assertTrue(vt.evaluate(1920, 1080, vt.MAX_BYTES)["size_ok"])


@unittest.skipUnless(HAVE_FFMPEG, "ffmpeg/ffprobe required")
class TestCli(unittest.TestCase):
    def test_good_thumbnail_exits_0_and_writes_proof(self):
        with tempfile.TemporaryDirectory() as tmp:
            image = synth(tmp, "thumb.png", "1280x720")
            out_dir = Path(tmp) / "work"
            r = run([str(image), "--out-dir", str(out_dir)])
            self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
            report = json.loads(r.stdout)
            proof = Path(report["proof"])
            self.assertEqual(proof, out_dir / "thumb.120px.png")
            self.assertTrue(proof.exists())
            self.assertEqual(probe_width(proof), 120)
            self.assertTrue(report["min_resolution_ok"] and report["aspect_ok"] and report["size_ok"])

    def test_custom_width_proof(self):
        with tempfile.TemporaryDirectory() as tmp:
            image = synth(tmp, "thumb.png", "1920x1080")
            out_dir = Path(tmp) / "work"
            r = run([str(image), "--out-dir", str(out_dir), "--width", "240"])
            self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
            proof = Path(json.loads(r.stdout)["proof"])
            self.assertEqual(proof.name, "thumb.240px.png")
            self.assertEqual(probe_width(proof), 240)

    def test_bad_specs_exit_1_but_proof_still_written(self):
        with tempfile.TemporaryDirectory() as tmp:
            image = synth(tmp, "square.png", "500x500")
            out_dir = Path(tmp) / "work"
            r = run([str(image), "--out-dir", str(out_dir)])
            self.assertEqual(r.returncode, 1, r.stdout + r.stderr)
            report = json.loads(r.stdout)
            self.assertFalse(report["min_resolution_ok"])
            self.assertFalse(report["aspect_ok"])
            self.assertTrue(Path(report["proof"]).exists())

    def test_missing_image_exits_2(self):
        with tempfile.TemporaryDirectory() as tmp:
            r = run([str(Path(tmp) / "absent.png"), "--out-dir", tmp])
            self.assertEqual(r.returncode, 2, r.stdout + r.stderr)
            self.assertIn("not found", r.stderr)

    def test_unreadable_image_exits_2(self):
        with tempfile.TemporaryDirectory() as tmp:
            bogus = Path(tmp) / "bogus.png"
            bogus.write_bytes(b"not an image at all")
            r = run([str(bogus), "--out-dir", tmp])
            self.assertEqual(r.returncode, 2, r.stdout + r.stderr)

    def test_bad_width_exits_2(self):
        with tempfile.TemporaryDirectory() as tmp:
            image = synth(tmp, "thumb.png", "1280x720")
            r = run([str(image), "--out-dir", tmp, "--width", "0"])
            self.assertEqual(r.returncode, 2, r.stdout + r.stderr)


if __name__ == "__main__":
    unittest.main()
