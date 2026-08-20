#!/usr/bin/env python3
"""Verify an OGraf package against the exact code path a renderer (DaVinci Resolve)
uses, so the black-screen failure modes are caught before handoff.

It serves the package folder and, in a headless browser, does what Resolve does:
  register the class under a FRESH tag  (throws if the .mjs self-registered)
  -> instantiate -> load({renderType:"nonrealtime"}) -> goToTime() across the timeline
then checks for console/page errors and that something actually renders.

Exit codes:
  0  verified OK
  1  verification FAILED (error thrown, or nothing rendered)  -> details printed
  2  bad usage / package not found
  3  could not run headless (Playwright missing or no browser) -> manual steps printed

Playwright is an OPTIONAL dependency. Without it, this prints how to verify by hand.
Stdlib only except for the optional Playwright import.
"""
# /// script
# requires-python = ">=3.11"
# dependencies = ["playwright"]
# ///
# playwright is declared so `uv run` provisions it, but it is imported lazily and
# its absence is handled gracefully (plain `python3` prints manual steps instead).
# Browser one-time setup: playwright install chromium
import argparse
import http.server
import json
import socket
import socketserver
import sys
import tempfile
import threading
from pathlib import Path

VERIFY_HTML = "_ograf_verify.html"


def die(msg: str, code: int = 2):
    """Usage/structure error → exit 2 (distinct from 1 = verification failed)."""
    print(msg, file=sys.stderr)
    sys.exit(code)


def find_manifest(pkg: Path) -> Path:
    hits = sorted(pkg.glob("*.ograf.json"))
    if not hits:
        die(f"no *.ograf.json found in {pkg}")
    return hits[0]


def serve(directory: Path):
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *a, **k):
            super().__init__(*a, directory=str(directory), **k)

        def log_message(self, *a):
            pass

    handler = Quiet
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        port = s.getsockname()[1]
    httpd = socketserver.TCPServer(("127.0.0.1", port), handler)
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    return httpd, port


def manual_steps(pkg: Path, msg: str):
    print(json.dumps({
        "ok": None,
        "status": "skipped-no-headless",
        "reason": msg,
        "manual_verify": [
            f"cd {pkg} && python3 -m http.server 8771",
            "open http://localhost:8771/preview.html",
            "Scrub the slider end-to-end; the graphic must animate in, hold, and out.",
            "Open the browser console — there must be ZERO errors.",
            "The checkerboard must show through (transparency).",
        ],
        "enable_headless": "install the 'playwright' package, then run: playwright install chromium",
    }, indent=2))


def main():
    ap = argparse.ArgumentParser(
        description="Verify an OGraf package against the renderer code path (catches the "
        "black-screen failure modes). Exits 0 ok, 1 failed, 2 usage, 3 no-headless.")
    ap.add_argument("package", help="path to the OGraf package directory (contains *.ograf.json)")
    ap.add_argument("--width", type=int, default=1920,
                    help="viewport width in px; pass the value used at scaffold time")
    ap.add_argument("--height", type=int, default=1080,
                    help="viewport height in px; pass the value used at scaffold time")
    ap.add_argument("--duration", type=int, default=10000,
                    help="timeline length in ms; pass the value used at scaffold time")
    args = ap.parse_args()
    pkg = Path(args.package).resolve()
    if not pkg.is_dir():
        die(f"not a directory: {pkg}")

    manifest_path = find_manifest(pkg)
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    main_file = manifest.get("main")
    if not main_file or not (pkg / main_file).exists():
        die(f"manifest 'main' ({main_file!r}) is missing next to the manifest — "
            "an OGraf graphic is a folder; the .mjs must sit beside the .json")
    duration = args.duration
    settle = min(2000, duration // 2)

    # The renderer simulation: register under a fresh tag (catches self-registration),
    # then load non-real-time and scrub.
    test_html = f"""<!doctype html><html><head><meta charset="utf-8"><style>
      html,body{{margin:0;height:100%;background:transparent}} #host{{position:absolute;inset:0}}
    </style></head><body><div id="host"></div>
    <script type="module">
      const log = [];
      window.addEventListener("error", e => log.push("ERROR: " + e.message));
      try {{
        const mod = await import("./{main_file}");
        const Cls = mod.default;
        if (typeof Cls !== "function") throw new Error("module default export is not a class");
        const tag = "ograf-verify-probe";
        customElements.define(tag, Cls);           // throws if the .mjs self-registered
        const el = document.createElement(tag);
        document.getElementById("host").appendChild(el);
        await el.load({{ data: {{}}, renderType: "nonrealtime" }});
        for (const ts of [0, {settle}, {duration}]) await el.goToTime({{ timestamp: ts }});
        await el.goToTime({{ timestamp: {settle} }});
        const root = el.shadowRoot || el;   // OGraf does not require shadow DOM
        const stage = root.querySelector("*");
        const visible = !!stage && getComputedStyle(el).opacity !== "0";
        window.__result = {{ ok: log.length === 0 && visible, visible, errors: log }};
      }} catch (e) {{
        window.__result = {{ ok: false, visible: false, errors: log.concat("THROW: " + (e && e.message || e)) }};
      }}
      window.__done = true;
    </script></body></html>"""

    try:
        from playwright.sync_api import sync_playwright
    except Exception:
        manual_steps(pkg, "Playwright not installed")
        return 3

    (pkg / VERIFY_HTML).write_text(test_html, encoding="utf-8")
    httpd, port = serve(pkg)
    shot = Path(tempfile.gettempdir()) / f"ograf-verify-{manifest.get('id','graphic')}.png"
    try:
        with sync_playwright() as pw:
            try:
                browser = pw.chromium.launch()
            except Exception as e:
                manual_steps(pkg, f"no headless browser: {e}")
                return 3
            page = browser.new_page(viewport={"width": args.width, "height": args.height})
            console_errors = []
            page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
            page.goto(f"http://127.0.0.1:{port}/{VERIFY_HTML}", wait_until="networkidle")
            page.wait_for_function("window.__done === true", timeout=8000)
            result = page.evaluate("window.__result")
            page.screenshot(path=str(shot), omit_background=True)
            browser.close()
    finally:
        httpd.shutdown()
        (pkg / VERIFY_HTML).unlink(missing_ok=True)

    errors = (result.get("errors") or []) + console_errors
    ok = result.get("ok") and not errors
    print(json.dumps({
        "ok": bool(ok),
        "status": "verified" if ok else "failed",
        "package": str(pkg),
        "visible": result.get("visible"),
        "errors": errors,
        "screenshot": str(shot),
        "hint": None if ok else (
            "Self-registration error ('already been used with this registry') means the .mjs "
            "calls customElements.define() — remove it. A blank render usually means an asset "
            "load threw (wrap it in try/catch) or the host was sized to 0."),
    }, indent=2))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
