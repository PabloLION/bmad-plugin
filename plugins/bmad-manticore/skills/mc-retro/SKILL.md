---
name: mc-retro
description: Post-publish feedback ratchet and wrap-up. Takes the creator's notes on a finished video and edits the format profile, blacklist, voice bible, production bible, and offending skill files so the pipeline compounds, then offers the post-publish wrap lane (archive hygiene, asset promotion). Runs with or without project.json. Use after a video ships, whenever the creator gives pipeline feedback, or to wrap up a published project.
---

# mc-retro

The compounding mechanism: feedback edits FILES, not just memory. Every note improves the taste files the next run obeys. Two lanes: retro (route notes into taste files) and wrap (post-publish cleanup and asset promotion). Retro runs first and offers wrap after; the creator can also request wrap on its own for an already-retroed project.

## Steps

1. Load the studio config (`uv run {project-root}/_bmad/scripts/resolve_config.py --project-root {project-root} --key modules.manticore`; empty means mc-setup has not run: stop and route the creator there) and this skill's own surface (`uv run {project-root}/_bmad/scripts/resolve_customization.py --skill {skill-root}`; run `{workflow.activation_steps_prepend}` now, `{workflow.activation_steps_append}` after this step, and hold `{workflow.persistent_facts}` as standing context). Resolve `paths` values against `{project-root}`. Then establish the target:
   - With a project: read `project.json` (stage `retro`) and take the format from it.
   - Without `project.json` (ad-hoc run): ask the creator which format profile in `{formats-path}` the notes concern, or which brand file directly (`voice-bible.md`, `blacklist.md`, `production-bible.md`), and route notes to that target. Skip the `project.json` bookkeeping in step 7; everything else applies, so ad-hoc feedback still compounds.

   Read the taste files that may receive edits: `{brand-path}/voice-bible.md`, `{brand-path}/blacklist.md`, `{brand-path}/production-bible.md`, and the target format profile. Collect the creator's notes: what felt wrong, what they re-edited in their editor, what they rewrote in the script, what looked off on screen, packaging performance (Test & Compare results if run).
2. Route every note to the file that would have prevented it:
   - voice/wording miss: `{brand-path}/voice-bible.md` (new rule with the verbatim example) and/or a new pattern in `{brand-path}/blacklist.md`,
   - visual style miss (graphics density, overlay aesthetic, image-type choice, CTA placement): `{brand-path}/production-bible.md`, in the global section or the matching per-format override section; ISO-dated, one-way ratchet (entries only accumulate; a change of taste gets a new dated entry that supersedes by date, never a deletion),
   - structural/retention miss: the Learnings section of `{formats-path}/<format>.md` (ISO-dated, newest first),
   - a stage doing the wrong thing: that skill's SKILL.md (note: skill edits apply to the installed module and may be overwritten by module updates; prefer profile/brand files when the note fits there; if the harness blocks access to another skill's folder, record the note in the format profile's Learnings instead),
   - a tool being driven wrong: the `notes` field of that tool's `[[tools]]` entry in the studio config (`[modules.manticore]` in `{project-root}/_bmad/custom/config.toml`),
   - a mechanical failure: an issue note in the relevant engine README or script docstring,
   - a pipeline gap (a stage could not do its job because the module itself is missing a feature, has a wrong contract, or a broken mechanic): append an entry to the studio improvements log (see Improvements log below), in addition to any local fix above.
3. Make the edits. Small and surgical: one note, one edit, at the point of failure. Show the creator the diff summary.
4. If the cut stage's judgment was overridden repeatedly in the editor, mine the pattern (e.g. "always keep pre-demo breaths") into the format profile's Learnings.
5. Offer the wrap lane (below). Run it if the creator accepts, or if they invoked mc-retro for wrap directly.
6. In `project.json` (skip on ad-hoc runs), append `retro` to `stages_done` and set `stage` to `done`, append retro notes (and whether wrap ran) to its `notes` field, and report.

## Wrap lane

Post-publish cleanup for a shipped project. Requires a project folder; run in order, no skipping ahead.

1. Confirm the published master is safe. The creator confirms the final master exists at its published or archived location before anything is reclaimed. This confirmation is a hard stop: nothing below runs on assumption.
2. Reclaim reproducible render scratch: preview renders, intermediate proxies, render caches, anything regenerable from `edl.json` plus the sources. List every candidate with its size, subtract anything matching `{wrap.preserve}`, and delete only after the creator approves the list. Never candidates: source footage, transcripts, `edl.json`, the cutplan, overlays, `project.json`, and the master itself.
3. Enforce one blessed asset per slot: for each asset slot (thumbnail, title card, any overlay with multiple candidates), keep only the shipped version in the slot; rejected candidates move to the reclaim list or an archive folder, the creator's choice.
4. Promote evergreen assets: anything useful beyond this video (reusable overlays, diagrams, series templates) moves to the series `common/` folder beside its project folders under `{projects-path}`; anything brand-wide moves to `{brand-path}`. Write or update a `README.md` in each destination listing each promoted asset, the project it came from, and the ISO date.
5. Keep transcripts. Transcripts are never reclaimed; they are the cheapest permanent record of what was said.
6. Write any durable rules discovered during wrap into the format profile's Learnings and `{brand-path}/production-bible.md`, same ratchet as step 2.

## Improvements log

The structured upstream feedback channel. mc-retro, and any stage that hits a pipeline gap mid-run, appends to a studio-level log so module maintainers get comparable reports from every studio.

- Location: `improvements-log.md` in the studio root, the parent folder of `{brand-path}` (with default paths that is `manticore/improvements-log.md`). Create it with a `# Improvements log` heading if missing.
- Entry format, one line per entry, append-only, newest first under the heading:

  `- YYYY-MM-DD [stage/skill]: what happened; why it is a gap; suggested fix; severity: low|medium|high`

- Entries describe module gaps, not creator taste. Taste goes to the brand and format files per step 2.

## Rules

- One round of notes per session; do not fish for endless feedback.
- Never weaken a gate or remove a hard rule in response to convenience feedback; flag those for the creator explicitly.
- Blacklist, Learnings, the production bible, and the improvements log only grow; deletions are the creator's call.
- Wrap deletes nothing the creator has not seen listed, and never runs past step 1 without the published-master confirmation.
