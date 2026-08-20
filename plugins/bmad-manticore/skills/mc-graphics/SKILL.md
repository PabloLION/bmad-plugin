---
name: mc-graphics
description: Execute the approved beat table in HyperFrames/Remotion/OGraf/HTML, render, frame-verify, and deliver alpha overlays plus a HANDOFF for the creator's editor. Use at the graphics stage, only after gate 3 (beats) is approved.
---

# mc-graphics

## Steps

1. Load the studio config (`uv run {project-root}/_bmad/scripts/resolve_config.py --project-root {project-root} --key modules.manticore`; empty means mc-setup has not run: stop and route the creator there) and this skill's own surface (`uv run {project-root}/_bmad/scripts/resolve_customization.py --skill {skill-root}`; run `{workflow.activation_steps_prepend}` now, `{workflow.activation_steps_append}` after this step, and hold `{workflow.persistent_facts}` as standing context). Resolve `paths` values against `{project-root}`. Read `project.json` (confirm `approvals.beats` is a date, stage `graphics`), `beats/beats.md`, `beats/STORYBOARD.md`, `{brand-path}/tokens.json`, `{brand-path}/production-bible.md` (the styling contract beyond tokens.json: overlay aesthetic, motion feel, image-type policy, placement rules), the format profile, and `{skill-root}/engines/<engine>.md` for each engine the table names. Beats marked OGraf route through the mc-ograf skill, and ONLY if `[editor] ograf-editable = true`; otherwise build them as baked alpha overlays like everything else (baked alpha works in every editor).
2. Engine workspaces live at `{engines-path}/<engine>/`; initialize on first use per the engine README (pin versions).
3. Source before authoring: for each beat, check the engine registry/library for a fitting block (`npx hyperframes add`, existing brand-themed blocks in the engine workspace); for simple moves on a finished still (fly-in and fly-out, staged builds), prefer the ffmpeg recipes in `{skill-root}/references/motion-recipes.md`; when nothing fits, author from scratch via the html lane (`{skill-root}/engines/html.md`) or the design-prompting loop (`{skill-root}/engines/design-prompting.md`). Everything themes through tokens.json, no hardcoded colors or fonts.
4. Build per engine in the project's `graphics/` folder. Follow the loop: edit, lint, preview, draft render (CRF 28), single-frame verify, final render. The shipped toolkit does the mechanical parts: `{skill-root}/scripts/html_to_png.py` (exact-size HTML render, separate `--guides` pass, alpha verify) and `{skill-root}/scripts/snug_frame.py` (native-aspect photo framing). Sound: when a composition calls for a whoosh, hit, chime, or bed (the animation-feel conventions in the Production Bible say when), route through the mc-audio service skill (never reach into its folder) and deliver the wav into `graphics/` next to the overlay it belongs to, with its timing noted in HANDOFF.md.
5. Verify every final render with `uv run {skill-root}/scripts/render_verify.py`, passing expectations explicitly: `--pixfmt` per the delivery target, `--expect-dur` from the beat's dur, `--expect-fps` and `--expect-res` from the format profile, or `--meta` pointing at the comp's meta.json render contract carrying the same keys (extracted frames visually checked over checkerboard for alpha). A render without checked frames is not done.
6. Self-review gate before presenting any batch: zoom-inspect every asset (read every string, check edges and alpha fringes), check each against the Production Bible's aesthetic language, and ask of each one "is this the best you could do?". Fix what fails before the creator sees anything.
7. Write `graphics/HANDOFF.md`: per beat, the rendered file, its timeline position (from the beat table), track suggestion, and any editor notes (OGraf items go in as editable graphics, not MOVs).
8. Trigger the composited preview: `graphics/` now holds rendered overlays, so `renders/preview.mp4` must re-render with them composited. That render belongs to mc-cut, and this skill never runs another skill's scripts: hand back to mc-pipeline, which routes through mc-cut's composited preview re-render (its "Composited preview (after graphics)" section) before the next stage skill runs. The same hand-back applies whenever a later overlay fix re-renders anything in `graphics/`.
9. Update project.json artifacts, advance stage per the profile (usually `assets`, or `package` where assets is absent), and report, naming the composited preview hand-back from step 8 so it is not skipped.

## Craft rules

- Relevance gate: every popup must visibly connect to the words being spoken at its anchor. A viewer pausing at the anchor frame should see WHY this graphic is on screen; a graphic that needs the storyboard to explain it fails the gate.
- Transcript fact-check: any claim-bearing graphic (numbers, dates, quotes, names, titles, announcements) is checked against the transcript verbatim before render. Never invent an announcement, statistic, or quote the speaker did not say.
- Never guess external references: video IDs, channel names, people's names, and spellings are verified against a source or asked about, never guessed. Prefer the project's people-glossary when one exists; when a reference cannot be verified, ask the creator instead of rendering a guess.
- Deliverable images never contain placeholder or helper text: no lorem ipsum, no "TODO", no safe-zone markers, no annotation arrows. Guides go in a separate `--guides` render plus a written spec; the deliverable contains only final content.
- QC sweep: when the creator corrects one asset, treat the correction as a defect CLASS, not a one-off. Audit the whole library for the same defect and fix every instance before re-rendering anything.
- Compositing defaults: never shrink or letterbox the source video to make room for graphics. Composite over the full frame in detected safe zones (find the talking-head region and place around it); photos get snug native-aspect frames, never uniform letterboxed panels.

## Rules

- The beat table is law. A composition that wants different timing goes back through the creator, not silently changed.
- Overlay exports are ProRes 4444 with alpha; anything else is a bug (except OGraf, which ships as its own editable format).
- New reusable compositions get promoted to the engine workspace and noted in the format profile's Templates section.
