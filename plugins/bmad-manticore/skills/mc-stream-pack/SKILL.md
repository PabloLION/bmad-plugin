---
name: mc-stream-pack
description: Produce a complete branded livestream asset pack for OBS (scenes, stinger, lower thirds) from brand tokens. Use with the livestream-pack format or when the creator asks for stream assets.
---

# mc-stream-pack

Brand tokens in, complete pack out. Spec lives in the `livestream-pack` format profile; this skill executes it.

## Steps

1. Load the studio config (`uv run {project-root}/_bmad/scripts/resolve_config.py --project-root {project-root} --key modules.manticore`; empty means mc-setup has not run: stop and route the creator there) and this skill's own surface (`uv run {project-root}/_bmad/scripts/resolve_customization.py --skill {skill-root}`; run `{workflow.activation_steps_prepend}` now, `{workflow.activation_steps_append}` after this step, and hold `{workflow.persistent_facts}` as standing context). Resolve `paths` values against `{project-root}`. Read `project.json` (stage `stream-pack`), the `livestream-pack` format profile, `{brand-path}/tokens.json`, and `{brand-path}/production-bible.md` when it exists (the styling contract beyond tokens: overlay and popup aesthetic for scenes and lower thirds, per-series template sections, and the CTA section). The OGraf standards apply to the lower thirds; the mc-ograf skill enforces them in step 2.
2. Build the pack the profile specifies (scene list, reactivity, render formats, and durations come from the profile, not from here): static scenes as self-contained local HTML in `graphics/scenes/`, all styling from tokens.json; the stinger as one Remotion comp in `{engines-path}/remotion/`, rendered to both formats the profile names; lower thirds and topic cards via the mc-ograf skill (never reach into its folder). Sound for the pack (the stinger whoosh, a Starting Soon music bed) routes through the mc-audio service skill the same way; deliver the wavs alongside the scenes with OBS wiring noted in HANDOFF.md. This live lane does not require `[editor] ograf-editable`; OBS/SPX-GC is editor-independent.
3. Verify, not vibes: run the profile's verification section. Scene screenshots land in `graphics/_verify/` and every one is visually checked; stinger checks run via `uv run {skill-root}/scripts/render_verify.py`.
4. Write `graphics/HANDOFF.md`: OBS setup steps per asset (browser source URLs/sizes, stinger transition settings). Update project.json artifacts and advance stage per the profile's stages list (next after `stream-pack`, normally `final`): the creator loads the pack in OBS and approves the look live.

## Checklist

- Every scene screenshot visually checked; no scene ships unseen.
- Countdown actually resets on scene re-activation (test via the obsstudio event or document it as OBS-only behavior).
- No NodeCG, no alert plumbing in v1.
