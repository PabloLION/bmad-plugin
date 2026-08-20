---
format: short
stages: [new, cut, beats, graphics, package, final, retro]
engine_overlays: remotion
engine_stingers: none
generated_broll: allowed
beat-types: [karaoke-caption, hook-text, keyword-pop, screenshot-callout, cta]
density:
  high: "10-20s"
  medium: "20-45s"
  low: "45-90s"
  note: "Seconds per graphic beat. Front-loaded: open at the dense end of the tier range and relax toward the slow end as the video settles. The graphics-frequency tier in [style] selects the row; the shipped default is medium."
---

# Format: short

9:16 vertical, usually re-edited from a long-form parent project (`parent` field in project.json points at it). Hook-first: the strongest moment opens the short, context comes after or never.

## Style philosophy

- Aggressive cut margins: tighter pads than long-form, no breathing room.
- Karaoke captions always on (word-level highlight, from the transcript).
- One idea per short. If the source segment contains two, make two shorts.
- First 1.5 seconds must contain motion and the hook words on screen.
- Creativity: playful. High energy and pattern breaks are welcome; anything that keeps the eye moving, inside the brand system. (mc-retro tunes this line per format.)

## Engine defaults

- Captions and overlays: the Remotion karaoke caption system, safe-area aware for the vertical UI chrome.
- Source: the parent project's `cut/edl.json` and transcript; a short's own edl selects and reorders parent segments.

## Templates

- None yet.

## Learnings

(mc-retro appends here; newest first, ISO dated.)
