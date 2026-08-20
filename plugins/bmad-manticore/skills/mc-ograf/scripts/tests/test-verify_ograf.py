#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Tests for verify_ograf.py — the deterministic, browser-free parts: manifest
discovery, usage/structure errors, and the graceful no-headless fallback.

The full headless render check requires Playwright + a browser and is exercised
by running the script directly on a package; it is not unit-tested here."""
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / "verify_ograf.py"

spec = importlib.util.spec_from_file_location("verify_ograf", SCRIPT)
verify = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verify)


def make_pkg(tmp, *, with_main=True):
    pkg = Path(tmp) / "pkg"
    pkg.mkdir()
    (pkg / "g.ograf.json").write_text(json.dumps({
        "id": "g", "name": "G", "main": "g.mjs",
        "supportsNonRealTime": True, "schema": {"type": "object", "properties": {}},
    }))
    if with_main:
        (pkg / "g.mjs").write_text(
            "class G extends HTMLElement{\n"
            "  constructor(){super();this.attachShadow({mode:'open'});}\n"
            "  async load(){this.shadowRoot.innerHTML="
            "\"<div style='position:absolute;inset:0'>x</div>\";return undefined;}\n"
            "  async goToTime(){return undefined;}\n"
            "  async dispose(){return undefined;}\n"
            "  async updateAction(){return undefined;}\n"
            "  async playAction(){return {currentStep:1};}\n"
            "  async stopAction(){return undefined;}\n"
            "  async customAction(){return undefined;}\n"
            "  async setActionsSchedule(){return undefined;}\n"
            "}\nexport default G;\n")
    return pkg


def run(args):
    return subprocess.run([sys.executable, str(SCRIPT), *args], capture_output=True, text=True)


class TestVerifyHelpers(unittest.TestCase):
    def test_find_manifest_returns_the_manifest(self):
        with tempfile.TemporaryDirectory() as tmp:
            pkg = make_pkg(tmp)
            self.assertEqual(verify.find_manifest(pkg).name, "g.ograf.json")

    def test_find_manifest_exits_when_absent(self):
        with tempfile.TemporaryDirectory() as tmp:
            empty = Path(tmp) / "empty"
            empty.mkdir()
            with self.assertRaises(SystemExit):
                verify.find_manifest(empty)


class TestVerifyCli(unittest.TestCase):
    def test_missing_main_fails_usage(self):
        with tempfile.TemporaryDirectory() as tmp:
            pkg = make_pkg(tmp, with_main=False)
            r = run([str(pkg)])
            self.assertEqual(r.returncode, 2)
            self.assertIn("folder", r.stderr.lower() + r.stdout.lower())

    def test_not_a_directory(self):
        r = run(["/nonexistent/path/xyz"])
        self.assertEqual(r.returncode, 2)

    def test_full_run_is_ok_or_graceful(self):
        # With a valid package: either headless verifies (exit 0) or Playwright is
        # absent and it degrades with manual steps (exit 3). Never crashes (1/2).
        with tempfile.TemporaryDirectory() as tmp:
            pkg = make_pkg(tmp)
            r = run([str(pkg)])
            self.assertIn(r.returncode, (0, 3), f"unexpected: {r.returncode}\n{r.stdout}\n{r.stderr}")
            payload = json.loads(r.stdout)
            self.assertIn("status", payload)


if __name__ == "__main__":
    unittest.main()
