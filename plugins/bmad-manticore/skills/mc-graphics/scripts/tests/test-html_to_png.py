#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Tests for html_to_png.py: exact-size output, alpha behavior, guides render,
and the window.seek contract. Runs the script via uv (its PEP 723 block
provisions Playwright); skips cleanly when Chromium is not installed."""
import json
import shutil
import struct
import subprocess
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / "html_to_png.py"

FIXTURE = """<!doctype html><html><head><style>
html,body{margin:0;background:transparent}
#chip{position:absolute;left:10px;top:10px;width:80px;height:40px;background:#4f8cff}
</style></head><body><div id="chip"></div>
<script>window.seek=f=>{document.getElementById('chip').textContent=String(f)};</script>
</body></html>"""

NO_SEEK_FIXTURE = "<!doctype html><html><body><p>static</p></body></html>"


def run(args):
    r = subprocess.run(["uv", "run", str(SCRIPT), *args], capture_output=True, text=True)
    out = json.loads(r.stdout) if r.stdout.strip().startswith("{") else None
    return r, out


def png_size(path: Path):
    head = path.read_bytes()[:24]
    assert head[:8] == b"\x89PNG\r\n\x1a\n"
    return struct.unpack(">II", head[16:24])


def chromium_available() -> bool:
    if shutil.which("uv") is None:
        return False
    with tempfile.TemporaryDirectory() as tmp:
        page = Path(tmp) / "p.html"
        page.write_text(NO_SEEK_FIXTURE)
        r, _ = run([str(page), "--out", str(Path(tmp) / "p.png"),
                    "--width", "50", "--height", "50"])
        return r.returncode == 0


HAVE_CHROMIUM = chromium_available()


@unittest.skipUnless(HAVE_CHROMIUM, "uv or Playwright Chromium not available "
                                    "(uv run html_to_png.py --install-chromium)")
class TestHtmlToPng(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.root = Path(cls.tmp.name)
        cls.page = cls.root / "fixture.html"
        cls.page.write_text(FIXTURE)
        cls.static = cls.root / "static.html"
        cls.static.write_text(NO_SEEK_FIXTURE)

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_exact_size_and_alpha(self):
        out = self.root / "a.png"
        r, res = run([str(self.page), "--out", str(out), "--width", "200",
                      "--height", "100", "--verify-alpha"])
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(png_size(out), (200, 100))
        self.assertEqual(res["alpha"]["minAlpha"], 0)
        self.assertGreater(res["alpha"]["transparentFraction"], 0.5)
        self.assertTrue(Path(res["checker"]).is_file())

    def test_scale_multiplies_pixel_dimensions(self):
        out = self.root / "b.png"
        r, _ = run([str(self.page), "--out", str(out), "--width", "200",
                    "--height", "100", "--scale", "2"])
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(png_size(out), (400, 200))

    def test_no_transparent_gives_opaque_page(self):
        out = self.root / "c.png"
        r, res = run([str(self.page), "--out", str(out), "--width", "120",
                      "--height", "80", "--no-transparent", "--verify-alpha"])
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(res["alpha"]["transparentPixels"], 0)

    def test_guides_render_is_a_separate_file(self):
        out = self.root / "d.png"
        guides = self.root / "d_guides.png"
        r, res = run([str(self.page), "--out", str(out), "--width", "200",
                      "--height", "100", "--guides", str(guides)])
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertTrue(guides.is_file())
        self.assertEqual(png_size(guides), (200, 100))
        # guides never contaminate the deliverable
        self.assertNotEqual(out.read_bytes(), guides.read_bytes())

    def test_seek_calls_window_seek(self):
        out = self.root / "e.png"
        r, res = run([str(self.page), "--out", str(out), "--width", "200",
                      "--height", "100", "--seek", "12"])
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(res["seek"], 12)

    def test_seek_without_window_seek_fails(self):
        out = self.root / "f.png"
        r, _ = run([str(self.static), "--out", str(out), "--width", "100",
                    "--height", "100", "--seek", "3"])
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("window.seek", r.stderr)

    def test_missing_input_fails(self):
        r, _ = run([str(self.root / "nope.html"), "--out", str(self.root / "g.png"),
                    "--width", "10", "--height", "10"])
        self.assertNotEqual(r.returncode, 0)


if __name__ == "__main__":
    unittest.main()
