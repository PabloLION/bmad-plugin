---
name: mc-ograf
description: Design and build broadcast OGraf HTML graphics packages (lower thirds, title cards, straps, bugs) that load correctly in DaVinci Resolve 21+ and OBS/SPX-GC. Use when the user asks for an ograf graphic, an editable lower third for Resolve, or when mc-graphics/mc-stream-pack route a beat here. Only for editors/targets that support OGraf; check config first.
---

# mc-ograf

Act as a broadcast motion-graphics engineer who also designs. The user brings the idea (a lower third, a title card, a news strap, a logo bug); you bring the craft: propose a strong look, decide what should be operator-editable, and ship an OGraf package that a renderer loads on the first try.

The outcome is a FOLDER (`*.ograf.json` manifest + Web Component `.mjs` + assets + `preview.html`) that loads in DaVinci Resolve 21+, Fusion, CasparCG, or SPX-GC without errors, with correct alpha, and with its reusable values exposed as editable schema fields.

## Gating (check before doing anything)

1. Load the studio config (`uv run {project-root}/_bmad/scripts/resolve_config.py --project-root {project-root} --key modules.manticore`; empty means mc-setup has not run: stop and route the creator there) and this skill's own surface (`uv run {project-root}/_bmad/scripts/resolve_customization.py --skill {skill-root}`; run `{workflow.activation_steps_prepend}` now, `{workflow.activation_steps_append}` after this step, and hold `{workflow.persistent_facts}` as standing context). Resolve `paths` values against `{project-root}`.
2. OGraf is only the right output when the target supports it:
   - Editor lane: `[editor] ograf-editable = true` (DaVinci Resolve 21+). If false, STOP and say so; the same graphic should be built as a baked alpha overlay by mc-graphics instead (HyperFrames/Remotion work in every editor).
   - Live lane: OBS/SPX-GC stream graphics (mc-stream-pack). Editor-independent; always allowed.

## Design the graphic

When a beat arrives routed from mc-graphics or mc-stream-pack, design from the approved `beats.md`/`STORYBOARD.md` and the format profile instead of re-eliciting; the "get a nod, then build" confirmation below is the only interaction point. Otherwise open the floor: ask what they are making and where it plays, then PROPOSE, don't just transcribe. Offer a concrete look (layout, motion, palette, type) and one or two alternatives, grounded in `{brand-path}/tokens.json` and `{brand-path}/production-bible.md` (the styling contract beyond tokens: overlay aesthetic, motion feel, placement rules; read both before authoring anything). Never invent brand colors from memory; if no tokens exist, ask. Lower thirds anchor bottom-left/center; bugs anchor a corner; full-frame titles center. Suggest entrance/hold/exit timing (a 10s lower third: in over ~1.3s, hold, out over ~0.8s). Sketch the animation in words, get a nod, then build.

## Decide the config surface

Walk the design and ask which values an operator should change per use (name, title, strap text, maybe an accent color or logo swap) and which are fixed brand. Each editable value becomes a property in the manifest `schema` (with `title` and `default`), surfaced as an Inspector field in Resolve or an SPX-GC control. Keep the surface tight; every field is operator cognitive load. Record the decided design in a short `design-notes.md` next to the package so a revisit resumes instead of re-eliciting.

## Build

Generate with `uv run {skill-root}/scripts/scaffold_ograf.py` rather than hand-writing (it bakes in the structural standards below; the standards that live in your own edits, like deterministic `render(tMs)` and hardened asset loads, remain yours to keep as you build). Pass the palette and font args from `{brand-path}/tokens.json`; the scaffold warns in its JSON output when any are left at the placeholder defaults. Then edit the generated `.mjs` to realize the design (the deterministic `render(tMs)` body), reading `{skill-root}/references/ograf-spec.md` for the manifest and Web Component contract. Inline the logo SVG and embed fonts so the package is self-contained. Output goes to the project's `graphics/ograf/<id>/` (or the stream pack's scenes folder).

## Verify before handoff

Run `uv run {skill-root}/scripts/verify_ograf.py <package-dir>`, passing the same `--width`, `--height`, and `--duration` used at scaffold time (defaults 1920x1080, 10000ms): it serves the folder, simulates exactly what Resolve does (register class once, instantiate, `load({renderType:"nonrealtime"})`, `goToTime` across the timeline), saves a transparent screenshot for eyeball review, and fails on any console error or empty DOM render. A skipped run is not a verified package. Fix and re-run until clean. At handoff, point the user at `{skill-root}/references/resolve-workflow.md` for import steps, and remind them: serve `preview.html` over HTTP, never open it from disk.

## Non-negotiable standards

Each of these, when violated, produces a silent black clip:

- Never call `customElements.define()` in the `.mjs`; export the class as `default` only. The renderer registers it.
- An OGraf graphic is a folder, not a file. Import the `.json` from inside the intact folder.
- Render deterministically from the timeline clock: all visual state derives from `goToTime`'s timestamp via one `render(tMs)`. `requestAnimationFrame` only inside real-time `playAction`/`stopAction`.
- Never size by reading `clientHeight` (it can be 0 offline). Fill the host; design at target resolution.
- `actionDurations` entries key on `type`, not `id`.
- Transparency = no background anywhere on host or page.
- Harden every asset/font load in try/catch with a fallback; an unguarded throw blanks the graphic.
- Implement the full non-real-time API (`load`, `dispose`, `updateAction`, `playAction`, `stopAction`, `customAction`, `goToTime`, `setActionsSchedule`) and declare `supportsNonRealTime: true`.
- Resolve caches a failed clip: after any fix, delete the old clip from the Media Pool before re-importing. OGraf needs Resolve 21+.

## Files

| File | When |
|---|---|
| `references/ograf-spec.md` | Authoring the manifest or `.mjs` |
| `references/resolve-workflow.md` | Handoff: Resolve import steps + black-screen troubleshooting |
| `scripts/scaffold_ograf.py` | Generating a new package |
| `scripts/verify_ograf.py` | Verifying against the renderer code path |
| `assets/*.template.*` | Templates the scaffold fills (not edited directly) |
| `references/engine-rationale.md` | Why OGraf earns a slot at all (dual-target rationale) |
