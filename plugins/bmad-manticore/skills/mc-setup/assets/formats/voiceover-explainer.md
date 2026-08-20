---
format: voiceover-explainer
stages: [new, braindump, outline, script, record, cut, beats, graphics, assets, package, final, retro]
engine_overlays: hyperframes
engine_stingers: remotion
generated_broll: allowed
beat-types: [slide, diagram, list-build, keyword-pop, quote-card, stat-card, farmed-still, farmed-clip, screenshot, cta]
density:
  high: "10-20s"
  medium: "20-45s"
  low: "45-90s"
  note: "Seconds per graphic beat. Front-loaded: open at the dense end of the tier range and relax toward the slow end as the video settles. The graphics-frequency tier in [style] selects the row; the shipped default is medium."
---

# Format: voiceover-explainer

No camera. Recorded VO drives a fully composed visual track: slides, diagrams, farmed clips, motion graphics.

Narration status: creator-recorded narration is the default and the honest recommendation. A local TTS lane is implemented via the mc-audio service skill (Kokoro-82M, `[audio] tts-provider`), and the record stage may offer it, with the limits stated plainly: stock voices only, no cloning, so TTS narration is never the creator's own voice. Narration in your own voice means recording it yourself; a paid voice-cloning lane is opt-in and planned.

## Style philosophy

- The visual track is wall-to-wall: unlike talking-head, silence on screen is a bug. Every beat covers its span.
- Diagrams over decoration. This format exists to explain; SVG diagrams in the brand system are the primary visual, farmed clips are seasoning.
- Record VO in one sitting where possible; the cut stage tightens gaps and retakes exactly like A-roll.
- Creativity: expressive. The visual track is the whole show; vary composition freely within the brand system, favoring clarity over spectacle. (mc-retro tunes this line per format.)

## Engine defaults

- Diagrams and slides: HyperFrames or plain HTML/SVG comps in Remotion (the creator's call per video; both read `{brand-path}/tokens.json`).
- Farmed stills/clips: per the configured `[assets]` lanes and the `PIPELINE.md` engine policy. No vendor is assumed; if a lane is unset, the assets stage stops and asks.

## Templates

- None yet.

## Learnings

(mc-retro appends here; newest first, ISO dated.)
