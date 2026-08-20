---
format: talking-head
stages: [new, braindump, outline, script, record, cut, beats, graphics, assets, package, final, retro]
engine_overlays: hyperframes
engine_stingers: remotion
generated_broll: allowed
beat-types: [lower-third, title-card, keyword-pop, quote-card, list-build, stat-card, diagram, screenshot-callout, b-roll, cta]
density:
  high: "10-20s"
  medium: "20-45s"
  low: "45-90s"
  note: "Seconds per graphic beat. Front-loaded: open at the dense end of the tier range and relax toward the slow end as the video settles. The graphics-frequency tier in [style] selects the row; the shipped default is medium."
---

# Format: talking-head

The default for main channel videos. The creator on camera, graphics are overlay beats composited over A-roll in the creator's editor.

## Style philosophy

- The A-roll carries the video; graphics support the spoken word, never compete with it.
- Overlay beats ride word anchors from the edited transcript. A graphic that is not tied to a spoken phrase does not exist.
- Brand system throughout: overlays are alpha (no canvas color ever baked in); text and emphasis colors follow `{brand-path}/tokens.json` and its colorRules notes.
- Density follows the frontmatter tiers; the configured graphics-frequency tier is the target, not a ceiling to duck under.
- Creativity: balanced. Vary beat type and composition across the video, staying inside the brand system and the frontmatter beat-types list. (mc-retro tunes this line per format.)

## Engine defaults

- Overlays: HyperFrames, registry blocks first, ProRes 4444 alpha export.
- Stinger/transition: the Remotion brand stinger from `{engines-path}/remotion/`.
- Generated b-roll: allowed for atmosphere and story beats only, never for UI or text that must be accurate.

## Templates

- None yet. First finished video donates its best compositions back here as named templates.

## Learnings

(mc-retro appends here; newest first, ISO dated.)
