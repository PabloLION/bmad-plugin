---
name: mc-setup
description: First-run (or any-time) configuration for the Manticore video pipeline. Creates and updates the studio config ([modules.manticore] in {project-root}/_bmad/custom/config.toml), verifies dependencies and platform support, runs the onboarding interview (basics, render consent, video style, CTAs, audio lanes), builds the brand for real (tokens, Production Bible, headshots, guided voice bible), registers the creator's generation CLIs with end-to-end verification, scaffolds .env.example, and migrates 0.x studios. Run when any mc-* skill reports missing config, or to change tools later.
---

# mc-setup

Idempotent: on re-run, existing values are shown as defaults and only what the creator wants changed is changed. Never clobber, never silently overwrite.

The studio config is one table, `[modules.manticore]`, in `{project-root}/_bmad/custom/config.toml` (personal overrides in `config.user.toml` next to it). Every mc-* skill resolves it with the installed `{project-root}/_bmad/scripts/resolve_config.py`. The full default values ship in this skill's `customize.toml` under `[defaults]`.

## Steps

### 0. Bootstrap BMad core

Check four paths: `{project-root}/_bmad/config.toml`, `{project-root}/_bmad/scripts/resolve_config.py`, `{project-root}/_bmad/scripts/resolve_customization.py`, `{project-root}/_bmad/custom/`. All present: go to step 1. Any missing: the project is not BMad-initialized; say so and confirm before running the installer (it writes `{project-root}/_bmad/` plus IDE integration files for the chosen tool). Resolve the tool id first: `claude-code` under Claude Code; otherwise run `npx -y bmad-method install --list-tools` and let the creator pick.

- No `{project-root}/_bmad/` at all: `npx -y bmad-method@latest install --directory {project-root} --modules core --tools <tool-id> -y`. Never omit `--modules core` (a bare `-y` installs the default module set, not just core) or `--tools` (fresh `-y` installs fail without it).
- `{project-root}/_bmad/` exists but incomplete: `npx -y bmad-method@latest install --directory {project-root} -y` (quick-update re-syncs `{project-root}/_bmad/scripts/` and keeps configured tools). If that fails, retry with `--action update --modules core --tools <tool-id>` added.

Verify: both resolver scripts exist under `{project-root}/_bmad/scripts/`, `uv run {project-root}/_bmad/scripts/resolve_config.py --project-root {project-root} --key modules.manticore` exits 0 (empty output just means the interview has not run), and `uv run {project-root}/_bmad/scripts/resolve_customization.py --skill {skill-root}` returns this skill's `[defaults]`. If uv itself is missing, do step 2's uv bootstrap before verifying. On verification failure, stop and surface the installer output; never hand-copy scripts or vendor a resolver. If npx, node, or the network is unavailable, or the creator declines, have them run `npx bmad-method install` interactively from the project root (core alone is enough for Manticore), then re-run mc-setup. A stale npx cache can serve an old CLI missing current flags; on unknown-option errors, run `npm cache clean --force` and retry.

### 1. Locate and load

Resolve the current state: `uv run {project-root}/_bmad/scripts/resolve_config.py --project-root {project-root} --key modules.manticore`. Load the defaults: `uv run {project-root}/_bmad/scripts/resolve_customization.py --skill {skill-root}` (run `{workflow.activation_steps_prepend}` now, `{workflow.activation_steps_append}` after this step, and hold `{workflow.persistent_facts}` as standing context). If `[modules.manticore]` already has values, tell the creator this is an update pass; offer the sections below as a menu instead of walking all of them. But first check for a 0.x studio.

#### 1a. 0.x migration

An existing `[modules.manticore]` that is missing any of the 1.0 tables (`[render]`, `[style]`, `[cta]`, `[live]`, `[audio]`) is a 0.x studio. Say so, then migrate instead of re-interviewing everything:

- Backfill each missing table from this skill's `[defaults]` (render, style, cta, live, audio), writing them into the existing config surgically.
- If `[transcription] api-key-env` names a key the configured local provider never uses, blank it (the 1.0 default; metered keys are set only when a metered provider is chosen).
- If the studio recorded interview footage against the pre-1.0 marker cue ("question from claude"), offer the step 3 marker-cue question and record the `--marker-cues` override in `{project-root}/_bmad/custom/mc-cut.toml` so cutplan keeps segmenting that footage.
- If the `[assets]` lanes still carry pre-1.0 defaults pointing at a metered API the creator never opted into or verified, flag that in the summary and offer step 5 to repoint them at a registered CLI tool (or leave them empty so mc-assets asks at farming time).
- Refresh the creator's format profiles surgically: for every profile in `{formats-path}` that also ships in `{skill-root}/assets/formats/`, run `uv run {skill-root}/scripts/merge_profile_frontmatter.py --shipped {skill-root}/assets/formats/<name>.md --studio {formats-path}/<name>.md`. It adds only the frontmatter keys new in 1.0 (`beat-types`, `density`, and any future ones) that stages like mc-beats require, never overwriting an existing key, the creator's prose, or the Learnings. Then copy any newly shipped profiles that do not exist in `{formats-path}` (the step 4 rule).
- A pre-1.0 series or thumbnail template at the brand root (for example `thumbnail-template.md`) predates the `{brand-path}/templates/<series>.md` contract: offer to move it there, named for the series it describes, so mc-package finds it.
- Run the delta interview: step 3b (render consent), then step 3c (the video style interview), then step 3d (audio lanes).
- Scaffold `{brand-path}/production-bible.md` per step 4, seeded from the brand assets that already exist (tokens.json, shipped overlays, exemplars, format-profile learnings) plus the step 3c answers, not from a blank slate.
- Offer, without forcing, the other new builds: headshot collection (step 4), the guided voice bible (step 4b), `.env.example` (step 7).
- Leave every other existing value untouched; those are already the creator's answers.

Finish with step 8 as usual so the migrated config is verified and the pending gaps are reported.

### 2. Dependencies

Bootstrap first: check `uv --version`. If uv is missing, offer to install it; otherwise the official installer from docs.astral.sh/uv, and wait for the creator's confirmation; every pipeline script runs through uv, so nothing works without it.

Then run `uv run {skill-root}/scripts/check_deps.py`. Report what is missing with the exact install command (brew/apt/winget as fits the platform). Install nothing without the creator confirming each item. The report includes a platform gate: the default transcription lane (parakeet-mlx) runs only on Apple Silicon. If this machine is not Apple Silicon, relay the script's fallback pointer (local whisper.cpp or faster-whisper; they normalize fillers away, so cut quality drops, and a supported cross-platform lane is planned) and carry that honesty into step 3's transcription question.

### 3. The basics interview

Ask, offering current values (or the `[defaults]` from customize.toml) as defaults:

- Name and channel/brand name (`[owner]`).
- Description links, in order (`[owner] links`).
- Speaking rate: if they have a published transcript, offer to measure it (word count / duration); otherwise leave 145 with a note that mc-script will flag it as unmeasured. Step 4b measures it for real from their own transcript if the voice bible gets built.
- Paths: accept the defaults (`manticore/brand`, `manticore/formats`, `manticore/projects`, `manticore/engines`) unless they have a place they want things, e.g. an existing brand folder via `brand-path`.
- Video defaults (`[video]`): confirm record resolution, delivery resolution, and fps. Offer to ffprobe a recent recording and fill the values from reality instead of guessing.
- Live tool (`[live] tool`): obs, ecamm, or other. Drives the stream-pack lane's deliverable format.
- Recurring shows or series they produce (names, cadence). Note them for format-profile choices and future series folders.
- Editor (`[editor]`): which NLE they finish in. Set `timeline-format` accordingly: fcpxml for DaVinci Resolve or Final Cut Pro; xmeml/edl for Premiere; none for Descript or manual workflows (they get the cut plan, edl.json, and preview instead of a timeline file). Set `ograf-editable = true` ONLY for DaVinci Resolve 21+.
- Transcription (`[transcription]`): default parakeet-mlx (free, local, verbatim fillers preserved, no API key; Apple Silicon only). If step 2's platform gate flagged this machine, say plainly that the default lane will not run here and point at the documented local fallbacks. Metered API lanes exist behind the same switch as explicit opt-in choices; if, and only if, the creator picks one, set `provider` and `api-key-env` now and handle key sourcing in step 7.
- Interview marker cue: the spoken phrase that marks each question read aloud during interview-recording capture (mc-braindump's camera-rolling mode), so the cut stage can segment the recording mechanically. Default "question from the interviewer"; keep it unless the creator wants their own phrasing or has footage recorded against the older "question from claude" convention. Record a non-default cue as `cutplan_flags = '--marker-cues "<cue>"'` in `{project-root}/_bmad/custom/mc-cut.toml` (mc-cut's team override file, resolved by resolve_customization.py; edit it surgically, preserving any existing keys); mc-cut passes those flags straight to cutplan.py. The default needs no entry.

Be honest about lane status: the comments in this skill's `customize.toml` under `[defaults.editor]` and `[defaults.transcription]` mark each timeline and transcription lane as implemented or planned; relay that, and never promise a planned lane as working.

### 3b. Render consent

Present and confirm the render-first default before writing `[render]`: Manticore renders a fast low-res preview for every cut and beats iteration, and offers a final-quality render at gate 4; the editor timeline export and all assets (edl.json, cutplan.md, overlays) are ALWAYS created alongside, so the creator can jump into Resolve, Premiere, or any editor at any step.

- Accepted (the default): `self-render = true`. Offer the quality knobs (preview-height, preview-crf, final-codec, final-crf) only if they ask; the defaults are sane.
- Declined: `self-render = false`. Previews and finals become offers the pipeline makes instead of automatic outputs; the timeline export and assets remain always-on.

Record the answer explicitly; this consent is required, not assumed.

### 3c. The video style interview

This step seeds the Production Bible; the build spec is `{skill-root}/assets/production-bible-spec.md`. Ask, and hold every answer for step 4:

- Creators to emulate, first: ask whether there is a creator or channel whose video style they want to lean toward, and take video links. With permission, study what the links offer (titles, thumbnails, pacing, a transcript via yt-dlp) and distill what the creator is actually after: fast funny meme cuts, polished charts and dataviz, kinetic captions, calm long-form explainers, a particular edit rhythm. Echo the takeaways back in your own words ("here is what I take from these: ...") and confirm before writing anything; the confirmed takeaways go in the bible and seed every question below as proposed defaults. This is video style, distinct from step 4b's reference creators for spoken voice, though the same links can feed both.
- Visual density (`[style] graphics-frequency`): high (a graphic beat roughly every 10 to 20 seconds), medium (20 to 45), or low (45 to 90), on a front-loaded pacing curve. Default medium; nudge toward high for tutorial and explainer formats. Per-format overrides go in the bible, not the config.
- Preferred image types, with per-purpose splits: SVG or diagrammatic builds where text must be accurate, generative imagery for what does not exist, real verified imagery first for anything that does, or a stated mix. The sourcing hierarchy is real, then generative, then hand-built text card.
- Overlay and popup aesthetic: a described look, reference screenshots or creators to emulate, or overlays they have already shipped. Capture surface treatment (solid, glass, gradient, neon, flat, native-platform), blur, border, corner radius, shadow or glow, and placement taste. Store any supplied reference images beside the bible.
- Animation feel: snappy, smooth, or dramatic, plus entrance and exit conventions (for example fly-in and fly-out with optional whoosh). Mapped onto tokens.json motion values in step 4.
- CTA inventory and appetite (`[cta]` and `[[cta.items]]`): which CTAs they run (subscribe, community, support, product, next-video, playlist, site), each with label, URL, optional brand asset path, and priority; appetite aggressive, moderate, or minimal. Mirror the inventory into the bible's CTA section along with the native-platform styling rule (a subscribe element reads YouTube-red, a community element reads that platform's own colors).
- Asset libraries they already own (icon sets, b-roll folders, screenshot archives, photo libraries) and their locations, for the bible's image-type policy.

Answers land in BOTH places: the config keys (`[style]`, `[cta]`) for mechanical consumption, the bible for taste.

### 3d. Audio lanes

Present `[audio]` and confirm the local-first defaults (the full ladder and its honesty rules live in mc-audio's `references/audio-lanes.md`): TTS narration and two-host dialogue via kokoro-local, instrumental music beds via musicgen-local, SFX via audioldm2-local. All free and local; the mc-audio service skill farms them for graphics, stream packs, and voiceover narration.

- Be honest about what local TTS is: stock voices only, no cloning, so "narration in your own voice" still means recording it yourself; a paid cloning lane is opt-in and planned.
- Full songs with vocals: `song-provider` ships empty because no local lane is validated yet; say so if asked and never promise the planned ACE-Step lane.
- Disk and download honesty before any bootstrap: the engine workspace at `{engines-path}/audio-lab` needs a venv of several GB, ~340 MB of Kokoro models, and ~5 GB of Hugging Face cache on the first music/sfx run. Offer to build it now (`uv run` mc-audio's `ensure_workspace.py`) or defer; mc-audio asks again at first farming. An existing workspace (a lab the creator already built) is detected and reused, never rebuilt.
- Paid audio lanes (Gemini TTS, ElevenLabs) exist behind the same keys as explicit opt-in choices; if, and only if, the creator picks one, set the provider and `api-key-env` now and handle key sourcing in step 7.

### 4. Brand build

Create the four path folders if missing. The exit state is filled, never placeholders: a placeholder survives only when the creator genuinely has nothing to give, and every survivor goes on the step 8 pending list, loudly.

Ask first: "point me at anything that already defines your brand or voice: a website, CSS, design tokens, style guides, writing skills, past videos." Mine those sources before interviewing; interview only what mining could not answer.

Into `{brand-path}`:

- `tokens.json` from `{skill-root}/assets/tokens.template.json`, filled from the mined brand sources (site CSS, style guides, brand system docs) when they exist; otherwise walk the creator through canvas/accent/text colors and fonts. Map the step 3c animation feel onto the motion values.
- `production-bible.md`: scaffold from `{skill-root}/assets/production-bible-spec.md` and fill sections 1 through 6 from the step 3c answers and the mined sources. Any section with genuinely no answer stays a marked placeholder and is flagged in step 8.
- `blacklist.md` from `{skill-root}/assets/blacklist-starter.md`.
- `voice-bible.md`: built in step 4b.
- `headshots/`: collect 3 to 6 approved photos of the creator with varied expressions (neutral, surprised, thinking, excited). Auto-classify each expression, rename to expression-slug filenames, and write an `index.md` expression catalog (one line per photo: file, expression). Explain how they get used: when a thumbnail or asset needs the creator in it, the original photo goes to the configured image model with a "use the person in this image to ..." prompt, and any revision re-sends the same original photo, never a prior generation. State the rule inline: approved photos only; mc-package never uses arbitrary frames from footage. If no headshots exist yet, flag it loudly: thumbnails are blocked until they do.
- `exemplars/` folder (filled in step 4b).

Into `{formats-path}`: copy every profile from `{skill-root}/assets/formats/` that does not already exist there (never overwrite; the creator's copies accumulate learnings).

### 4b. Guided voice-bible build

Offer to build `{brand-path}/voice-bible.md` now instead of leaving the spec (`{skill-root}/assets/voice-bible-spec.md`) as a placeholder. If accepted:

- Ask for the creator's own corpus (YouTube URLs, published transcripts, writing) and, separately, any reference creators whose spoken style they want to lean toward.
- Fetch transcripts with yt-dlp (`--write-auto-subs`), with permission. Save cleaned exemplars into `{brand-path}/exemplars/`, keeping the creator's own voice separate from reference creators (subfolders `own/` and `reference/`; frontmatter with URL and capture date).
- Distill per the spec: every rule in the bible cites at least one verbatim example from an exemplar. Never write voice rules from memory or imagination.
- Measure the real wpm from the creator's OWN transcript (word count / duration) and write it into `[owner] wpm`, replacing the estimate.
- Encode the rule explicitly in the bible: written voice is not spoken voice; only spoken transcripts define the spoken register, and reference creators inform but never replace the creator's own patterns.

If declined, the spec stays in place as the build instructions and the unbuilt bible goes on the step 8 pending list.

### 5. CLI tools and asset lanes

CLI-tool-first: a registered CLI backed by a subscription the creator already pays for is the preferred lane for every `[assets]` slot; metered APIs are an explicit opt-in choice, never a silent default.

Ask what they use for image generation, video generation, and offloaded research: any agentic or generation CLI they run. For each tool:

- name, capabilities (image/video/research/...), the exact headless invocation, preferred models.
- The `notes` field: everything future sessions must remember about driving it (quirks, output behavior, what it is bad at). Write it down now; this is the memory that stops every session from rediscovering the tool.
- Verify end to end, with permission: first the version/help command (exists on PATH), then one small real invocation per registered capability (for example a tiny test image into a scratch folder), confirming the output file actually exists. Record the result in `notes` as verified end-to-end with the ISO date, or unverified.

Write each as a `[[modules.manticore.tools]]` block. Then set the `[assets]` lanes (image-provider, video-provider, escalation-provider): default each lane to a registered, verified tool name. Only if the creator explicitly chooses a metered API lane instead, set that provider value and confirm its key env var, relaying implemented/planned status honestly. A lane with no good answer stays empty: mc-assets stops and asks at farming time rather than billing anyone by default.

### 6. Editor integration

Native scripting is the default DaVinci Resolve path: the cut stage always exports an fcpxml timeline, and Resolve-side automation drives Resolve's own scripting API; no MCP server is required for any shipped lane. Only if the creator ALREADY runs a Resolve MCP server and wants skills to use it: check `claude mcp list` (or the harness equivalent), and record `davinci-resolve = true` under `[mcp]` once confirmed. Otherwise record false and move on; do not suggest installing one. Other editors need nothing in this step.

### 7. Keys and .env.example

Key talk happens only inside opt-in branches. For each metered lane the creator explicitly chose in steps 3 and 5 (a metered transcription provider, a metered asset API): confirm the env var name recorded in the config, check whether that env var is set (presence only; NEVER read or echo values), and, inside that branch only, tell them where that vendor issues keys. If nothing metered was chosen (the local-first default), skip key sourcing entirely.

Then scaffold `{project-root}/.env.example`:

- List exactly the env vars the resolved config references: every non-empty `api-key-env` / `*-key-env` value that a configured lane actually uses. Possibly none; if none, write no file and say so.
- One line per var with a one-line source note (where the key comes from).
- A header comment: real values never go in TOML, in chat, or in this file; copy to `.env` or export in the shell.
- Idempotent like everything else: update an existing `.env.example` surgically and never touch a real `.env`.

### 8. Write and confirm

Write the interview results as the `[modules.manticore]` table (with its sub-tables: owner, paths, video, render, style, cta, live, editor, transcription, assets, audio, mcp, and `[[modules.manticore.tools]]` entries) into `{project-root}/_bmad/custom/config.toml`. Edit surgically: create the file if needed, preserve everything else in it (other modules configure themselves there too), and preserve any sections the creator skipped. Mention `config.user.toml` for personal overrides in shared repos. Verify by running `uv run {project-root}/_bmad/scripts/resolve_config.py --project-root {project-root} --key modules.manticore` and showing the resolved summary.

Close with the honest runnability report:

- Locked behavior: what will actually happen on the first project with these settings. Render-first preview and offered final per `[render]`, the graphics-frequency tier, the CTA inventory, the transcription lane and whether THIS machine can run it, the audio lanes and whether the engine workspace is built yet, the editor timeline format.
- Lane status: implemented vs planned for every configured lane, straight from the customize.toml comments. Never claim a planned lane works.
- Pending gaps, flagged loudly: missing headshots (thumbnails are blocked), unbuilt voice bible, placeholder Production Bible sections, unverified tools, empty asset lanes (mc-assets will stop and ask).
- Capability note: check whether the harness has browser automation available; packaging research degrades without it, and the report says so when it is absent.

Point at mc-new to start the first project, and at the pending list as the highest-value next builds.

## Rules

- Confirm before every install, every MCP add, every command that changes the system.
- Presence checks only for secrets; never read, echo, or store key values. Keys never go in the TOML, in chat, or in `.env.example`.
- Paid and metered vendors are opt-in only: no vendor key name, dashboard, or pricing mention outside the branch where the creator explicitly chose that lane.
- Never claim a planned lane works; relay implemented/planned status honestly everywhere it comes up.
- Re-runs edit the existing config surgically; a re-run with no changes writes nothing.
- Never touch `{project-root}/_bmad/config.toml` (installer-owned); Manticore's home is the `custom/` layer.
