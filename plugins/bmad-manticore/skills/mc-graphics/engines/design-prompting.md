# Engine: Design Prompting

The authoring path when no registry block or brand template fits a beat: hand the beat to a capable design model as a structured design brief, iterate on the look in a review surface, then render the agreed look deterministically. This pattern works with any design-capable model or surface; Claude (Claude Design, Artifacts, and Claude Code) is used as the worked example throughout because it is the reference implementation the pattern was proven on.

## The core rule

Design surfaces handle look and iteration, but pixels always come from deterministic frame-stepped rendering (Remotion render, or headless-Chrome frame stepping plus ffmpeg to ProRes 4444 alpha), never realtime screen recording.

Realtime capture gives no alpha channel, a variable frame rate, and dropped frames. Every deliverable render walks frames deterministically:

- Remotion path: `npx remotion render` with `--codec prores --prores-profile 4444 --pixel-format yuva444p10le` for the editor lane, and a second render with `--codec vp9 --pixel-format yuva420p` for the OBS/live lane. One comp, two renders, never two source comps.
- HTML path: a headless-Chrome harness seeks the animation to frame N, screenshots with a transparent background (`omitBackground: true` gives PNG alpha), then `ffmpeg -framerate {fps} -i frame_%05d.png -c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le overlay.mov`.

A design surface's live preview, a hosted review page, and any screen recording are review surfaces only, never deliverables.

## The determinism contract (required in every brief)

Designs authored in a chat or design surface default to wall-clock CSS animations that cannot be seeked. The contract that makes an HTML comp renderable:

- One single self-contained HTML file. No external requests of any kind (CDN scripts, fonts, images); inline or data-URI everything.
- All animation lives on one master timeline exposed as `window.seek(frame)`, which renders the exact state for that frame at the declared fps. Wall-clock CSS animations, `setInterval`, and `Date.now` are forbidden; use a seekable timeline (GSAP or WAAPI paused and seeked, or a pure function of frame).
- No unseeded randomness. Identical frame in, identical pixels out (render a frame twice and byte-compare to verify).
- Signal readiness: resolve `document.fonts.ready` before the first frame is captured.

For Remotion beats the contract is instead: composition with explicit `durationInFrames` and `fps`, all motion derived from `useCurrentFrame()`, no `Math.random` without Remotion's seeded `random()`.

## The design brief

The brief is a file (`graphics/briefs/<beat-id>.md`), reviewable and diffable. It packs everything the design model needs so nothing is left to guessing. Omissions are where renders fail. Template:

```markdown
# Design brief: <beat-id> (one-line description)

## Beat (timing is law: do not change it)

- start {mm:ss.ms} / dur {s} / end {mm:ss.ms} on the edited timeline
- {N} frames at {fps} fps ({WxH})
- anchor word: "{word}" at {ts}; the graphic's key moment lands ON the anchor
- spoken phrase it rides on: "{verbatim phrase from the transcript}"
- composition intent: {one line from the beat row / storyboard}

## Exact text (verbatim: render these strings and nothing else)

1. "{string}"
No paraphrasing, no added copy, no lorem ipsum, no watermarks.

## Canvas and alpha

- Fully transparent background. No full-frame backdrops, vignettes, or scrims.
- Every pixel not part of the graphic has alpha 0 (verified over checkerboard).
- Safe zones: keep inside {title-safe %}; the speaker occupies {region};
  nothing may overlap {region}.

## Brand (the only source of color and type: no hardcoded values)

<inline the full tokens.json>
- Follow any contrast/usage notes in the tokens exactly.
- Fonts load from the local files listed in the tokens; no external fonts.

## Look and motion feel (from the Production Bible)

- Feel: {3-5 adjectives from the bible's animation section}
- Overlay aesthetic: {surface treatment, radius, shadow/glow per the bible}
- Ease: tokens motion easeDefault for entrances, easeEmphasis for the hit.
- In/out: animate in over {x}ms, hold, resolve out over {y}ms fully inside
  the beat duration (or hold the last frame to a hard cut; pick one).

## Determinism contract (required for rendering)

<the contract above, verbatim>

## Acceptance (machine-verified)

- Frame 0: fully transparent or entrance just beginning.
- Frame at the anchor: key state fully resolved and legible, text verbatim.
- Final frame: fully resolved out (or held) per the in/out spec.
- ffprobe: {fps} fps, {WxH}, alpha present after render.
```

Sources for the brief: the approved beat row (timing, anchor, composition), the transcript excerpt verbatim, `{brand-path}/tokens.json` inlined, the Production Bible's aesthetic and motion language, the format profile's safe zones, and the alpha requirement. Timing comes from the beat table and is never invented or stretched by the design; timing changes route back through the creator as beat-table changes.

## The iterate loop

1. Brief: generate the brief file from the beat row, tokens, and the Production Bible.
2. Propose: the design model produces a candidate comp (self-contained HTML honoring the seek contract, or a Remotion comp when React-stateful).
3. Render one frame: seek to the anchor frame and render it. Cheap, fast, and catches most misses before any video render.
4. Critique against the bible: check the frame against the Production Bible's aesthetic language, the safe zones, the verbatim text, and alpha over checkerboard. Revise and repeat.
5. Review with the creator: the review surface may be a hosted page (a Claude Artifact is the worked example) showing the animation looping, a scrub slider driving the same `seek(frame)` the renderer will use, a checkerboard toggle to prove alpha, and a composite over a still frame extracted from the actual footage at the beat's start time so safe zones are checked against reality. The creator gives frame-referenced notes ("at 0:00.8 the underline overshoots"); each note feeds the next revision of the local source file, which stays the single source of truth.
6. Render and verify: draft render, then final ProRes 4444, then `{skill-root}/scripts/render_verify.py` (ffprobe pixel format, duration, fps, resolution, extracted frames checked over checkerboard). The verified ProRes 4444 render is the deliverable. A render without checked frames is not done.

## Translating the agreed look into engine code

Once the creator approves the look, it becomes durable engine code rather than a one-off:

- HyperFrames: port the comp into a themed block in the HyperFrames workspace, all colors and fonts read from tokens, timing parameterized so the block can be reused at other durations.
- Remotion: promote the comp into the Remotion workspace with `durationInFrames` and `fps` as props and all motion from `useCurrentFrame()`.
- OGraf: only when the target supports it (editor lane per `[editor] ograf-editable`, always for the live lane); rebuild the approved look as an OGraf graphic via mc-ograf rather than wrapping the HTML.
- Foreign HTML (exported from a design surface) is sanitized before entering a workspace: strip or inline every external reference, replace hardcoded colors and fonts with token references (a grep for hex literals not present in tokens is the lint), retrofit the seek contract, and double-render a frame to verify determinism.
- Record promoted blocks in the format profile's Templates section so future beats assemble them instead of redesigning.

Reusable ffmpeg motion primitives (fly-in and fly-out with optional whoosh, staged infographic builds) live at `{skill-root}/references/motion-recipes.md`; prefer them for simple moves before invoking the full design loop.

## Optional pattern: brand look-dev with a design-system surface

There is a second, upstream lane this module documents but does not depend on: pushing the brand kit (tokens plus preview cards for the reusable overlay family) into a design-system surface so the creator iterates on the brand's motion language visually, outside any specific video. With Claude the mechanism is DesignSync from Claude Code into a claude.ai/design design-system project; exports come back through the same sanitize-on-import pass above. This look-dev lane is an optional pattern only: the shipped 1.0 workflow is the per-beat design loop, and nothing in this engine requires a design-system surface to exist.

## Failure modes and guardrails

- Timing drift: designs love to breathe longer than the beat. The brief states timing is law; the verifier checks duration; changes route through the creator.
- Alpha leaks: subtle full-frame gradients kill overlays. The checkerboard toggle and extracted-frame checks catch this.
- Token drift: hardcoded colors from a design tool. Grep-lint on import.
- Text mutation: models paraphrase. Briefs mark text verbatim; the anchor-frame check includes reading the text.
- Review-vs-render confusion: the hosted preview is never the deliverable; the local frame-stepped render is.

## Worked example briefs

### Example 1: keyword callout (lower-third emphasis)

Transcript moment: at 03:12.4 the speaker says "the transcript IS the timeline: every cut and every graphic anchors to a word."

```markdown
# Design brief: b07-transcript-is-timeline

## Beat

start 03:12.0 / dur 4.5s / end 03:16.5 (135 frames @ 30fps, 1920x1080)
anchor word: "timeline" at 03:13.1; underline hit lands ON "timeline"
spoken phrase: "the transcript IS the timeline"
## Exact text

1. "THE TRANSCRIPT IS THE TIMELINE"
## Canvas and alpha

Transparent. Speaker occupies the right third; graphic lives lower-left,
inside 5% title-safe. Nothing crosses x > 60% of frame width.
## Brand

<tokens.json inline> Accent underline uses the accent color; text in the
primary text color on a surface-color chip at 85% opacity.
## Look and motion feel

Confident, snappy, engineered (per the bible). Chip slides up 24px and
fades in over durationBaseMs (easeDefault); accent underline draws
left-to-right over durationFastMs, timed to hit full width at the anchor
(easeEmphasis); the whole unit resolves out (slide down and fade) in the
final 400ms.
## Determinism contract / Acceptance

<standard blocks; key-state frame check at 03:13.1: text fully legible,
underline complete>
```

### Example 2: animated diagram that builds as the speaker names each stage

Transcript moment: 07:40-07:58, the speaker walks the pipeline: "brain dump... outline... script... cut... graphics." Word timestamps from the transcript give one reveal per named stage.

```markdown
# Design brief: b11-pipeline-build

## Beat

start 07:40.0 / dur 18.0s / end 07:58.0 (540 frames @ 30fps, 1920x1080)
anchors: "brain dump" 07:41.2, "outline" 07:44.8, "script" 07:48.1,
"cut" 07:51.9, "graphics" 07:55.0; each node and connector reveals ON its word
## Exact text

Nodes, in order: "BRAIN DUMP", "OUTLINE", "SCRIPT", "CUT", "GRAPHICS"
## Canvas and alpha

Transparent. Diagram occupies the upper 55% of frame, centered; the
speaker is lower-center. Inside title-safe.
## Brand

<tokens.json inline> Nodes: surface fill, border stroke, primary text
labels; connectors and the active-node glow use the accent color.
## Look and motion feel

Calm, systematic, additive. Each node scales 0.92 to 1.0 and fades in over
durationBaseMs (easeDefault); the connector draws toward the next node over
durationFastMs; previously revealed nodes dim to 70% so the current one
reads. The fully built diagram holds from 07:56 and holds the last frame
to the cut.
## Determinism contract / Acceptance

<standard blocks; per-anchor frame checks: exactly k nodes visible at
anchor k; SVG-based so strokes stay crisp at 4K>
```

### Example 3: cold-open title stinger (Remotion, dual render)

Transcript moment: the approved hook line opens the video; the stinger also serves as the live scene transition.

```markdown
# Design brief: b00-title-stinger (engine: Remotion)

## Beat

start 00:00.0 / dur 1.6s / end 00:01.6 (48 frames @ 30fps, 1920x1080)
(keep stingers 1 to 2 seconds; transparent WebM renders slowly)
## Exact text

1. "{approved video title, verbatim from the packaging promise}"
## Canvas and alpha

Transparent throughout; logo and title only, no backdrop. Center-weighted,
inside 5% title-safe, clear of the lower-third caption zone.
## Brand

<tokens.json inline> Logo asset inlined as a data URI; title in the
heading font at weight 700, primary text color; accent sweep in the
accent color.
## Look and motion feel

Kinetic, premium, over fast. The logo mark snaps in with an easeEmphasis
scale-settle (no bounce past 1.02); the accent sweep wipes behind the
title as it tracks in; everything exits with a fast upward wipe in the
last 12 frames so the footage is revealed clean.
## Determinism contract

Remotion composition, durationInFrames=48, fps=30; all motion from
useCurrentFrame() via interpolate/spring; no unseeded randomness.
## Deliverables

ONE comp, TWO renders: ProRes 4444 (yuva444p10le) MOV for the editor,
VP9 yuva420p WebM for the live lane. Never two source comps.
## Acceptance

Frame 0 and frame 47 fully transparent; ffprobe confirms alpha in both
outputs; title text verified verbatim at the hold frame.
```
