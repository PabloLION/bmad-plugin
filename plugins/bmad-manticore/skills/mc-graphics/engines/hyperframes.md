# Engine: HyperFrames

Default engine for per-video overlay beats. Apache 2.0, fully local, free: `npx hyperframes render` drives HTML/CSS/GSAP frame-by-frame in headless Chrome. Export overlay-only ProRes 4444 MOV with alpha (their docs recommend exactly this for Resolve workflows). The hosted MCP/HeyGen credits are optional convenience; the pipeline never depends on them.

## Setup

- The engine workspace lives at the creator's `{engines-path}/hyperframes/`, initialized on first graphics run. PIN the version in its package.json (pre-1.0, moves fast; v0.7.26 as of 2026-07-03). Upgrade deliberately, never floating.
- Pull registry blocks before authoring anything: `npx hyperframes add` (50+ blocks: caption styles, lower thirds, transitions, dataviz). Theme every block through `{brand-path}/tokens.json`.
- `@hyperframes/studio` is the timeline GUI; bidirectional sync with the HTML source is real (drag a beat in the GUI, the code updates; hand-edit the code, the GUI hot-reloads). Use it for timing nudges after mc-graphics gets close.

## Rules

- Brand-themed blocks live in the engine workspace and are reused across projects; per-video comps live in each project's `graphics/` folder.
- A render is not done until `{skill-root}/scripts/render_verify.py` has extracted frames and they have been visually checked.
