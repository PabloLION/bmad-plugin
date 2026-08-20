---
format: screen-tutorial
stages: [new, braindump, outline, script, record, cut, beats, graphics, package, final, retro]
engine_overlays: hyperframes
engine_stingers: remotion
generated_broll: banned
beat-types: [lower-third, title-card, keyword-pop, list-build, diagram, zoom-pan, ui-callout, key-press-chip, step-counter, cta]
density:
  high: "10-20s"
  medium: "20-45s"
  low: "45-90s"
  note: "Seconds per graphic beat. Front-loaded: open at the dense end of the tier range and relax toward the slow end as the video settles. The graphics-frequency tier in [style] selects the row; the shipped default is medium."
---

# Format: screen-tutorial

Talking head plus screen recording. The teaching happens on screen; the pipeline adds structure and emphasis around real UI.

## Style philosophy

- Real UI only. Generated b-roll is BANNED in this format (UI accuracy rule); that is why the assets stage is absent from the stage list.
- Beat types extend talking-head with: zoom/pan on the screen recording, UI callouts (boxes, arrows, key-press chips), and step counters.
- Callouts use the brand accent color on a subtle border stroke (per tokens.json); never obscure the UI element being discussed, point at it.
- Screen recordings are captured at native resolution, constant frame rate, and cursor visible.
- Creativity: restrained. The UI is the star; graphics clarify, never decorate. Vary callout placement and pacing, not treatment. (mc-retro tunes this line per format.)

## Engine defaults

- Overlays and callouts: HyperFrames.
- Zoom/pan moves are executed in the creator's editor on the screen-recording clip (keyframed transform), planned as beats with anchor words like any other graphic.

## Templates

- None yet.

## Learnings

(mc-retro appends here; newest first, ISO dated.)
