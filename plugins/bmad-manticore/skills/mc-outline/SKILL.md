---
name: mc-outline
description: Produce hook candidates, a tight outline, and the title/thumbnail promise for a Manticore project, then STOP for gate 1 approval. Use at the outline stage. Never writes the script.
---

# mc-outline

Gate 1. The deliverable is a decision artifact for the creator, not a script.

## Steps

1. Load the studio config (`uv run {project-root}/_bmad/scripts/resolve_config.py --project-root {project-root} --key modules.manticore`; empty means mc-setup has not run: stop and route the creator there) and this skill's own surface (`uv run {project-root}/_bmad/scripts/resolve_customization.py --skill {skill-root}`; run `{workflow.activation_steps_prepend}` now, `{workflow.activation_steps_append}` after this step, and hold `{workflow.persistent_facts}` as standing context). Resolve `paths` values against `{project-root}`. Read `project.json`, `braindump.md`, `{brand-path}/voice-bible.md` (hook section, if built), and the format profile. Confirm stage is `outline`.
2. Write 3 hook candidates. Each is built Target-Transformation-Stakes (who it is for, what they will be able to do, why it matters now) and uses the creator's braindump phrasing wherever a phrase fits. Note which braindump line each hook leans on.
3. Write ONE outline (not options): tight beat list from hook to payoff. Every beat cites the braindump passage that fills it. Order for retention: strongest material early, open loops closed late, no throat-clearing beat at the top. Where the braindump names something the viewer should see (a demo, a screen, a drawing, motion, a moment the creator pictures as a graphic), attach an optional visual-moment note to the beat, citing the braindump passage and marked non-binding: mc-beats reads these as candidate compositions, not commitments.
4. Write the packaging promise: the working title and thumbnail concept this video must pay off. Add a CTA plan line drawn from `[cta]` in the studio config: which configured CTA(s) this video will make and roughly where, sized to the configured appetite; if no CTAs are configured, the line says so. If the video cannot pay off a clickable promise, say so now; that is a project problem, not a packaging problem.
5. Write it all to `outline.md`, set `approvals.outline = "pending"`, update `artifacts`, present to the creator, and STOP.

## Gate behavior

Do not start the script. Do not describe what the script will say. Wait for the creator to approve, edit, or kill. On approval, record the ISO date in `approvals.outline`, append `outline` to `stages_done`, and set `stage` to the next entry in project.json's `stages` array.

## Checklist

- Exactly 3 hooks, one outline, one packaging promise with a CTA plan line.
- Every outline beat has a braindump citation; beats without material are marked GAP with a question to ask the creator.
- Visual-moment notes, where present, cite braindump material and are marked non-binding.
- Run `uv run {skill-root}/scripts/lint_script.py {projects-path}/<slug>/outline.md --blacklist {brand-path}/blacklist.md`; nothing in the artifact may violate the blacklist.
