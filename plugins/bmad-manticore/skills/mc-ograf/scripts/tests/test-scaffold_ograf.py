#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Tests for scaffold_ograf.py — the package generator must always emit a
spec-compliant, standards-clean package."""
import json
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / "scaffold_ograf.py"


def run(args, expect_ok=True):
    r = subprocess.run([sys.executable, str(SCRIPT), *args], capture_output=True, text=True)
    if expect_ok:
        assert r.returncode == 0, f"scaffold failed: {r.stderr}\n{r.stdout}"
    return r


class TestScaffold(unittest.TestCase):
    def _build(self, tmp, extra=None):
        args = ["--id", "demo-l3", "--name", "Demo L3", "--dest", tmp,
                "--fields", json.dumps([{"key": "title", "title": "Title", "default": "Hi"},
                                        {"key": "subtitle", "title": "Sub", "default": "there"}])]
        return run(args + (extra or []))

    def test_emits_three_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            self._build(tmp)
            pkg = Path(tmp) / "demo-l3"
            self.assertTrue((pkg / "demo-l3.ograf.json").exists())
            self.assertTrue((pkg / "demo-l3.mjs").exists())
            self.assertTrue((pkg / "preview.html").exists())

    def test_manifest_is_spec_compliant(self):
        with tempfile.TemporaryDirectory() as tmp:
            self._build(tmp)
            m = json.loads((Path(tmp) / "demo-l3" / "demo-l3.ograf.json").read_text())
            self.assertEqual(m["main"], "demo-l3.mjs")
            self.assertTrue(m["supportsNonRealTime"])
            self.assertIn("title", m["schema"]["properties"])
            self.assertEqual(m["schema"]["properties"]["title"]["default"], "Hi")
            # actionDurations key on 'type', never 'id'
            for ad in m["actionDurations"]:
                self.assertIn("type", ad)
                self.assertNotIn("id", ad)

    def test_mjs_never_self_registers(self):
        with tempfile.TemporaryDirectory() as tmp:
            self._build(tmp)
            mjs = (Path(tmp) / "demo-l3" / "demo-l3.mjs").read_text()
            self.assertIn("export default", mjs)
            # the only mention of customElements.define must be a comment, never a call
            for line in mjs.splitlines():
                if "customElements.define" in line:
                    self.assertTrue(line.lstrip().startswith("//"),
                                    f"non-comment customElements.define: {line!r}")

    def test_preview_registers_under_id(self):
        with tempfile.TemporaryDirectory() as tmp:
            self._build(tmp)
            html = (Path(tmp) / "demo-l3" / "preview.html").read_text()
            self.assertIn("demo-l3.mjs", html)
            self.assertIn('customElements.define("demo-l3"', html)

    def test_default_fields_when_none_given(self):
        with tempfile.TemporaryDirectory() as tmp:
            run(["--id", "bare", "--name", "Bare", "--dest", tmp])
            m = json.loads((Path(tmp) / "bare" / "bare.ograf.json").read_text())
            self.assertIn("title", m["schema"]["properties"])

    def test_rejects_id_with_slash(self):
        with tempfile.TemporaryDirectory() as tmp:
            r = run(["--id", "bad/id", "--name", "X", "--dest", tmp], expect_ok=False)
            self.assertNotEqual(r.returncode, 0)

    def test_rejects_field_key_with_dash(self):
        with tempfile.TemporaryDirectory() as tmp:
            r = run(["--id", "ok", "--name", "X", "--dest", tmp,
                     "--field", "bad-key=v"], expect_ok=False)
            self.assertNotEqual(r.returncode, 0)

    def test_warns_on_placeholder_palette(self):
        with tempfile.TemporaryDirectory() as tmp:
            r = self._build(tmp)
            out = json.loads(r.stdout)
            self.assertIn("placeholder_palette", out)
            self.assertIn("accent", out["placeholder_palette"])
            self.assertIn("tokens.json", out["warning"])

    def test_no_warning_when_palette_passed(self):
        with tempfile.TemporaryDirectory() as tmp:
            r = self._build(tmp, extra=["--accent", "#AA2200", "--surface", "#101418",
                                        "--muted", "#8899AA", "--font", "Inter, sans-serif"])
            out = json.loads(r.stdout)
            self.assertNotIn("placeholder_palette", out)
            self.assertNotIn("warning", out)

    def test_no_unfilled_placeholders(self):
        with tempfile.TemporaryDirectory() as tmp:
            self._build(tmp)
            pkg = Path(tmp) / "demo-l3"
            for f in pkg.iterdir():
                self.assertFalse(re.search(r"\{\{[A-Z_]+\}\}", f.read_text()),
                                 f"unfilled placeholder in {f.name}")


if __name__ == "__main__":
    unittest.main()
