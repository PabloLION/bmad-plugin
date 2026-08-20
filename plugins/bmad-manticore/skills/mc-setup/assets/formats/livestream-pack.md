---
format: livestream-pack
stages: [new, stream-pack, final, retro]
engine_overlays: ograf
engine_stingers: remotion
generated_broll: banned
beat-types: [starting-soon-scene, brb-scene, ending-scene, full-overlay, lower-third, topic-card, stinger]
density:
  high: "10-20s"
  medium: "20-45s"
  low: "45-90s"
  note: "Seconds per graphic beat, read here as pacing for live-triggered graphics during the show. Front-loaded: open at the dense end of the tier range and relax as the show settles. The graphics-frequency tier in [style] selects the row; the shipped default is medium."
---

# Format: livestream-pack

Not a video. One run of mc-stream-pack producing a complete OBS asset pack from brand tokens. The final gate is the creator loading the pack into OBS and approving the look live.

## Style philosophy

- Scenes must read at a glance on a busy live layout; one design language across the whole pack.
- Creativity: bold but consistent. Strong shapes and confident type, always inside the brand system; the pack is the channel's live face, not a per-show experiment. (mc-retro tunes this line per format.)

## Pack contents

- Static scenes as self-contained local HTML (starting-soon with countdown, BRB, ending, full overlay). OBS browser sources render local HTML transparent by default; no server.
- Scenes are reactive via the `window.obsstudio` JS API (countdown resets on scene activation, lower thirds re-trigger entrance on visibility) with a plain-browser fallback.
- Stinger transition: one Remotion comp rendered twice (VP9 yuva420p WebM for OBS, ProRes 4444 MOV for the editor lane), 1 to 2 seconds.
- Lower thirds and topic cards as OGraf (via the mc-ograf skill), standalone-capable and SPX-GC-compatible for click-to-trigger later.

## Verification, not vibes

- Playwright screenshots of every scene at 1920x1080 over a checkerboard to prove alpha and layout.
- ffprobe on the stinger for the right pixel formats.

## Out of scope in v1

- NodeCG (over-engineered for an asset pack).
- Alert-event plumbing (StreamElements' free custom-widget slot accepts our HTML if alerts are ever wanted).

## Learnings

(mc-retro appends here; newest first, ISO dated.)
