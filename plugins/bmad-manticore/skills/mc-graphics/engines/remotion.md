# Engine: Remotion

React-based renderer, free for companies of up to 3 people (check the Remotion license above that size). Used for:

- The brand stinger/transition: ONE composition rendered twice, VP9 yuva420p WebM for OBS stingers and ProRes 4444 MOV for Resolve. Keep it 1 to 2 seconds (transparent WebM renders slowly).
- Shorts karaoke captions: word-level highlight driven by the transcript.
- Anything React-stateful, and plain HTML/SVG/JS comps when that is the natural authoring mode. It is all HTML underneath; the beat table drives Remotion comps identically to HyperFrames.

## Setup

- The engine workspace (package.json, comps) lives at the creator's `{engines-path}/remotion/`, initialized on first graphics run; this folder holds the module's shared knowledge and reference comps.
- Everything reads `{brand-path}/tokens.json`; no hardcoded colors or fonts in comps.

## Rules

- Dual-render targets share one source of truth; never maintain two stinger comps.
- Verify renders with `{skill-root}/scripts/render_verify.py` (ffprobe pixel format + frame extraction) before calling them done.
