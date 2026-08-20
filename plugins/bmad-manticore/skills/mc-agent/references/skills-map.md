# The skills map

One routing card per Manticore skill: what it does, when Manny routes there, what it needs first, and honest status notes. Load this file when the creator asks what the studio can do, asks about a specific skill or stage, or before routing anywhere off the common path. For live project state, this file is never enough: mc-pipeline owns state.

## Front of house

### mc-setup

Builds and tunes the studio: BMad core bootstrap, dependency and platform checks, the full onboarding interview (identity, editor, render consent, video style with creator-emulation links, CTAs, audio lanes), brand build (tokens, Production Bible, headshots, guided voice bible), CLI tool registration with end-to-end verification, `.env.example`, 0.x migration. Route here on any missing-config report, for any tool or lane change, and for every new creator. Needs nothing; it is the floor everything stands on. Idempotent: re-runs edit surgically.

### mc-pipeline

The master contract: stage table, gates, project.json, engine policy. Route here for "where are my projects", "what's next", and to run whatever stage is due. Never reconstruct project state by hand; this skill is the source of truth.

### mc-new

Scaffolds a project from a format profile. Two entries: idea-first (pick a format, get the full stage list) and footage-first ingest (an existing recording or livestream VOD gets a post-production stage list starting at cut, source registered). Series and deadline modes. Needs the studio config.

## The write phase (idea-first only)

### mc-braindump

Interviews the creator about the idea until they have said everything they believe; their exact words become the script's raw material. Offers camera-rolling mode: questions read aloud with the marker cue make the braindump itself usable footage. Route here right after mc-new on idea-first projects.

### mc-outline

3 hooks, one outline, the packaging promise. GATE 1. Needs the braindump. Footage-first projects never see this stage.

### mc-script

Weaves the script from the creator's own words, lints against the blacklist, runs craft QA against the voice bible. Needs the approved outline. After this the creator records; recording is theirs, not the pipeline's.

## Cut and beats

### mc-cut

Word-level transcript (parakeet-mlx by default), the cut plan with taste calls presented one by one. GATE 2. Every approval produces a fast preview render plus the editor timeline export; after graphics it re-renders the preview composited; at gate 4 it offers the final-quality render. Needs recorded takes in `raw/` (or the ingested source). The center of gravity for every project.

### mc-beats

Riffs graphic and treatment ideas with the creator first, then builds the beat table (every graphic anchored to a spoken word) under the creativity mandates, the density tier, and the CTA placement pass. GATE 3. Needs the approved cut. The medium mix (cards, diagrams, imagery, clips, memes) follows the Production Bible plus the riff, never a default.

## Production services

### mc-graphics

Executes the approved beat table in HyperFrames / Remotion / HTML / design-prompting; frame-verified ProRes 4444 alpha overlays plus HANDOFF.md. Routes whooshes and beds to mc-audio. Needs gate 3 approved.

### mc-assets

Farms the stills and b-roll the beat table calls for through the creator's registered CLI tools, real verified imagery first, generative editing rules binding (originals plus one improved prompt, never chained revisions). Stops and asks when a lane is unset; metered APIs are opt-in only.

### mc-audio

Service skill, no stage or gate: farms sound the way mc-assets farms pictures. Local-first: Kokoro-82M narration and two-host dialogue (stock voices, no cloning), MusicGen-small instrumental beds, AudioLDM2 SFX (16 kHz). Song-with-vocals lane is planned, not implemented; paid lanes opt-in. Called from mc-graphics, mc-stream-pack, and voiceover narration, or directly when the creator asks for sound. First use may build the engine workspace (large downloads, always consented).

### mc-ograf

Service skill: OGraf broadcast graphics that stay editable, only where the target supports them (DaVinci Resolve 21+ via `[editor] ograf-editable`, or the OBS/SPX-GC live lane). Everyone else gets baked alpha, which works everywhere.

## Packaging and live

### mc-package

Titles, face-plus-hook thumbnails (drafted programmatically, improved through the image lane, verified at 120px), description, CTA metadata, dual-timeline chapters, series A/B pairs, live-event mode. May start ANY time after gate 1; offer it during dead time instead of letting it pile up at the end. Needs approved outline (or the transcript on footage-first) and headshots for face thumbnails.

### mc-stream-pack

A complete branded OBS asset pack (scenes, stinger, lower thirds) from brand tokens; the livestream-pack format lane. Stinger audio and beds route through mc-audio. Per-episode packs and the Ecamm lane are a 1.0.x fast-follow; say so when asked.

## After publish

### mc-retro

One round of creator notes edits the format profile, the bibles, and the brand files, ISO-dated and append-only, so the next video starts smarter. Then the post-publish wrap (archive hygiene, evergreen assets). Route here after every published video; this is how the studio compounds.

## Formats

Seven format profiles ship: talking-head, screen-tutorial (real UI only), voiceover-explainer (creator-recorded narration by default; stock-voice TTS available via mc-audio), short, livestream-pack, livestream-vod, course-lesson. The creator's editable copies live at `{formats-path}`; a new format is a new markdown file.
