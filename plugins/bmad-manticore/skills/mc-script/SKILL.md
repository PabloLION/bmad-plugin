---
name: mc-script
description: Weave the full script from the approved outline using the creator's braindump words under the quote-or-cut contract, lint it, and run the craft QA. Use at the script stage, only after gate 1 (outline) is approved.
---

# mc-script

The anti-LLM-slop stage. The script is woven, not written.

## Steps

1. Load the studio config (`uv run {project-root}/_bmad/scripts/resolve_config.py --project-root {project-root} --key modules.manticore`; empty means mc-setup has not run: stop and route the creator there) and this skill's own surface (`uv run {project-root}/_bmad/scripts/resolve_customization.py --skill {skill-root}`; run `{workflow.activation_steps_prepend}` now, `{workflow.activation_steps_append}` after this step, and hold `{workflow.persistent_facts}` as standing context). Resolve `paths` values against `{project-root}`. Read `project.json` (confirm `approvals.outline` is a date, stage is `script`), `outline.md`, `braindump.md`, `{brand-path}/voice-bible.md`, 1 to 2 files from `{brand-path}/exemplars/`, and the format profile.
2. Weave beat by beat under the quote-or-cut contract:
   - Default move: lift the creator's braindump phrasing directly, smoothing only for spoken flow.
   - Every sentence either traces to a braindump passage or carries an inline `[INVENTED]` flag. Flags are for connective tissue only; if a content claim needs inventing, the braindump has a gap: ask the creator instead.
   - Write the hook LAST, from the approved candidate, once the body proves what the hook can promise.
   - Weave the configured CTA line(s) from `[cta]` in the studio config, following the outline's CTA plan line and craft rule 15: raise stakes before the ask, lower the barrier right before it, end on ease. CTA copy is the one sanctioned exception to quote-or-cut: it comes from the configured items (kind, label, url), not the braindump, and needs no `[INVENTED]` flag. If `[cta]` is empty, weave no ask rather than invent one.
   - If project.json `sources` has an `interview` recording, transcribe it if not yet done (mc-cut's transcribe.py) and mark every script line whose phrasing was already spoken well on camera with an inline `[TAKE <source-id> <start>s-<end>s]` from the word timestamps. Those lines may not need re-recording, only reorganizing at the cut stage.
3. Lint: `uv run {skill-root}/scripts/lint_script.py {projects-path}/<slug>/script.md --blacklist {brand-path}/blacklist.md`. Fix every violation before presenting.
4. Craft QA: run the checklist at `{workflow.craft_checklist}` (relative paths resolve against `{skill-root}`; default is the packaged 16-rule list), plus the manual QA list at the bottom of the creator's blacklist. Fix, do not annotate around, failures.
5. Compute runtime from the real word count at the creator's measured wpm (`[owner] wpm` in the config) and state it. Flag if it misses the format's target length.
6. Write `script.md` (with the `[INVENTED]` flags still visible), update project.json (append `script` to `stages_done`, set `stage` to the next entry in its `stages` array), and present. Tell the creator the ball is theirs: record, drop takes in `raw/` at constant frame rate. If `[TAKE ...]` markers exist, list the delta explicitly: which lines are already captured on the interview recording and which still need recording.

## Rules

- No stage directions, no camera notes, no "(pause)" theater unless the creator asked for them.
- Read the script aloud in your head at their pace; anything you stumble on, they will too.
- If more than roughly a quarter of sentences would need `[INVENTED]`, stop and send it back to mc-braindump: the raw material is not there yet.
