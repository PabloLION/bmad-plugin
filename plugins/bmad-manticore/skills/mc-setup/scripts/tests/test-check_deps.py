#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Tests for check_deps.py: --json output shape and exit-code contract.

PATH-dependent results are not asserted per-dep; the tests pin the shape and
the ok/exit-code relationship, which hold on any machine."""
import json
import subprocess
import sys
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / "check_deps.py"


def run(args):
    return subprocess.run([sys.executable, str(SCRIPT), *args], capture_output=True, text=True)


class TestCheckDeps(unittest.TestCase):
    def test_json_output_shape(self):
        proc = run(["--json"])
        data = json.loads(proc.stdout)
        self.assertIn("ok", data)
        self.assertIsInstance(data["results"], list)
        deps = {r["dep"] for r in data["results"]}
        self.assertIn("uv", deps)
        self.assertIn("ffmpeg", deps)
        for r in data["results"]:
            self.assertEqual({"dep", "required", "found", "detail"}, set(r))

    def test_exit_code_matches_ok(self):
        proc = run(["--json"])
        data = json.loads(proc.stdout)
        self.assertEqual(proc.returncode, 0 if data["ok"] else 1)

    def test_table_output_runs(self):
        proc = run([])
        self.assertIn("uv", proc.stdout)
        self.assertIn(proc.returncode, (0, 1))

    def test_platform_gate_row(self):
        proc = run(["--json"])
        data = json.loads(proc.stdout)
        rows = [r for r in data["results"] if r["dep"] == "apple-silicon"]
        self.assertEqual(len(rows), 1)
        row = rows[0]
        self.assertFalse(row["required"])  # informational; never fails the check
        self.assertIn("parakeet-mlx", row["detail"])
        if not row["found"]:
            self.assertIn("whisper", row["detail"])


if __name__ == "__main__":
    unittest.main()
