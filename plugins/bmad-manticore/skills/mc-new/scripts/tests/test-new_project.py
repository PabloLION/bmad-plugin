#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Tests for new_project.py: scaffolding must always yield a project.json
that satisfies the pipeline contract (skills/mc-pipeline/PIPELINE.md)."""
import datetime
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / "new_project.py"

PROFILE = """---
stages: [new, braindump, outline, script, record, cut, beats, graphics, assets, package, final, retro]
---

# Talking head
"""

VOD_PROFILE = """---
stages: [new, cut, beats, graphics, assets, package, final, retro]
---

# Livestream VOD
"""

SUBDIRS = ["raw", "transcript", "cut", "beats", "graphics", "assets", "packaging", "renders"]


def run(args, expect_ok=True):
    r = subprocess.run([sys.executable, str(SCRIPT), *args], capture_output=True, text=True)
    if expect_ok:
        assert r.returncode == 0, f"new_project failed: {r.stderr}\n{r.stdout}"
    return r


class TestNewProject(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        root = Path(self._tmp.name)
        self.projects = root / "projects"
        self.formats = root / "formats"
        self.projects.mkdir()
        self.formats.mkdir()
        (self.formats / "talking-head.md").write_text(PROFILE)
        (self.formats / "livestream-vod.md").write_text(VOD_PROFILE)

    def tearDown(self):
        self._tmp.cleanup()

    def _new(self, slug="demo-video", fmt="talking-head", extra=None, expect_ok=True):
        args = [slug, "--format", fmt,
                "--projects-dir", str(self.projects), "--formats-dir", str(self.formats)]
        return run(args + (extra or []), expect_ok=expect_ok)

    def _state(self, *parts):
        return json.loads((self.projects.joinpath(*parts) / "project.json").read_text())

    def _footage(self, name="My Stream_2026.mp4"):
        f = Path(self._tmp.name) / name
        f.write_bytes(b"\x00fake footage")
        return f

    def test_project_json_matches_contract(self):
        self._new(extra=["--title", "Demo Video"])
        state = self._state("demo-video")
        self.assertEqual(state["slug"], "demo-video")
        self.assertEqual(state["title"], "Demo Video")
        self.assertEqual(state["format"], "talking-head")
        self.assertEqual(state["created"], datetime.date.today().isoformat())
        self.assertIsNone(state["parent"])
        self.assertIsNone(state["series"])
        self.assertIsNone(state["deadline"])
        self.assertNotIn("sources", state)
        self.assertEqual(state["stages"][0], "new")
        self.assertEqual(state["stage"], "braindump")
        self.assertEqual(state["stages_done"], ["new"])
        self.assertIn(state["stage"], state["stages"])
        self.assertTrue(set(state["stages_done"]) <= set(state["stages"]))
        self.assertEqual(state["approvals"],
                         {"outline": None, "cutplan": None, "beats": None, "final": None})
        self.assertEqual(state["artifacts"], {})

    def test_creates_subdirs_and_brief(self):
        self._new()
        proj = self.projects / "demo-video"
        for sub in SUBDIRS:
            self.assertTrue((proj / sub).is_dir(), f"missing subfolder {sub}")
        self.assertIn("# Brief:", (proj / "brief.md").read_text())

    def test_stages_copied_from_profile_not_master_list(self):
        (self.formats / "short.md").write_text("---\nstages: [new, cut, final]\n---\n")
        self._new(slug="a-short", fmt="short")
        state = self._state("a-short")
        self.assertEqual(state["stages"], ["new", "cut", "final"])
        self.assertEqual(state["stage"], "cut")

    def test_parent_recorded_for_shorts(self):
        self._new(extra=["--parent", "long-form-parent"])
        state = self._state("demo-video")
        self.assertEqual(state["parent"], "long-form-parent")

    def test_missing_profile_lists_available(self):
        r = self._new(fmt="nope", expect_ok=False)
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("available: livestream-vod, talking-head", r.stderr)

    def test_empty_formats_dir_points_to_setup(self):
        (self.formats / "talking-head.md").unlink()
        (self.formats / "livestream-vod.md").unlink()
        r = self._new(fmt="talking-head", expect_ok=False)
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("mc-setup", r.stderr)

    def test_profile_without_stages_line_fails(self):
        (self.formats / "broken.md").write_text("# No frontmatter here\n")
        r = self._new(fmt="broken", expect_ok=False)
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("stages", r.stderr)

    def test_profile_not_starting_with_new_fails(self):
        (self.formats / "skipper.md").write_text("---\nstages: [cut, final]\n---\n")
        r = self._new(fmt="skipper", expect_ok=False)
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("must start with 'new'", r.stderr)

    def test_rejects_non_kebab_slug(self):
        for bad in ["Bad_Slug", "has space", "-leading", "UPPER"]:
            r = self._new(slug=bad, expect_ok=False)
            self.assertNotEqual(r.returncode, 0, f"slug {bad!r} was accepted")
            if not bad.startswith("-"):  # argparse rejects leading-dash slugs itself
                self.assertIn("kebab-case", r.stderr)

    def test_rejects_existing_project(self):
        self._new()
        r = self._new(expect_ok=False)
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("already exists", r.stderr)

    # Footage-first (ingest) mode

    def test_ingest_registers_source_and_post_stages(self):
        footage = self._footage()
        self._new(slug="vod-episode", fmt="livestream-vod", extra=["--ingest", str(footage)])
        state = self._state("vod-episode")
        self.assertEqual(state["stages"],
                         ["new", "cut", "beats", "graphics", "assets", "package", "final", "retro"])
        self.assertEqual(state["stage"], "cut")
        self.assertEqual(state["stages_done"], ["new"])
        self.assertEqual(state["sources"], [{
            "id": "my-stream-2026",
            "file": str(footage),
            "role": "primary",
            "cfr": None,
        }])
        self.assertIn("Source footage:", (self.projects / "vod-episode" / "brief.md").read_text())

    def test_ingest_custom_source_id_and_role(self):
        footage = self._footage("talk.mov")
        self._new(slug="conf-talk", fmt="livestream-vod",
                  extra=["--ingest", str(footage), "--source-id", "stage-cam",
                         "--source-role", "screen"])
        src = self._state("conf-talk")["sources"][0]
        self.assertEqual(src["id"], "stage-cam")
        self.assertEqual(src["role"], "screen")

    def test_ingest_missing_file_fails(self):
        r = self._new(slug="vod-episode", fmt="livestream-vod",
                      extra=["--ingest", str(Path(self._tmp.name) / "nope.mp4")],
                      expect_ok=False)
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("not found", r.stderr)
        self.assertFalse((self.projects / "vod-episode").exists())

    def test_ingest_rejects_ideation_profile(self):
        footage = self._footage()
        r = self._new(fmt="talking-head", extra=["--ingest", str(footage)], expect_ok=False)
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("footage-first", r.stderr)
        self.assertIn("ideation", r.stderr)

    def test_source_flags_require_ingest(self):
        for extra in (["--source-id", "cam"], ["--source-role", "screen"]):
            r = self._new(extra=extra, expect_ok=False)
            self.assertNotEqual(r.returncode, 0)
            self.assertIn("--ingest", r.stderr)

    # Series mode

    def test_series_folder_convention(self):
        self._new(slug="episode-one", extra=["--series", "my-show"])
        series_dir = self.projects / "my-show"
        self.assertTrue((series_dir / "common").is_dir())
        self.assertTrue((series_dir / "episode-one" / "project.json").is_file())
        state = self._state("my-show", "episode-one")
        self.assertEqual(state["series"], "my-show")
        self.assertEqual(state["slug"], "episode-one")

    def test_series_second_episode_reuses_folder(self):
        self._new(slug="episode-one", extra=["--series", "my-show"])
        self._new(slug="episode-two", extra=["--series", "my-show"])
        self.assertTrue((self.projects / "my-show" / "episode-two" / "project.json").is_file())

    def test_series_rejects_duplicate_episode(self):
        self._new(slug="episode-one", extra=["--series", "my-show"])
        r = self._new(slug="episode-one", extra=["--series", "my-show"], expect_ok=False)
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("already exists", r.stderr)

    def test_series_rejects_non_kebab(self):
        r = self._new(extra=["--series", "My Show"], expect_ok=False)
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("kebab-case", r.stderr)

    def test_same_slug_allowed_in_different_series(self):
        self._new(slug="pilot", extra=["--series", "show-a"])
        self._new(slug="pilot", extra=["--series", "show-b"])
        self.assertTrue((self.projects / "show-b" / "pilot" / "project.json").is_file())

    # Deadline mode

    def test_deadline_recorded(self):
        self._new(extra=["--deadline", "2026-09-15"])
        state = self._state("demo-video")
        self.assertEqual(state["deadline"], "2026-09-15")
        self.assertIn("Deadline: 2026-09-15", (self.projects / "demo-video" / "brief.md").read_text())

    def test_invalid_deadline_fails(self):
        for bad in ["next-friday", "2026-13-01", "09/15/2026"]:
            r = self._new(extra=["--deadline", bad], expect_ok=False)
            self.assertNotEqual(r.returncode, 0, f"deadline {bad!r} was accepted")
            self.assertIn("ISO date", r.stderr)

    # Combined modes

    def test_ingest_series_deadline_together(self):
        footage = self._footage("vod.mp4")
        self._new(slug="episode-three", fmt="livestream-vod",
                  extra=["--ingest", str(footage), "--series", "my-show",
                         "--deadline", "2026-08-01"])
        state = self._state("my-show", "episode-three")
        self.assertEqual(state["series"], "my-show")
        self.assertEqual(state["deadline"], "2026-08-01")
        self.assertEqual(state["sources"][0]["id"], "vod")
        self.assertEqual(state["stage"], "cut")


if __name__ == "__main__":
    unittest.main()
