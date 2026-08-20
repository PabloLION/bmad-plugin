---
name: mc-beats
description: Riff graphic and motion ideas with the creator, then build the graphics beat table (id, timing, anchor words, type, engine, asset, composition per beat) from the approved cut, plan CTA beats, and STOP for gate 3 approval. Use at the beats stage. Never writes graphics code.
---

# mc-beats

Gate 3. The beat table is the engine-neutral contract between the script and the graphics engines; no graphics code exists until the creator approves it. Read `references/density-and-creativity.md` and `references/cta-placement.md` in full before planning any beats; the Creativity Mandates below are binding on every plan.

## Steps

1. Load the studio config (`uv run {project-root}/_bmad/scripts/resolve_config.py --project-root {project-root} --key modules.manticore`; empty means mc-setup has not run: stop and route the creator there) and this skill's own surface (`uv run {project-root}/_bmad/scripts/resolve_customization.py --skill {skill-root}`; run `{workflow.activation_steps_prepend}` now, `{workflow.activation_steps_append}` after this step, and hold `{workflow.persistent_facts}` as standing context). Resolve `paths` values against `{project-root}`. Read `project.json` (confirm `approvals.cutplan` is a date, stage is `beats`), `script.md`, `cut/edl.json`, `transcript/`, the format profile at `{formats-path}/<format>.md`, `{brand-path}/production-bible.md`, and `{brand-path}/tokens.json`. From the format profile frontmatter take `beat-types` (the beat types this format allows) and `density` (the map of high/medium/low tiers to seconds-per-beat budgets, front-loaded). The density tier is `graphics-frequency` in `[style]` of the studio config (`medium` when unset) unless the format profile frontmatter overrides it; the profile's `density` map turns the chosen tier into this plan's seconds-per-beat budget.
2. Riff with the creator BEFORE writing the table. Walk the edited timeline once, then bring your strongest ideas to them in plain words: the moments you would put a graphic on and the treatment you would give each, as a short pitch, not a table. Ask what they were picturing: anything specific they already imagined for this video, moments they know they want a visual on, references they have been chewing on. A few minutes of riffing here beats a revision cycle at gate 3. Carry every answer into the plan. And never assume a medium monoculture: beats are not all static text, all SVG, all images, or all clips, gifs, and memes. The mix comes from the Production Bible (the creator's style, learned over time) plus this conversation, never from habit.
3. Walk the EDITED timeline (times derive from edl.json, not the raw take). Scan the transcript with the trigger heuristics in `references/density-and-creativity.md` and, for every moment that earns a graphic, add a row: id, start, dur, end, anchor word with its transcript timestamp, the spoken phrase it rides on, type (one of the profile's `beat-types`), engine, asset, and the composition (named registry block or a one-line description). Apply the Creativity Mandates below to every row and to the plan as a whole.
4. Mark each row's engine per the format profile defaults and PIPELINE.md's engine policy; rows needing farmed assets carry the asset id in the `asset` column (they become the mc-assets shopping list), all other rows carry `null`.
5. Run the CTA placement pass per `references/cta-placement.md`: read `[cta]` (inventory and appetite) from the studio config, scan the transcript for verbal CTAs and payoff seams, and plan `cta` beats within the reference's zones, caps, and spacing. CTA rows go into the same table with timestamps, anchors, and rationale, approved at gate 3 like any other beat. End-screen rule: no overlay beats in the final 20 seconds unless they ARE the end card. When the inventory includes a next-video or end-card item, optionally add an end-card beat themed from `{brand-path}/tokens.json`.
6. Write `beats/beats.md` (the table) and `beats/STORYBOARD.md`. Each STORYBOARD.md beat gets one short paragraph that doubles as a design brief: what the viewer sees, the motion character (how it enters, moves, and exits), and the anchor phrase it rides on, in plain words a design tool could execute from.
7. Update `artifacts` in project.json (`"beats": "beats/beats.md"`, `"storyboard": "beats/STORYBOARD.md"`), set `approvals.beats = "pending"`, present the table, and STOP for gate 3.
8. On approval: record the ISO date, append `beats` to `stages_done`, and set `stage` to the next entry in project.json's `stages` array.

## Creativity Mandates

- For every moment, propose the most visually ambitious composition the Production Bible allows before settling for less. The creator can downgrade a diagram to a card in seconds; they cannot upgrade a card to a diagram without doing the planner's job for it.
- A static text card is the composition of last resort. Cap them at roughly a third of rows (aim for the tighter 25% target in the reference) and never place two in a row.
- Vary across the overlay taxonomy in `references/density-and-creativity.md`: at least 6 distinct types in any video over 5 minutes, no single type over 40% of rows. Popups, staged infographic builds, lower thirds, framed real imagery, animated elements, dataviz, and screen zooms all exist for a reason; use them where their triggers fire.
- Meet the minimum beat count for the runtime at the configured tier: edited runtime in minutes times the tier's beats-per-minute floor (high 3, medium 1.5, low 0.7), with roughly double density in the first 30-60 seconds per the pacing curve. A plan below the floor is a failed plan.
- STORYBOARD.md must justify any stretch that exceeds the tier's seconds-per-beat budget; unexplained flat stretches fail the checklist.
- Escalate the treatment to the content: a number gets a stat treatment, a process gets a staged diagram, a comparison gets a split or table build, not a sentence on a card.

## Beat table format

The table follows PIPELINE.md's engine-neutral contract, one row per beat:

| id | start | dur | end | anchor word | anchor ts | spoken phrase | type | engine | asset | composition |
|---|---|---|---|---|---|---|---|---|---|---|

- `type` is one of the format profile's `beat-types` (the frontmatter list is the whole vocabulary for the format). The reserved placeholder `overlay` exists only for READING legacy tables per PIPELINE.md's tolerance rule; mc-beats never writes it.
- `engine` names the rendering engine per the engine policy (e.g. `hyperframes`, `remotion`, `ograf`, `html`).
- `asset` is `null` or a farmed-asset id for mc-assets.
- mc-beats always writes every column. When revising a legacy 0.x table that lacks the extended columns, apply PIPELINE.md's tolerance rule to read it (missing `type` reads as the reserved `overlay` placeholder, missing `engine` is the engine-policy default, missing `asset` is `null`), then write the revised table with all columns filled: every `overlay` placeholder is replaced with a type from the profile's `beat-types`.

## Checklist

- The riff happened before the table: the creator heard the pitched treatments and was asked what they were picturing, and every specific ask from that conversation is in the table or its absence is explained in STORYBOARD.md.
- Every beat has an anchor word that exists in the transcript at that timestamp.
- No overlapping beats unless the composition is explicitly layered.
- Every row's `type` is in the format profile's `beat-types`, and `type`, `engine`, and `asset` are filled on every row.
- Beat count meets the tier's minimum for the runtime, front-loaded per the pacing curve; STORYBOARD.md justifies any stretch exceeding the seconds-per-beat budget.
- Variety quota holds: at least 6 distinct types (videos over 5 minutes), no type over 40% of rows, static text cards at or under roughly a third and never consecutive.
- Composition consistency: every composition conforms to the Production Bible's overlay style and animation language; one visual system across the whole plan.
- Image-type policy: every asset-bearing row respects the Production Bible's image-type policy (diagrammatic vs generative vs real) for its purpose.
- CTA beats are present per the configured `[cta]` inventory, or their absence is justified in STORYBOARD.md.
- No overlay beats in the final 20 seconds unless they are the end card.
- Generated-asset rows are absent in formats whose profile bans generated b-roll.
