#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Tests for lint_script.py: regex-block parsing, case-insensitive multi-hit
counting, and the documented exit codes (0 clean, 1 violations, 2 usage/config
error).

This script is duplicated into mc-outline and mc-package; keep all three copies
and their tests identical."""
import importlib.util
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / "lint_script.py"

spec = importlib.util.spec_from_file_location("lint_script", SCRIPT)
lint = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lint)

BLACKLIST = """# Blacklist

Prose around the blocks is ignored.

```regex
# comment line, skipped
delve

game.chang\\w+
```

```regex
in today's video
```
"""


def write(tmp: str, name: str, text: str) -> Path:
    p = Path(tmp) / name
    p.write_text(text)
    return p


def run(args: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run([sys.executable, str(SCRIPT), *args], capture_output=True, text=True)


class TestLoadPatterns(unittest.TestCase):
    def test_parses_blocks_skipping_comments_and_blanks(self):
        with tempfile.TemporaryDirectory() as tmp:
            bl = write(tmp, "blacklist.md", BLACKLIST)
            patterns = lint.load_patterns(bl)
            self.assertEqual(
                [p.pattern for p in patterns],
                ["delve", "game.chang\\w+", "in today's video"],
            )

    def test_missing_blacklist_exits_2(self):
        with self.assertRaises(SystemExit) as ctx:
            lint.load_patterns(Path("/nonexistent/blacklist.md"))
        self.assertEqual(ctx.exception.code, 2)

    def test_no_regex_blocks_exits_2(self):
        with tempfile.TemporaryDirectory() as tmp:
            bl = write(tmp, "blacklist.md", "# No fenced regex here\n")
            with self.assertRaises(SystemExit) as ctx:
                lint.load_patterns(bl)
            self.assertEqual(ctx.exception.code, 2)

    def test_bad_pattern_exits_2(self):
        with tempfile.TemporaryDirectory() as tmp:
            bl = write(tmp, "blacklist.md", "```regex\n(unclosed\n```\n")
            with self.assertRaises(SystemExit) as ctx:
                lint.load_patterns(bl)
            self.assertEqual(ctx.exception.code, 2)


class TestCli(unittest.TestCase):
    def test_clean_file_exits_0(self):
        with tempfile.TemporaryDirectory() as tmp:
            bl = write(tmp, "blacklist.md", BLACKLIST)
            target = write(tmp, "script.md", "Plain sentences only.\nNothing banned here.\n")
            r = run([str(target), "--blacklist", str(bl)])
            self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
            self.assertIn("clean", r.stdout)

    def test_violations_exit_1_case_insensitive_multi_hit(self):
        with tempfile.TemporaryDirectory() as tmp:
            bl = write(tmp, "blacklist.md", BLACKLIST)
            target = write(
                tmp, "script.md",
                "Let's Delve in, then delve again.\n"
                "This is a GAME-CHANGING tool.\n",
            )
            r = run([str(target), "--blacklist", str(bl)])
            self.assertEqual(r.returncode, 1, r.stdout + r.stderr)
            # Two case-insensitive hits on line 1, one on line 2.
            self.assertIn("3 violation(s)", r.stdout)
            self.assertIn(":1: delve", r.stdout)
            self.assertIn(":2: game.chang", r.stdout)

    def test_missing_target_exits_2(self):
        with tempfile.TemporaryDirectory() as tmp:
            bl = write(tmp, "blacklist.md", BLACKLIST)
            r = run([str(Path(tmp) / "absent.md"), "--blacklist", str(bl)])
            self.assertEqual(r.returncode, 2, r.stdout + r.stderr)
            self.assertIn("not found", r.stderr)

    def test_missing_blacklist_cli_exits_2(self):
        with tempfile.TemporaryDirectory() as tmp:
            target = write(tmp, "script.md", "hello\n")
            r = run([str(target), "--blacklist", str(Path(tmp) / "absent.md")])
            self.assertEqual(r.returncode, 2, r.stdout + r.stderr)
            self.assertIn("mc-setup", r.stderr)


if __name__ == "__main__":
    unittest.main()
