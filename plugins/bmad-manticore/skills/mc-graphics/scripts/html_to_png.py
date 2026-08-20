#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = ["playwright>=1.40"]
# ///
"""Render a self-contained HTML file to an exact-size PNG via headless Chromium.

Usage:
    uv run {skill-root}/scripts/html_to_png.py <file.html> --out <out.png>
        --width 1920 --height 1080 [--scale 1] [--transparent|--no-transparent]
        [--wait-ms 0] [--seek FRAME] [--fps 30] [--guides <guides.png>]
        [--verify-alpha] [--chromium PATH] [--timeout-ms 30000]
    uv run {skill-root}/scripts/html_to_png.py --install-chromium

Why this script exists (the npx-Playwright module-resolution pitfall):
    Driving Playwright through Node via npx looks convenient and fails in
    practice. `npx playwright` resolves the playwright package into the npx
    cache, a directory that owns no browser binaries, so `require('playwright')`
    in an ad-hoc Node script fails module resolution unless it happens to run
    inside a package that installed playwright locally, and browser discovery
    then depends on which cwd the command ran from and which playwright version
    npx cached that day. The result is renders that work in one shell and break
    in the next.
    The fix used here: Python Playwright, pinned by this script's PEP 723
    dependency block so uv provisions the exact package every run with no
    node_modules or cwd sensitivity; browsers install once into the user-level
    Playwright cache via `--install-chromium` (which runs
    `python -m playwright install chromium` inside this same environment, so
    package and browser versions always match); `--chromium PATH` overrides the
    executable explicitly when a studio pins its own build. No discovery magic.

Contract:
    input   an absolute or relative path to a SELF-CONTAINED html file (no
            external requests; inline or data-URI everything); all expectations
            arrive as explicit flags; the script does no config discovery
    render  Chromium viewport is exactly --width x --height at
            --scale device pixels; the screenshot is clipped to the viewport
            and the output PNG is verified to be exactly
            (width*scale) x (height*scale) pixels, or the run fails.
            --transparent (default) omits the page background so unpainted
            pixels carry alpha 0. The page is settled before capture: load
            event, document.fonts.ready, then --wait-ms extra. --seek FRAME
            calls window.seek(FRAME) (the determinism contract from
            engines/design-prompting.md) and fails if the page does not
            expose it.
    guides  --guides writes a SEPARATE png with safe-zone guides (title-safe
            and action-safe insets, center crosshair) over a checkerboard.
            Guides never appear in the deliverable --out png: deliverable
            images never contain helper text or markers.
    alpha   --verify-alpha recomputes pixel stats from the captured PNG in a
            canvas (min alpha, transparent-pixel fraction) and writes a
            checkerboard composite next to --out (<out>_checker.png) for
            visual inspection.
    fonts   brand fonts should be inlined (data-URI @font-face). On Linux,
            system-font fallbacks honor FONTCONFIG_FILE, which this script
            inherits from the environment; see engines/html.md for the
            fontconfig shim pattern.
    output  structured JSON to stdout: out path, verified dimensions, alpha
            stats, guides/checker paths; exit 0 on success, nonzero otherwise
"""

import argparse
import json
import struct
import subprocess
import sys
from base64 import b64encode
from pathlib import Path

CHECKER_CSS = ("background-color:#b0b0b0;background-image:"
               "conic-gradient(#767676 25%,#b0b0b0 0 50%,#767676 0 75%,#b0b0b0 0);"
               "background-size:32px 32px;")

GUIDES_JS = """
([titlePct, actionPct]) => {
  const mk = (style) => {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483647;' + style;
    document.documentElement.appendChild(d);
    return d;
  };
  const label = (text, style) => {
    const s = mk(style + 'font:11px/1.4 monospace;color:#ff3355;background:rgba(0,0,0,.55);padding:1px 4px;');
    s.textContent = text;
  };
  mk(`inset:${titlePct}%;border:1px dashed #ff3355;`);
  mk(`inset:${actionPct}%;border:1px solid #ffcc00;`);
  mk('left:50%;top:0;bottom:0;width:0;border-left:1px dotted rgba(255,51,85,.7);');
  mk('top:50%;left:0;right:0;height:0;border-top:1px dotted rgba(255,51,85,.7);');
  label(`title safe ${titlePct}%`, `left:${titlePct}%;top:${titlePct}%;`);
  label(`action safe ${actionPct}%`, `left:${actionPct}%;bottom:${actionPct}%;`);
}
"""

ALPHA_STATS_JS = """
async (dataUrl) => {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  let transparent = 0, minAlpha = 255;
  for (let i = 3; i < d.length; i += 4) {
    if (d[i] < 255) transparent++;
    if (d[i] < minAlpha) minAlpha = d[i];
  }
  const total = d.length / 4;
  return { minAlpha, transparentPixels: transparent, totalPixels: total,
           transparentFraction: transparent / total };
}
"""


def png_size(path: Path) -> tuple[int, int]:
    head = path.read_bytes()[:24]
    if head[:8] != b"\x89PNG\r\n\x1a\n":
        sys.exit(f"{path} is not a PNG")
    w, h = struct.unpack(">II", head[16:24])
    return w, h


def main() -> None:
    p = argparse.ArgumentParser(description="HTML to exact-size PNG via headless Chromium")
    p.add_argument("html", nargs="?", help="self-contained html file")
    p.add_argument("--out", help="output png path")
    p.add_argument("--width", type=int, help="viewport width in CSS px")
    p.add_argument("--height", type=int, help="viewport height in CSS px")
    p.add_argument("--scale", type=float, default=1.0, help="device scale factor (default 1)")
    p.add_argument("--transparent", action=argparse.BooleanOptionalAction, default=True,
                   help="omit the page background so unpainted pixels are alpha 0 (default on)")
    p.add_argument("--wait-ms", type=int, default=0, help="extra settle time after fonts.ready")
    p.add_argument("--seek", type=int, help="call window.seek(FRAME) before capture")
    p.add_argument("--guides", help="write a separate guides render (checkerboard + safe zones) here")
    p.add_argument("--title-safe", type=float, default=5.0, help="title-safe inset percent (default 5)")
    p.add_argument("--action-safe", type=float, default=3.5, help="action-safe inset percent (default 3.5)")
    p.add_argument("--verify-alpha", action="store_true",
                   help="compute alpha stats and write <out>_checker.png composite")
    p.add_argument("--chromium", help="explicit Chromium executable path (overrides Playwright's)")
    p.add_argument("--timeout-ms", type=int, default=30000)
    p.add_argument("--install-chromium", action="store_true",
                   help="install the matching Chromium into the Playwright cache, then exit")
    args = p.parse_args()

    if args.install_chromium:
        r = subprocess.run([sys.executable, "-m", "playwright", "install", "chromium"])
        sys.exit(r.returncode)

    for name in ("html", "out", "width", "height"):
        if getattr(args, name) in (None, ""):
            sys.exit(f"--{name} is required" if name != "html" else "html input file is required")
    src = Path(args.html).resolve()
    if not src.is_file():
        sys.exit(f"input not found: {src}")
    out = Path(args.out).resolve()
    out.parent.mkdir(parents=True, exist_ok=True)

    from playwright.sync_api import Error as PWError
    from playwright.sync_api import sync_playwright

    result: dict = {"ok": True, "input": str(src), "out": str(out)}
    with sync_playwright() as pw:
        launch_kwargs: dict = {}
        if args.chromium:
            launch_kwargs["executable_path"] = args.chromium
        try:
            browser = pw.chromium.launch(**launch_kwargs)
        except PWError as e:
            if "Executable doesn't exist" in str(e):
                sys.exit("Chromium is not installed for this Playwright version. "
                         "Run: uv run html_to_png.py --install-chromium "
                         "(or pass --chromium PATH to an existing build)")
            raise
        page = browser.new_page(
            viewport={"width": args.width, "height": args.height},
            device_scale_factor=args.scale,
        )
        page.goto(src.as_uri(), wait_until="load", timeout=args.timeout_ms)
        page.evaluate("() => document.fonts.ready")
        if args.seek is not None:
            has_seek = page.evaluate("() => typeof window.seek === 'function'")
            if not has_seek:
                browser.close()
                sys.exit("--seek was passed but the page does not expose window.seek(frame); "
                         "see the determinism contract in engines/design-prompting.md")
            page.evaluate("(f) => window.seek(f)", args.seek)
            result["seek"] = args.seek
        if args.wait_ms:
            page.wait_for_timeout(args.wait_ms)

        clip = {"x": 0, "y": 0, "width": args.width, "height": args.height}
        page.screenshot(path=str(out), clip=clip, omit_background=args.transparent)

        expect_w = round(args.width * args.scale)
        expect_h = round(args.height * args.scale)
        got_w, got_h = png_size(out)
        if (got_w, got_h) != (expect_w, expect_h):
            browser.close()
            sys.exit(f"output size {got_w}x{got_h} != expected {expect_w}x{expect_h}")
        result["width"], result["height"] = got_w, got_h
        result["transparent"] = args.transparent

        if args.verify_alpha:
            data_url = "data:image/png;base64," + b64encode(out.read_bytes()).decode()
            stats_page = browser.new_page(viewport={"width": args.width, "height": args.height})
            stats_page.goto("about:blank")
            result["alpha"] = stats_page.evaluate(ALPHA_STATS_JS, data_url)
            checker = out.with_name(out.stem + "_checker.png")
            stats_page.set_content(
                f'<body style="margin:0;{CHECKER_CSS}">'
                f'<img src="{data_url}" style="display:block;width:{args.width}px;'
                f'height:{args.height}px"></body>')
            stats_page.screenshot(path=str(checker), clip=clip)
            result["checker"] = str(checker)
            stats_page.close()

        if args.guides:
            guides = Path(args.guides).resolve()
            guides.parent.mkdir(parents=True, exist_ok=True)
            page.evaluate(f"() => document.documentElement.style.cssText += '{CHECKER_CSS}'")
            page.evaluate(GUIDES_JS, [args.title_safe, args.action_safe])
            page.screenshot(path=str(guides), clip=clip)
            result["guides"] = str(guides)

        browser.close()

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
