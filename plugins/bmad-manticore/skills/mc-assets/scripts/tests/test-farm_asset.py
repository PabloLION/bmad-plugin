#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Tests for farm_asset.py: provider resolution against [[tools]], headless
command construction, manifest rows, and the CLI lane end to end using a fake
tool (a python one-liner). No real generation, no network, no billing."""
import importlib.util
import json
import shlex
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / "farm_asset.py"

spec = importlib.util.spec_from_file_location("farm_asset", SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


def canned_config():
    return {
        "assets": {"image-provider": "grok", "video-provider": "grok",
                   "escalation-provider": "veo-api"},
        "tools": [
            {"name": "grok", "capabilities": ["image", "video"],
             "headless": 'grok -p "<prompt>" --always-approve',
             "models": ["imagine-2"],
             "notes": "Cinematic bias. Never use for readable on-screen text."},
            {"name": "agy", "capabilities": ["image"],
             "headless": 'agy -p "<prompt>" --dangerously-skip-permissions',
             "notes": ""},
        ],
    }


class TestResolveProvider(unittest.TestCase):
    def test_tool_name_selects_cli_lane(self):
        lane, tool = mod.resolve_provider("grok", canned_config())
        self.assertEqual(lane, "cli")
        self.assertEqual(tool["name"], "grok")

    def test_reserved_names_select_api_lane(self):
        for name in ("xai-api", "veo-api"):
            lane, target = mod.resolve_provider(name, canned_config())
            self.assertEqual((lane, target), ("api", name))

    def test_tool_named_like_api_lane_wins_over_api(self):
        cfg = {"tools": [{"name": "xai-api", "headless": 'x "<prompt>"'}]}
        lane, tool = mod.resolve_provider("xai-api", cfg)
        self.assertEqual(lane, "cli")

    def test_unknown_provider_raises_listing_registered_tools(self):
        with self.assertRaises(LookupError) as ctx:
            mod.resolve_provider("midjourney", canned_config())
        self.assertIn("grok", str(ctx.exception))
        self.assertIn("agy", str(ctx.exception))

    def test_empty_registry_says_none(self):
        with self.assertRaises(LookupError) as ctx:
            mod.resolve_provider("grok", {})
        self.assertIn("none", str(ctx.exception))


class TestPlanInvocation(unittest.TestCase):
    def tool(self, **over):
        t = canned_config()["tools"][0]
        t.update(over)
        return t

    def test_prompt_substitutes_inside_quoted_token(self):
        argv = mod.plan_invocation(self.tool(), "image",
                                   "a manticore at red sunset", "/out")
        self.assertEqual(argv, ["grok", "-p", "a manticore at red sunset",
                                "--always-approve"])

    def test_placeholders_ref_seconds_outdir_kind_model(self):
        t = self.tool(headless='gen --model <model> --ref "<ref>" '
                               '--dur <seconds> --dest "<out-dir>" '
                               '--mode <kind> -p "<prompt>"')
        argv = mod.plan_invocation(t, "video", "p", "/proj/assets/work",
                                   ref="/brand/headshots/neutral.png",
                                   seconds=12)
        self.assertEqual(argv, ["gen", "--model", "imagine-2", "--ref",
                                "/brand/headshots/neutral.png", "--dur", "12",
                                "--dest", "/proj/assets/work", "--mode",
                                "video", "-p", "p"])

    def test_missing_prompt_placeholder_raises(self):
        with self.assertRaises(ValueError):
            mod.plan_invocation(self.tool(headless="grok --always-approve"),
                                "image", "p", "/out")

    def test_empty_headless_raises(self):
        with self.assertRaises(ValueError):
            mod.plan_invocation(self.tool(headless=""), "image", "p", "/out")

    def test_template_ref_without_flag_raises(self):
        t = self.tool(headless='gen --ref "<ref>" -p "<prompt>"')
        with self.assertRaises(ValueError) as ctx:
            mod.plan_invocation(t, "image", "p", "/out")
        self.assertIn("--ref", str(ctx.exception))

    def test_flag_ref_without_template_placeholder_raises(self):
        with self.assertRaises(ValueError) as ctx:
            mod.plan_invocation(self.tool(), "image", "p", "/out",
                                ref="real.png")
        self.assertIn("mc-setup", str(ctx.exception))


class TestManifest(unittest.TestCase):
    def test_rows_shape_and_null_cost(self):
        rows = mod.manifest_rows(["a.png"], "image", "p", "grok", "imagine-2")
        row = rows[0]
        self.assertEqual(
            set(row), {"file", "kind", "prompt", "provider", "model", "cost",
                       "date"})
        self.assertIsNone(row["cost"])
        self.assertEqual(row["provider"], "grok")

    def test_append_creates_then_extends(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "manifest.json"
            mod.append_manifest(path, mod.manifest_rows(
                ["a.png"], "image", "p1", "grok", None))
            mod.append_manifest(path, mod.manifest_rows(
                ["b.png"], "image", "p2", "agy", None))
            entries = json.loads(path.read_text())
            self.assertEqual([e["file"] for e in entries], ["a.png", "b.png"])

    def test_append_rejects_non_list_manifest(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "manifest.json"
            path.write_text('{"not": "a list"}')
            with self.assertRaises(ValueError):
                mod.append_manifest(path, [])


# --- CLI ---------------------------------------------------------------------

def run(args, env=None):
    return subprocess.run([sys.executable, str(SCRIPT), *args],
                          capture_output=True, text=True, env=env)


def write_config(tmp, config):
    path = Path(tmp) / "config.json"
    path.write_text(json.dumps(config))
    return str(path)


def base_args(tmp, config, provider="grok", kind="image", prompt="p"):
    return ["--kind", kind, "--prompt", prompt, "--provider", provider,
            "--config", write_config(tmp, config),
            "--out-dir", str(Path(tmp) / "work")]


class TestCli(unittest.TestCase):
    def test_missing_required_args_exits_2(self):
        self.assertEqual(run([]).returncode, 2)

    def test_missing_config_file_exits_2(self):
        r = run(["--kind", "image", "--prompt", "p", "--provider", "grok",
                 "--config", "/nonexistent.json", "--out-dir", "/tmp/x"])
        self.assertEqual(r.returncode, 2)
        self.assertIn("config not found", r.stderr)

    def test_unknown_provider_exits_2_listing_tools(self):
        with tempfile.TemporaryDirectory() as tmp:
            r = run(base_args(tmp, canned_config(), provider="midjourney"))
            self.assertEqual(r.returncode, 2)
            self.assertIn("grok", r.stderr)

    def test_api_lane_exits_3_with_fast_follow_pointer(self):
        with tempfile.TemporaryDirectory() as tmp:
            r = run(base_args(tmp, canned_config(), provider="xai-api"))
            self.assertEqual(r.returncode, 3)
            self.assertIn("NOT implemented in 1.0", r.stderr)
            self.assertIn("TODO.md", r.stderr)
            self.assertIn("1.0.x", r.stderr)

    def test_dry_run_prints_command_and_notes_runs_nothing(self):
        with tempfile.TemporaryDirectory() as tmp:
            r = run(base_args(tmp, canned_config(),
                              prompt="a red panda") + ["--dry-run"])
            self.assertEqual(r.returncode, 0, r.stderr)
            out = json.loads(r.stdout)
            self.assertEqual(out["command"],
                             ["grok", "-p", "a red panda", "--always-approve"])
            self.assertEqual(out["lane"], "cli")
            self.assertIn("Cinematic bias", out["notes"])
            self.assertIn("Cinematic bias", r.stderr)  # notes surfaced live
            self.assertEqual(list((Path(tmp) / "work").iterdir()), [])

    def fake_tool_config(self, code):
        """A [[tools]] entry whose 'CLI' is this interpreter running code."""
        cfg = canned_config()
        cfg["tools"].append({
            "name": "faketool",
            "headless": f'"{sys.executable}" -c \'{code}\'',
            "models": ["fake-1"],
            "notes": "writes into its working directory",
        })
        return cfg

    def test_cli_lane_end_to_end_cwd_env_prompt_manifest(self):
        code = ('import os, pathlib; '
                'pathlib.Path("gen-<kind>.txt").write_text('
                'os.environ.get("FA_MARKER", "missing") + "|<prompt>")')
        cfg = self.fake_tool_config(code)
        import os
        env = dict(os.environ, FA_MARKER="passed-through")
        with tempfile.TemporaryDirectory() as tmp:
            r = run(base_args(tmp, cfg, provider="faketool",
                              prompt="two words"), env=env)
            self.assertEqual(r.returncode, 0, r.stderr)
            work = Path(tmp) / "work"
            # file landed in --out-dir (cwd) with <kind> substituted
            produced = work / "gen-image.txt"
            self.assertTrue(produced.exists())
            # env passthrough and <prompt> substitution reached the tool
            self.assertEqual(produced.read_text(), "passed-through|two words")
            # manifest row recorded with null cost and the tool's model
            entries = json.loads((work / "manifest.json").read_text())
            self.assertEqual(len(entries), 1)
            self.assertEqual(entries[0]["file"], "gen-image.txt")
            self.assertEqual(entries[0]["provider"], "faketool")
            self.assertEqual(entries[0]["model"], "fake-1")
            self.assertIsNone(entries[0]["cost"])
            # summary lists the new file
            summary = json.loads(r.stdout)
            self.assertEqual(summary["new_files"], ["gen-image.txt"])

    def test_tool_producing_no_files_exits_1(self):
        cfg = self.fake_tool_config('pass  # <prompt>')
        with tempfile.TemporaryDirectory() as tmp:
            r = run(base_args(tmp, cfg, provider="faketool"))
            self.assertEqual(r.returncode, 1)
            self.assertIn("no new files", r.stderr)

    def test_failing_tool_exits_1(self):
        cfg = self.fake_tool_config('raise SystemExit("boom <prompt>")')
        with tempfile.TemporaryDirectory() as tmp:
            r = run(base_args(tmp, cfg, provider="faketool"))
            self.assertEqual(r.returncode, 1)
            self.assertIn("tool exited 1", r.stderr)

    def test_missing_executable_exits_1(self):
        cfg = canned_config()
        cfg["tools"].append({"name": "ghost",
                             "headless": '/no/such/binary -p "<prompt>"'})
        with tempfile.TemporaryDirectory() as tmp:
            r = run(base_args(tmp, cfg, provider="ghost"))
            self.assertEqual(r.returncode, 1)
            self.assertIn("not found", r.stderr)

    def test_missing_ref_file_exits_2(self):
        with tempfile.TemporaryDirectory() as tmp:
            r = run(base_args(tmp, canned_config()) +
                    ["--ref", "/nonexistent/ref.png"])
            self.assertEqual(r.returncode, 2)
            self.assertIn("--ref not found", r.stderr)


if __name__ == "__main__":
    unittest.main()
