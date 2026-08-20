# Production Bible: Build Spec

The Production Bible is the visual half of the taste system (the voice bible is the verbal half). It is the styling contract every visual stage reads before authoring anything, and the file mc-retro ratchets when the creator corrects visual output. It lives at `{brand-path}/production-bible.md`. Machine-readable constants stay in `tokens.json`; the bible is the taste contract in prose plus structured style tokens. mc-setup copies this spec there as the placeholder until it is built.

## The seven sections

1. Brand usage scope. Global rules first, then per-project-type override sections (per-format, per-series). Records where the corporate theme applies and where it must NOT: not everything gets the corporate palette, and accent colors wear out when overused.
2. Animation and motion look-and-feel. The feel in words (snappy, smooth, dramatic), entrance and exit conventions (for example fly-in and fly-out with optional whoosh SFX), mapped onto the motion values in `tokens.json`.
3. Overlay and popup aesthetic. Surface treatment (solid, glass, gradient, neon, flat, native-platform), blur, border, corner radius, shadow or glow, texture. Placement rules: overlays are large, centered, straight, composited over full-frame video in detected safe zones around talking heads; never letterbox the source to make room; no solid bars behind persistent UI; photos get snug native-aspect frames, never uniform letterboxed panels. Reference screenshots the creator supplies or wants to emulate are stored beside the bible.
4. Image-type policy. Preferred lanes per purpose: SVG or diagrammatic builds for anything whose text must be accurate, generative imagery for what does not exist, real verified imagery first for anything that does. Sourcing hierarchy: real, then generative, then hand-built text card. Also lists the creator's own asset libraries and their locations.
5. Visual density. The graphics-frequency tier (high, medium, low), per-format overrides, and the variety quota (see the density-and-creativity reference shipped with mc-beats).
6. CTA configuration. The creator's CTA inventory and appetite (mirroring `[cta]` in the studio config), plus the native-platform styling rule: a subscribe element reads YouTube-red, a community element reads that platform's own colors.
7. Learnings log. ISO-dated, append-only, one-way ratchet, exactly like format-profile Learnings.

## How mc-setup builds it

The video style interview fills the bible interactively. The creator supplies any of: (a) screenshots of overlays they have shipped, (b) reference screenshots, video links, or creators to emulate, or (c) a described aesthetic; setup distills these into the structured tokens plus prose. For emulation links, setup echoes back the distilled takeaways (edit rhythm, humor and meme usage, chart and dataviz polish, caption and overlay style) and the creator confirms them before they land in the bible. Density, image-type, CTA, and animation-feel answers land in BOTH places: the config keys (`[style]`, `[cta]`) for mechanical consumption and the bible for taste. A section left genuinely unanswered stays a marked placeholder, and the setup summary flags it as a pending gap.

## How it evolves

- mc-retro routes every visual style miss (graphics density, overlay aesthetic, image-type choice, CTA placement) to this file: the global section or the per-format override, ISO-dated, one-way ratchet. The bible is on mc-retro's step-1 read list.
- The studio agent records durable style facts here (its creator profile stays identity and niche only).
- Series learnings (winning thumbnail patterns, recurring beat templates) accumulate in the per-series sections.
- Entries are never deleted, only refined; the ratchet turns one way.

## Consumers

- mc-beats reads it in step 1 alongside the format profile; density tier and beat-type choices must conform, and its checklist requires composition consistency with the stated overlay style and image-type policy.
- mc-graphics and mc-ograf read it before authoring anything; it is the styling contract beyond `tokens.json`.
- mc-assets: the image-type policy governs lane choice per asset; the sourcing hierarchy applies.
- mc-package and mc-stream-pack: thumbnail style, series templates, and the CTA section.
- mc-retro and the studio agent are the writers, per above.
