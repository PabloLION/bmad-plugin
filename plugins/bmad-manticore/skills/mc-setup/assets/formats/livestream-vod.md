---
format: livestream-vod
stages: [new, cut, beats, graphics, assets, package, final, retro]
engine_overlays: hyperframes
engine_stingers: none
generated_broll: allowed-with-verification
beat-types: [chapter-card, topic-popup, lower-third, photo-frame, quote-card, screenshot-callout, cta]
density:
  high: "10-20s"
  medium: "20-45s"
  low: "45-90s"
  note: "Seconds per graphic beat. Front-loaded: open at the dense end of the tier range and relax toward the slow end as the video settles. The graphics-frequency tier in [style] selects the row; the shipped default is medium."
---

# Format: livestream-vod

Post-production of a recorded livestream (or any long single-take source) into a publish bundle: a lightly trimmed VOD, the package (title, description, chapters, thumbnail), shorts candidates, and social posts. This is a footage-first format: there is nothing to ideate, script, or record, so the stage list starts at cut. A livestream-vod project can parent shorts: each short is its own project whose `parent` field points here and whose edl selects and reorders segments from this project's `cut/edl.json` and transcript.

## Style philosophy

- Long-source condensation via transcript analysis fan-out: one transcription pass, then parallel analysis lanes over the same transcript: packaging, cut plan, shorts mining, popup/CTA mining, retention sweep.
- Chapter-first: structure everything around chapters mined from the transcript. Chapters ship in BOTH original and clean-edit timecode, remapped via the cut plan, so they work against the raw recording and the trimmed VOD alike.
- Aggressive dead-air cutting: remove dead air, corrections, and fumbling, but keep the conversational texture that makes a stream a stream. This is a livestream-grade edit, not a scripted-video edit.
- Publish-as-is posture with light trim: no post-hoc overlay re-edit. Graphics effort belongs AHEAD of the stream in the per-episode live pack (the livestream-pack format via mc-stream-pack); this format consumes that pack's output and never rebuilds the chrome. Post-production is packaging, shorts mining, social posts, and the light trim.
- CTA and overlay insertion follows the Production Bible (`{brand-path}/production-bible.md`): its brand-usage scope, CTA placement rules, and per-format overrides govern anything added in post.
- Creativity: restrained. The stream already happened; graphics annotate it. Prefer the show's established design language over per-episode invention. (mc-retro tunes this line per format.)

## Engine defaults

- Overlays: HyperFrames, alpha export, same as talking-head; but expect FEW post overlays given the publish-as-is posture.
- Two-tier assets: evergreen show chrome comes from the series `common/` folder and `{brand-path}/`; only per-episode topic graphics are made fresh, and those belong to the live pack, not to this format's post pass.
- Generated imagery: allowed only with verification. Every claim-bearing graphic must be checked against the transcript before it ships; prefer real screenshots and real artwork wherever the real thing exists.

## Templates

- None yet. A recurring show should promote its packaging spec (locked thumbnail anchors vs per-episode variables) into the brand `templates/` folder so mc-package can generate against it.

## Learnings

(mc-retro appends here; newest first, ISO dated. Seeded below from the module's first production runs, genericized.)

### 2026-07-07 asset tiers, live loading, and post-publish hygiene

- Two-tier assets: evergreen chrome (scene stills, the persistent frame/bar system, host and CTA lower thirds, the show mark) is built ONCE and reused every episode from `common/` and `{brand-path}/`. Only per-episode TOPIC graphics get made fresh, and they are mined from the episode OUTLINE or plan before the show, never rebuilt from the transcript after.
- Loaded live, not re-edited later: the graphics pack must be prepped and switchable in the streaming tool BEFORE going live. The live pack itself is the livestream-pack format via mc-stream-pack; this VOD format consumes its output.
- Post-publish hygiene, once the published master is confirmed safe: purge reproducible render scratch from `work/` (intermediate segments, the baked review render, the debug image trail), keep transcripts in a keeper location, hold `deliverables/` to one blessed asset per slot (alternates stay in `work/`), and promote newly reusable chrome to `common/` and `{brand-path}/`.

### 2026-07-06 format pivot after the first full run: publish as-is, graphics go live

- After completing one full post-hoc re-edit, the creator pivoted the format: the VOD publishes as-is with a light trim; no overlay baking in post. The graphics effort moves ahead of the stream as a live-triggered per-episode scene and asset pack. Post-production shrinks to packaging, shorts, and socials. The design rules below still govern the live pack's look.

### 2026-07-06 first full run: design rules learned through review corrections

- Never shrink the source video to make room for UI; overlay on the full frame. No solid bars or panels behind persistent UI; elements float directly on the video with their own treatment.
- Popups are large, centered, and straight; they fly in and out fast (about 0.35s) with a sound cue. Never small, askew, or corner-placed where they cover faces.
- Photos get snug native-aspect frames; never fixed-size cards with filler panels.
- The formal brand palette wears out fast on in-video graphics. Casual treatments and the referenced platform's own colors often read better on overlays; save the formal palette for professional surfaces. Record the split in the Production Bible.
- Real imagery beats invented: use real screenshots, box art, and artwork wherever the real thing exists; invent only when it does not. Verify every claim-bearing graphic against the transcript; an analysis sweep once invented an offer the creator never made.
- No live-tense wording on VOD graphics ("Enjoying the stream?"); persistent show branding stays.
- Community member names appear exactly as the creator uses them on stream, never normalized.
- Emoji inside rasterized SVG text render as black silhouettes; keep SVG text vector-only.
- Render mechanics: crop source-edge defects before upscaling (crop then scale keeps aspect); infinite generator sources need `shortest=1` AND an explicit `-t` cap or the render runs away; splitting a long render into parallel segments and concatenating halves wall-clock time; always extract spot-check frames before delivering a render.
- Packaging: title and thumbnail must complement, never repeat; whichever carries the promise, the other carries the intrigue. A recurring show keeps a thumbnail template (locked anchors vs per-episode variables) in the brand folder.
- Keep deliverables lean: one blessed asset per slot in `deliverables/`; alternates stay in `work/`.
