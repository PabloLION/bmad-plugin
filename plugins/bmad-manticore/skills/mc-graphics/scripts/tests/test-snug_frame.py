#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Tests for snug_frame.py: native-aspect scaling into a bounding box (never a
uniform letterboxed panel), upscale refusal, and transparent rounded corners.
Uses synthetic ffmpeg image fixtures."""
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / "snug_frame.py"
HAVE_FFMPEG = shutil.which("ffmpeg") is not None and shutil.which("ffprobe") is not None


def run(args):
    r = subprocess.run([sys.executable, str(SCRIPT), *args], capture_output=True, text=True)
    out = json.loads(r.stdout) if r.stdout.strip().startswith("{") else None
    return r, out


def make_photo(path: Path, w: int, h: int, color: str = "orange"):
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi",
                    "-i", f"color=c={color}:s={w}x{h}:d=1", "-frames:v", "1", str(path)],
                   check=True, capture_output=True)


def pixel_rgba(path: Path, x: int, y: int) -> bytes:
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path),
                        "-vf", f"crop=1:1:{x}:{y},format=rgba",
                        "-f", "rawvideo", "-"], check=True, capture_output=True)
    return r.stdout[:4]


@unittest.skipUnless(HAVE_FFMPEG, "ffmpeg/ffprobe not on PATH")
class TestSnugFrame(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.root = Path(cls.tmp.name)
        cls.landscape = cls.root / "landscape.png"   # 4:3
        make_photo(cls.landscape, 400, 300)
        cls.portrait = cls.root / "portrait.png"     # 3:4
        make_photo(cls.portrait, 300, 400, "teal")
        cls.small = cls.root / "small.png"
        make_photo(cls.small, 100, 80, "purple")

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_landscape_hugs_native_aspect(self):
        out = self.root / "l.png"
        r, res = run([str(self.landscape), "--out", str(out), "--max-w", "1200",
                      "--max-h", "800", "--border", "20", "--allow-upscale"])
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        # height edge meets the box, width stays snug: never a uniform panel
        self.assertEqual(res["framed"]["height"], 800)
        self.assertLess(res["framed"]["width"], 1200)
        got = res["content"]["width"] / res["content"]["height"]
        self.assertAlmostEqual(got, 400 / 300, places=2)

    def test_portrait_hugs_native_aspect(self):
        out = self.root / "p.png"
        r, res = run([str(self.portrait), "--out", str(out), "--max-w", "1200",
                      "--max-h", "800", "--border", "20", "--allow-upscale"])
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertEqual(res["framed"]["height"], 800)
        self.assertEqual(res["content"], {"width": 570, "height": 760})

    def test_two_photos_do_not_get_one_uniform_panel(self):
        outs = []
        for src in (self.landscape, self.portrait):
            out = self.root / f"u_{src.stem}.png"
            r, res = run([str(src), "--out", str(out), "--max-w", "1200",
                          "--max-h", "800", "--border", "20", "--allow-upscale"])
            self.assertEqual(r.returncode, 0)
            outs.append((res["framed"]["width"], res["framed"]["height"]))
        self.assertNotEqual(outs[0], outs[1], "same panel size for different aspects")

    def test_refuses_upscale_by_default(self):
        out = self.root / "s.png"
        r, res = run([str(self.small), "--out", str(out), "--max-w", "400",
                      "--max-h", "400", "--border", "10"])
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertEqual(res["scale"], 1.0)
        self.assertEqual(res["framed"], {"width": 120, "height": 100})

    def test_rounded_corners_are_transparent(self):
        out = self.root / "r.png"
        r, res = run([str(self.landscape), "--out", str(out), "--max-w", "440",
                      "--max-h", "340", "--border", "20", "--radius", "24"])
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        corner = pixel_rgba(out, 0, 0)
        self.assertEqual(corner[3], 0, "corner pixel should be alpha 0")
        center = pixel_rgba(out, res["framed"]["width"] // 2, res["framed"]["height"] // 2)
        self.assertEqual(center[3], 255, "center pixel should be opaque")

    def test_border_frames_the_photo(self):
        out = self.root / "b.png"
        r, res = run([str(self.landscape), "--out", str(out), "--max-w", "440",
                      "--max-h", "340", "--border", "20", "--frame-color", "#ffffff"])
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        edge = pixel_rgba(out, 5, res["framed"]["height"] // 2)
        self.assertEqual(edge[:3], b"\xff\xff\xff", "border should be the frame color")

    def test_border_too_big_for_box_fails(self):
        out = self.root / "x.png"
        r, res = run([str(self.small), "--out", str(out), "--max-w", "50",
                      "--max-h", "50", "--border", "30"])
        self.assertNotEqual(r.returncode, 0)
        self.assertFalse(res["ok"])

    def test_missing_input_fails(self):
        r, res = run([str(self.root / "nope.png"), "--out", str(self.root / "n.png"),
                      "--max-w", "100", "--max-h", "100"])
        self.assertNotEqual(r.returncode, 0)
        self.assertFalse(res["ok"])


if __name__ == "__main__":
    unittest.main()
