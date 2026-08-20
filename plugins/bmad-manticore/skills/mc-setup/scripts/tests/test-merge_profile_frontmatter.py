#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Tests for merge_profile_frontmatter.py: missing keys merged with shipped
formatting preserved, existing keys and the body never touched, idempotent
re-runs, and the no-frontmatter error path. Runs the script via uv so its
pyyaml dependency resolves."""
import json
import subprocess
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / "merge_profile_frontmatter.py"

SHIPPED = """---
format: talking-head
stages: [new, braindump, outline, script, record, cut, beats, graphics, assets, package, final, retro]
engine_overlays: hyperframes
generated_broll: allowed
beat-types: [popup, diagram, lower-third, stat-card, cta]
density:
  high: "10-20s"
  medium: "20-45s"
  low: "45-90s"
  note: "Seconds per graphic beat. Front-loaded."
---

# Format: talking-head

Shipped prose that must never reach the studio copy.
"""

STUDIO = """---
format: talking-head
stages: [new, braindump, outline, script, record, cut, beats, graphics, assets, package, final, retro]
engine_overlays: remotion
generated_broll: banned
---

# Format: talking-head

The creator's own prose.

## Learnings

- 2026-07-06: the creator's hard-won learning stays put.
"""


def run(shipped: Path, studio: Path, *extra: str):
    return subprocess.run(
        ["uv", "run", str(SCRIPT), "--shipped", str(shipped),
         "--studio", str(studio), *extra],
        capture_output=True, text=True)


class TestMerge(unittest.TestCase):
    def setUp(self):
        self.td = tempfile.TemporaryDirectory()
        root = Path(self.td.name)
        self.shipped = root / "shipped.md"
        self.studio = root / "studio.md"
        self.shipped.write_text(SHIPPED)
        self.studio.write_text(STUDIO)

    def tearDown(self):
        self.td.cleanup()

    def test_missing_keys_merged_existing_and_body_untouched(self):
        r = run(self.shipped, self.studio)
        self.assertEqual(r.returncode, 0, r.stderr)
        info = json.loads(r.stdout)
        self.assertEqual(info["added"], ["beat-types", "density"])
        merged = self.studio.read_text()
        self.assertIn("beat-types: [popup, diagram, lower-third, stat-card, cta]", merged)
        self.assertIn('medium: "20-45s"', merged)
        self.assertIn("engine_overlays: remotion", merged)      # studio value wins
        self.assertIn("generated_broll: banned", merged)        # studio value wins
        self.assertNotIn("Shipped prose", merged)
        self.assertIn("the creator's hard-won learning stays put", merged)
        body = merged.split("\n---\n", 1)[1]
        self.assertEqual(body, STUDIO.split("\n---\n", 1)[1])   # body byte-identical

    def test_second_run_adds_nothing(self):
        run(self.shipped, self.studio)
        first = self.studio.read_text()
        r = run(self.shipped, self.studio)
        self.assertEqual(json.loads(r.stdout)["added"], [])
        self.assertEqual(self.studio.read_text(), first)

    def test_dry_run_writes_nothing(self):
        r = run(self.shipped, self.studio, "--dry-run")
        info = json.loads(r.stdout)
        self.assertEqual(info["added"], ["beat-types", "density"])
        self.assertTrue(info["dry_run"])
        self.assertEqual(self.studio.read_text(), STUDIO)

    def test_no_frontmatter_errors(self):
        self.studio.write_text("# Just a body\n")
        r = run(self.shipped, self.studio)
        self.assertEqual(r.returncode, 1)
        self.assertIn("no frontmatter", r.stderr)


if __name__ == "__main__":
    unittest.main()
