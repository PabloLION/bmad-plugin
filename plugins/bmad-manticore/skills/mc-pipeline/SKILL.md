---
name: mc-pipeline
description: Manticore pipeline manager. Reports where a video project stands and routes to the next stage skill. Zero creative instruction. Use for "where is my project", "what's next", "run the pipeline", or when unsure which stage skill applies.
---

# mc-pipeline

The manager. Contains no creativity and makes no taste calls.

## Steps

1. Load the studio config (`uv run {project-root}/_bmad/scripts/resolve_config.py --project-root {project-root} --key modules.manticore`; empty means mc-setup has not run: stop and route the creator there) and this skill's own surface (`uv run {project-root}/_bmad/scripts/resolve_customization.py --skill {skill-root}`; run `{workflow.activation_steps_prepend}` now, `{workflow.activation_steps_append}` after this step, and hold `{workflow.persistent_facts}` as standing context). Resolve `paths` values against `{project-root}`. Read `{skill-root}/PIPELINE.md` (the stage table and project.json contract) if not already in context.
2. If no project was named: list `{projects-path}/*/project.json`, show a one-line status per project (slug, format, stage, pending approvals), and stop.
3. For the named project, read `project.json` and report:
   - current `stage` and what artifact it produces,
   - any approval sitting at `"pending"` (the creator owes a decision; nothing moves until they give it),
   - artifacts produced so far.
4. Route: name the mc-* skill for the current stage (see the stage table in PIPELINE.md) and invoke it if the creator asked to proceed. Route by the project's own `stages` array, never the master list: footage-first projects (created by mc-new's ingest mode) carry the ingest-first list (`new`, `cut`, `beats`, `graphics`, `assets`, `package`, `final`, `retro`) and never visit the ideation stages. One standing extra hop: when the graphics stage completes (mc-graphics hands back with `graphics/` holding rendered overlays), route through mc-cut's composited preview re-render (its "Composited preview (after graphics)" section) before invoking the next stage skill, and again whenever an overlay is later re-rendered.
5. If the stage owner is the creator:
   - record: say exactly what they need to do (record takes at constant frame rate into `raw/`) and stop.
   - final: branch on `[render]` `self-render` in the studio config. When true (the default), route to mc-cut's offered renders: the fast low-res preview for iteration and the final-quality render offer at gate 4. When false, the finish is editor-only: point the creator at the always-exported timeline and assets (edl.json, cutplan, overlays, the timeline file per `[editor]` timeline-format) and stop. Either way gate 4 closes only on the creator's recorded approval of a deliverable.

## Rules

- Never skip a stage or reorder `stages`; the format profile decided that at creation.
- Never mark an approval yourself. Only the creator's explicit say-so in conversation converts `"pending"` to an ISO date.
- If `project.json` is missing or malformed, stop and report; do not reconstruct state by guessing.
