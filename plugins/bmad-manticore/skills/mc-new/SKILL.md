---
name: mc-new
description: Scaffold a new Manticore video project from a format profile, idea-first or footage-first. Use when the creator greenlights an idea ("new video", "start a project", "let's make the X video") or wants a video built from existing footage ("cut this VOD", "make a video from this recording").
---

# mc-new

## Entry points

A project starts one of two ways; establish which before anything else.

- Idea-first (default): the creator greenlights an idea and the project runs the full pipeline from braindump. Any format profile works.
- Footage-first: the footage already exists (a livestream VOD, a recorded talk, a conference session). The project skips ideation entirely and goes straight to post-production; the source file is registered at creation and the next stage is cut. This requires a footage-first format profile, one whose stage list contains no ideation stages (e.g. livestream-vod).

## Steps

1. Load the studio config (`uv run {project-root}/_bmad/scripts/resolve_config.py --project-root {project-root} --key modules.manticore`; empty means mc-setup has not run: stop and route the creator there) and this skill's own surface (`uv run {project-root}/_bmad/scripts/resolve_customization.py --skill {skill-root}`; run `{workflow.activation_steps_prepend}` now, `{workflow.activation_steps_append}` after this step, and hold `{workflow.persistent_facts}` as standing context). Resolve `paths` values against `{project-root}`.
2. Establish the entry point, slug (kebab-case), format (must match a profile in `{formats-path}/`), and working title. For footage-first, also get the absolute path to the source footage file; the format must be a footage-first profile, and if none exists yet, route the creator to mc-setup to add one (e.g. livestream-vod) rather than forcing an ideation profile.
3. Ask two scoping questions before scaffolding:
   - Series: is this an episode of a series? If yes, get the series slug (kebab-case). Episodes live in a series folder under `{projects-path}` with a shared `common/` folder for evergreen assets (chrome, stingers, recurring graphics), and stages that read brand templates apply per-series packaging.
   - Deadline: does an external event gate delivery (a conference, a launch, a scheduled premiere)? If yes, get the date (ISO, YYYY-MM-DD). Recording it puts the project in deadline mode: downstream stages order deliverables by hard external gates and cap iteration loops in favor of good-enough delivery. If nothing external gates delivery, leave it unset; an aspirational date is not a deadline.
4. Run: `uv run {skill-root}/scripts/new_project.py <slug> --format <format> --title "<title>" --projects-dir {projects-path} --formats-dir {formats-path}`, adding the flags the answers call for: `--parent <slug>` for a short cut from a long-form parent, `--series <series-slug>` for an episode, `--deadline YYYY-MM-DD` for an event-gated project, and `--ingest <absolute-footage-path>` for footage-first (with `--source-id` and `--source-role primary|interview|screen` when the defaults do not fit).
5. Fill `brief.md`. Idea-first: one paragraph of the idea in the creator's words, why now, and links to source material (idea notes, prior material). Footage-first: what the footage is, what the finished video should become, and any moments the creator already knows matter. Do not invent content; ask if the brief is thin.
6. Report the created project and hand off: idea-first goes to `braindump` (mc-braindump); footage-first goes to `cut` (mc-cut). Trust `stage` in `project.json` either way.

## Checklist

- Slug is kebab-case and not already taken (within its series folder, if any).
- Format profile exists and its stage list landed in `project.json`.
- brief.md links back to wherever the idea came from so its history stays findable.
- Footage-first: the source file exists on disk, is registered in `sources` in `project.json`, and the stage list contains no ideation stages.
- Series: the project sits in the series folder beside `common/`, and the `series` field is set in `project.json`.
- Deadline: only set when a real external event gates delivery, and it is an ISO date.
