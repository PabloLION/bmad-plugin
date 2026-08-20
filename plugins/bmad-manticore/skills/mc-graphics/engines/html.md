# Engine: HTML

The html-design lane: model-authored HTML/CSS, themed from `{brand-path}/tokens.json` and the Production Bible, rendered to pixels by `{skill-root}/scripts/html_to_png.py`, screenshot-reviewed, iterated. This is the fastest path for static and single-frame graphics (popups, callout cards, framed imagery, infographic frames). Animated comps use the same authoring surface but must honor the `window.seek(frame)` determinism contract in `engines/design-prompting.md` and render frame-stepped to ProRes 4444.

## The loop

1. Author a single self-contained HTML file in the project's `graphics/` folder: no external requests of any kind (CDN scripts, fonts, images); inline or data-URI everything. Every color and font comes from `tokens.json`; the surface treatment, radius, shadow, and placement come from the Production Bible. Exact text is verbatim from the beat row or transcript.
2. Render at the exact target size: `uv run {skill-root}/scripts/html_to_png.py graphics/<id>.html --out graphics/<id>.png --width {W} --height {H} --verify-alpha`. The script fails if the PNG is not exactly the requested pixel size.
3. Review the rendered PNG itself (not the HTML in your head): open it, zoom, read every string, check alpha over the `_checker.png` composite. Critique against the Production Bible's aesthetic language.
4. When placement matters, render a SEPARATE guides pass with `--guides graphics/<id>_guides.png` (safe-zone insets plus crosshair over a checkerboard). Guides and helper text never appear in the deliverable image.
5. Revise the HTML and re-render until it passes the self-review gate, then hand the PNG (or the frame-stepped video render, for animated comps) to the compositing step.

## Rendering rules

- Deliverables are rendered transparent (the default): unpainted pixels carry alpha 0 so the graphic composites over full-frame video. Pass `--no-transparent` only for opaque cards that are meant to fill their canvas.
- `--scale 2` doubles the device pixel ratio for crisp downstream scaling; the output size check accounts for it.
- Photos inside HTML comps still obey the snug-frame rule: size the frame to the photo's native aspect (use `{skill-root}/scripts/snug_frame.py` for standalone framed photos), never a uniform letterboxed panel.
- A render is not done until the PNG has been visually checked, and video renders additionally pass `{skill-root}/scripts/render_verify.py`.

## Brand fonts: the fontconfig shim pattern

The portable lane is to inline brand fonts into the HTML as data-URI `@font-face` rules (this also satisfies the self-contained rule, and it is the only reliable path for Chromium on macOS, which resolves fonts through CoreText, not fontconfig).

For renderers that resolve fonts through fontconfig (rsvg-convert, ffmpeg drawtext, Chromium on Linux) and brand fonts that are not system-installed, use the shim: write a `fonts.conf` beside the brand fonts and point `FONTCONFIG_FILE` at it for the render invocation. `html_to_png.py` inherits the variable from its environment.

```xml
<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>/absolute/path/to/{brand-path}/fonts</dir>
  <include ignore_missing="yes">/etc/fonts/fonts.conf</include>
  <cachedir>/absolute/path/to/{brand-path}/fonts/.fccache</cachedir>
</fontconfig>
```

```sh
FONTCONFIG_FILE=/absolute/path/to/{brand-path}/fonts/fonts.conf rsvg-convert -w 1920 -h 1080 card.svg -o card.png
```

Verify the font actually resolved by reading the render: a silent fallback to a default sans is a defect the eye catches and fontconfig does not report.

## The no-emoji-in-rsvg-SVG rule

rsvg-convert does not render color emoji: emoji characters in an SVG come out as tofu boxes or monochrome outlines, silently. Never put emoji characters in an SVG destined for rsvg-convert. When a graphic needs emoji, either render it through Chromium via `html_to_png.py` (Chromium ships a color emoji font) or place the emoji as an inline image asset (SVG or PNG data URI) instead of a text glyph. Either way, read the rendered output to confirm.

## Tooling note

Drive Playwright through `html_to_png.py` (Python Playwright, pinned by the script's PEP 723 block), never through `npx playwright` or ad-hoc Node scripts: the npx-Playwright module-resolution pitfall and its fix are documented in the script's docstring. Chromium installs once via `uv run {skill-root}/scripts/html_to_png.py --install-chromium`.
