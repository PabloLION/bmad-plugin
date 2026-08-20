# PIPELINE.md: The State Machine

The master spec for the Manticore pipeline, owned by mc-pipeline (the router). It defines the stages, the artifacts each stage produces, the approval gates, and the `project.json` contract. Each stage skill is self-contained and carries its own steps, but everything below is the contract they conform to.

Conventions used below:

- The studio config is the `[modules.manticore]` table in `{project-root}/_bmad/custom/config.toml` (personal overrides in `config.user.toml`), created by mc-setup and resolved with `uv run {project-root}/_bmad/scripts/resolve_config.py --project-root {project-root} --key modules.manticore`. Table names like `[owner]`, `[paths]`, `[video]`, `[render]`, `[style]`, `[cta]`, `[live]`, `[editor]`, `[transcription]`, `[assets]`, `[mcp]` refer to its sub-tables. (`[defaults.*]` names appear only inside mc-setup's `customize.toml`, the seed that mc-setup copies from; a resolved studio config has no `[defaults]` table.)
- `{projects-path}`, `{brand-path}`, `{formats-path}`, `{engines-path}` are the `[paths]` values resolved against `{project-root}`. If `[modules.manticore]` is empty, run mc-setup first; no stage skill proceeds without it.
- Per-skill defaults and overrides live in each skill's `customize.toml`, resolved with `uv run {project-root}/_bmad/scripts/resolve_customization.py --skill {skill-root}`. Skills read only their own folder and project files, never another skill's folder.
- "the creator" is the human owner configured in `[owner]`; skills address them by their configured name.

## Stage sequence (master list)

Format profiles select a subset of these stages (see the `stages:` frontmatter of `{formats-path}/<format>.md`). A lane format may also declare a stage that is not in the master list (the livestream-pack format's `stream-pack` stage, owned by mc-stream-pack). The routing rule is uniform either way: a stage named `<stage>` is owned by the `mc-<stage>` skill, except the creator-owned stages (`record`, `final`) marked in the table below. The master order is:

| # | Stage | Owner | Gate | Artifacts produced (inside `{projects-path}/<slug>/`) |
|---|---|---|---|---|
| 1 | new | mc-new | | `project.json`, `brief.md` |
| 2 | braindump | mc-braindump | | `braindump.md` (verbatim) |
| 3 | outline | mc-outline | gate 1: outline | `outline.md` (hooks + outline + packaging promise) |
| 4 | script | mc-script | | `script.md` (lint passed, craft QA passed) |
| 5 | record | the creator | | `raw/*` recordings, constant frame rate |
| 6 | cut | mc-cut | gate 2: cutplan | `transcript/words.json` (suffixed `<source-id>.words.json` when a project has multiple sources), `cut/candidates.json`, `cut/cutplan.md`, `cut/edl.json`, `cut/rough.fcpxml` (per `[editor] timeline-format`; `none` skips), `renders/preview.mp4` (fast low-res preview, re-rendered each iteration; once stage 8 has rendered overlays, the router sends the project back through mc-cut to re-render it with graphics composited) |
| 7 | beats | mc-beats | gate 3: beats | `beats/beats.md` (the beat table), `beats/STORYBOARD.md` |
| 8 | graphics | mc-graphics | | `graphics/` alpha MOVs + `graphics/HANDOFF.md`; on completion the router routes through mc-cut to re-render `renders/preview.mp4` with the overlays composited |
| 9 | assets | mc-assets | | `assets/` + `assets/manifest.json` |
| 10 | package | mc-package | | `packaging/titles.md`, `packaging/thumbs/`, `packaging/description.md`, `packaging/chapters.md` |
| 11 | final | the creator, with an offered pipeline render | gate 4: final | `renders/final.mp4` (the offered final-quality render: same EDL, graphics composited from the beat table, delivery resolution and codec per `[render]`), or the creator's own editor render into `renders/` |
| 12 | retro | mc-retro | | edits to `{formats-path}/<format>.md` learnings + offending skill files |

Stages 8 and 9 may run in parallel once gate 3 is approved. Stage 10 may start any time after gate 1 (the packaging promise exists from the outline).

## project.json contract

```json
{
  "slug": "example-video",
  "title": "",
  "format": "talking-head",
  "created": "2026-07-03",
  "parent": null,
  "stage": "braindump",
  "series": null,
  "stages": ["new", "braindump", "outline", "script", "record", "cut", "beats", "graphics", "assets", "package", "final", "retro"],
  "stages_done": ["new"],
  "approvals": {
    "outline": null,
    "cutplan": null,
    "beats": null,
    "final": null
  },
  "artifacts": {},
  "notes": ""
}
```

Field rules:

- `stage` is the stage currently in progress or next to run. When the last stage in `stages` completes (retro), it is set to `done`, the one terminal value not drawn from `stages`.
- `stages` is copied from the format profile at creation; never assume the master list. Footage-first projects (an existing recording, a livestream VOD) use the ingest-first variant written by mc-new's ingest mode: `["new", "cut", "beats", "graphics", "assets", "package", "final", "retro"]`. It skips the ideation stages entirely; the source file is registered in `sources` at creation.
- `series` (optional, default `null`) names the series this project belongs to, written by mc-new's `--series` mode. A series is a folder under `{projects-path}` holding a `common/` folder for evergreen shared assets and one subfolder per episode project. Stages that read brand templates (mc-package) check `series` to apply per-series packaging templates.
- `approvals` values are `null` (not reached), `"pending"` (artifact presented, waiting on the creator), or an ISO date string (approved that day). Only the creator's explicit say-so in conversation moves pending to a date.
- `artifacts` maps artifact names to paths as they are produced, e.g. `"edl": "cut/edl.json"`.
- `parent` links a short to its long-form parent project slug.
- `sources` (optional) registers media inputs as they arrive: `{"id": "camera-a", "file": "raw/camera-a.mp4", "role": "primary", "cfr": true}`. Roles: `primary` (talking-head take), `interview` (a recorded braindump session; the creator reads each question aloud prefixed with the marker cue so the cut stage can segment it mechanically; the default cue is "question from the interviewer", configurable via cutplan.py `--marker-cues` and the setup interview; the older "question from claude" phrasing remains a documented alternative for studios that recorded with it), `screen` (screen share). Stages that ingest media append here.

## The stage skill algorithm

Every mc-* stage skill follows the same shape. No exceptions, no creativity in the mechanics:

1. Resolve the studio config (`resolve_config.py --key modules.manticore`) and the skill's own surface (`resolve_customization.py --skill {skill-root}`); if the studio config is empty, stop and run mc-setup.
2. Read `project.json`. If the project's `stage` does not match this skill's stage, stop and say so (mc-pipeline routes; stage skills do not self-route).
3. Read the format profile at `{formats-path}/<format>.md` and any taste files it names (all under `{brand-path}`).
4. Do the stage work, calling the scripts in the skill's own `scripts/` folder for anything mechanical.
5. Run the stage's checklist (in the skill file). Fix failures before presenting.
6. Write the artifacts to the paths in the table above. Update `artifacts` in project.json.
7. If the stage is a gate: set the approval to `"pending"`, present the artifact to the creator, and STOP. Do not proceed, do not start the next stage, do not summarize what the next stage will do.
8. If not a gate (or after approval is recorded): append the stage to `stages_done`, set `stage` to the next stage in `stages`, and stop.

If the config exists but a key this stage needs is missing or empty, ask for just that value, write it into `[modules.manticore]` in `{project-root}/_bmad/custom/config.toml`, and continue (as-needed setup); suggest a full mc-setup pass only if several keys are missing.

## Gate behavior

- Gate 1 (outline): the creator approves hook + outline + the title/thumbnail promise before any script is written.
- Gate 2 (cutplan): the creator approves the cut plan summary (the taste calls, e.g. "trailing 'so' at 42:20, keep or cut?") before the preview render and the exported timeline are treated as the rough cut.
- Gate 3 (beats): the creator approves the beat table before any graphics code is written.
- Gate 4 (final): Manticore offers the final-quality render (`renders/final.mp4`) and the creator approves the deliverable. Finishing in their own editor from the always-exported timeline is an equally supported path; approval of either closes the gate. Either way the timeline export, edl.json, cutplan, and overlay assets already exist, so switching paths never loses work.

## Engine policy

- HyperFrames: default for per-video overlay beats. Registry blocks before authoring (`npx hyperframes add`). Export overlay-only ProRes 4444 MOV with alpha.
- Remotion: stingers and transitions (dual render: VP9 alpha WebM for OBS + ProRes 4444 for the editor timeline lane), React-stateful graphics, shorts karaoke captions. Free for companies of up to 3 people; larger teams need a Remotion license.
- OGraf (the mc-ograf skill): ONLY when the target supports it. Editor lane requires `[editor] ograf-editable = true` (DaVinci Resolve 21+); the live lane (OBS/SPX-GC via mc-stream-pack) is editor-independent. Everyone else gets baked alpha MOVs, which work in every editor.
- Everything is themed through `{brand-path}/tokens.json`. Component sourcing rule: registries and open libraries first, author from scratch only when nothing fits.
- Engine workspaces (the pinned HyperFrames project, the Remotion project) live at `{engines-path}`; mc-setup or the first graphics run initializes them.

## The beat table (engine-neutral graphics contract)

One row per graphic beat, produced by mc-beats, consumed by mc-graphics and mc-assets regardless of engine:

| id | start | dur | end | anchor word | anchor ts | spoken phrase | type | engine | asset | composition |
|---|---|---|---|---|---|---|---|---|---|---|

Column rules:

- `type` is a beat type from the format profile's `beat-types` frontmatter list (e.g. `lower-third`, `diagram`, `stat-card`, `cta`); the profile is the single type vocabulary for its format. The reserved placeholder `overlay` is legal only when reading legacy tables (tolerance rule below) and is never written.
- `engine` names the engine that renders the beat, per the Engine policy below (e.g. `hyperframes`, `remotion`, `ograf`, `html`).
- `asset` is `null` or a farmed-asset id from `assets/manifest.json`; mc-assets farms the listed assets, mc-graphics composes with them.
- Tolerance rule: consumers MUST accept rows missing `type`, `engine`, or `asset` (beat tables written by 0.x projects). Treat a missing `type` as the reserved placeholder `overlay` (informational only; rendering keys off `engine` and `composition`), a missing `engine` as the Engine policy default, and a missing `asset` as `null`. A stage that rewrites the table (mc-beats) replaces every `overlay` placeholder with a type from the profile's `beat-types`. An in-flight 0.x project never breaks on the extended contract.

Anchors are measured against the EDITED timeline defined by `cut/edl.json`, not the raw take.

## Blessed-slot convention

Deliverable folders hold exactly one blessed asset per slot; alternates, drafts, and retries live in a `work/` folder beside them. The pattern for mc-package: candidates accumulate in `packaging/thumbs/` and `packaging/titles.md`; after the creator picks, exactly one blessed asset per slot is written to `packaging/final/` and recorded in `artifacts` in project.json. Any stage producing a pick-one-of-N deliverable follows the same rule: the deliverable path is unambiguous, the exploration stays in `work/`.

## Cutting rules

The non-negotiable cutting rules (never cut inside a word, padding, fades, quote + reason per EDL segment, frame-verified boundaries, constant frame rate sources) live in the mc-cut skill, which is the only stage that applies them.
