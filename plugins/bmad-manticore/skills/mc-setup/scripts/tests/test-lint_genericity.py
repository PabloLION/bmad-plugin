#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Tests for lint_genericity.py: brand-term detection with the ecosystem
allowlist, hex-color policy (token files, grayscale, placeholder palette,
tests dirs, svg), machine-path detection, section allowances in README.md,
and the documented exit codes (0 clean, 1 findings, 2 usage error)."""
import importlib.util
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / "lint_genericity.py"

spec = importlib.util.spec_from_file_location("lint_genericity", SCRIPT)
lint = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lint)


def write(tmp: str, rel: str, text: str) -> Path:
    p = Path(tmp) / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text)
    return p


def run(args: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run([sys.executable, str(SCRIPT), *args], capture_output=True, text=True)


class TestBrandTerms(unittest.TestCase):
    def test_bare_term_is_flagged(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = write(tmp, "doc.md", "Ask pinkyd about the palette.\n")
            r = run([str(f)])
            self.assertEqual(r.returncode, 1, r.stdout + r.stderr)
            self.assertIn("[brand-term]", r.stdout)
            self.assertIn("pinkyd", r.stdout)

    def test_case_insensitive(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = write(tmp, "doc.md", "Madison's studio config.\n")
            r = run([str(f)])
            self.assertEqual(r.returncode, 1, r.stdout + r.stderr)

    def test_ecosystem_usages_allowed(self):
        allowed = (
            "Install with `npx bmad-method install`.\n"
            "BMad Manticore is a BMad Method module.\n"
            "Config lives in `{project-root}/_bmad/custom/config.toml`.\n"
            "See https://github.com/bmad-code-org/bmad-manticore for source.\n"
            "The project is not BMad-initialized.\n"
            "It reads the installed BMad core scripts.\n"
        )
        with tempfile.TemporaryDirectory() as tmp:
            f = write(tmp, "doc.md", allowed)
            r = run([str(f)])
            self.assertEqual(r.returncode, 0, r.stdout + r.stderr)

    def test_readme_ecosystem_section_allowed_but_other_sections_flagged(self):
        text = (
            "# Title\n\nbmadcode leaked here.\n\n"
            "## Part of the BMad ecosystem\n\nFollow https://x.com/BMadCode\n"
        )
        with tempfile.TemporaryDirectory() as tmp:
            f = write(tmp, "README.md", text)
            r = run([str(f)])
            self.assertEqual(r.returncode, 1, r.stdout + r.stderr)
            self.assertIn(":3:", r.stdout)
            self.assertNotIn(":7:", r.stdout)

    def test_section_allowance_only_in_readme_or_agents(self):
        text = "## Support BMad\n\nFollow bmadcode everywhere.\n"
        with tempfile.TemporaryDirectory() as tmp:
            f = write(tmp, "guide.md", text)
            r = run([str(f)])
            self.assertEqual(r.returncode, 1, r.stdout + r.stderr)


class TestHexColors(unittest.TestCase):
    def test_chromatic_hex_flagged(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = write(tmp, "style.md", "Use #ba2f8c for callouts.\n")
            r = run([str(f)])
            self.assertEqual(r.returncode, 1, r.stdout + r.stderr)
            self.assertIn("[hex-color]", r.stdout)

    def test_grayscale_and_placeholder_palette_allowed(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = write(tmp, "style.md", "Neutral #111111, #ffffff, accent #4f8cff.\n")
            r = run([str(f)])
            self.assertEqual(r.returncode, 0, r.stdout + r.stderr)

    def test_token_files_tests_dirs_and_svg_exempt(self):
        with tempfile.TemporaryDirectory() as tmp:
            write(tmp, "tokens.template.json", '{"accent": "#ba2f8c"}\n')
            write(tmp, "scripts/tests/test-x.py", 'FIXTURE = "#ba2f8c"\n')
            write(tmp, "diagram.svg", '<rect fill="#ba2f8c"/>\n')
            r = run([tmp])
            self.assertEqual(r.returncode, 0, r.stdout + r.stderr)

    def test_hex_allow_flag_extends_allowlist(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = write(tmp, "style.md", "Use #ba2f8c here.\n")
            r = run([str(f), "--hex-allow", "ba2f8c"])
            self.assertEqual(r.returncode, 0, r.stdout + r.stderr)


class TestMachinePaths(unittest.TestCase):
    def test_users_path_flagged_even_in_svg_and_tests(self):
        with tempfile.TemporaryDirectory() as tmp:
            write(tmp, "scripts/tests/test-x.py", 'p = "/Users/someone/footage.mov"\n')
            r = run([tmp])
            self.assertEqual(r.returncode, 1, r.stdout + r.stderr)
            self.assertIn("[machine-path]", r.stdout)


class TestCli(unittest.TestCase):
    def test_clean_tree_exits_0(self):
        with tempfile.TemporaryDirectory() as tmp:
            write(tmp, "doc.md", "Plain generic module content.\n")
            r = run([tmp])
            self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
            self.assertIn("clean", r.stdout)

    def test_missing_path_exits_2(self):
        r = run(["/nonexistent/path-for-lint-test"])
        self.assertEqual(r.returncode, 2, r.stdout + r.stderr)

    def test_skips_own_source_its_tests_and_binaries(self):
        with tempfile.TemporaryDirectory() as tmp:
            write(tmp, "lint_genericity.py", 'TERMS = ["bmadcode", "pinkyd"]\n')
            write(tmp, "tests/test-lint_genericity.py", 'FIXTURE = "pinkyd"\n')
            write(tmp, "clip.mov", "binary-ish pinkyd content\n")
            r = run([tmp])
            self.assertEqual(r.returncode, 0, r.stdout + r.stderr)

    def test_custom_terms(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = write(tmp, "doc.md", "myshowname appears here.\n")
            r = run([str(f), "--terms", "myshowname"])
            self.assertEqual(r.returncode, 1, r.stdout + r.stderr)


if __name__ == "__main__":
    unittest.main()
