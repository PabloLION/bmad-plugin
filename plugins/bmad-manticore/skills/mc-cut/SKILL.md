---
name: mc-cut
description: Turn raw takes into a cut plan, edl.json, a rendered preview, and an editor timeline export. Presents the taste calls for gate 2 approval and renders the preview after every approval; owns the offered final render at gate 4. Use at the cut stage once recordings are in raw/.
---

# mc-cut

The Descript replacement, render-first. Every approved cut iteration ends in a watchable preview render; once the graphics stage has rendered overlays, the preview re-renders with them composited; at gate 4 a final-quality render is offered. The editor timeline export and all assets (cutplan.md, edl.json, overlays) are ALWAYS produced alongside, so the creator can move into their editor at any step.

## Steps

1. Load the studio config (`uv run {project-root}/_bmad/scripts/resolve_config.py --project-root {project-root} --key modules.manticore`; empty means mc-setup has not run: stop and route the creator there) and this skill's own surface (`uv run {project-root}/_bmad/scripts/resolve_customization.py --skill {skill-root}`; run `{workflow.activation_steps_prepend}` now, `{workflow.activation_steps_append}` after this step, and hold `{workflow.persistent_facts}` as standing context). Resolve `paths` values against `{project-root}`. Read `project.json` (stage `cut`; the composited preview re-render after graphics and the offered final render at gate 4 are the two routed entry points that legitimately run at later stages, see their sections below), `script.md`, `{brand-path}/production-bible.md` when it exists (the taste contract for the judgment calls in step 4), and the cutting rules below.
2. Preflight every file in `raw/`: `uv run {skill-root}/scripts/preflight.py raw/<take> [...] --remux --qc-frames cut/qc/`. Three checks, all before any transcription or render:
   - Frame rate: VFR sources are re-encoded to constant frame rate (run the preflight in the background and keep working; transcription waits for it). Record the reported `cfr_master` path in project.json `sources` as the project source of truth; every later step (transcription, EDL times, renders, timeline export) uses the CFR master, never the VFR original.
   - Disk: free space is checked against a rough estimate (3x source size plus the estimated CFR masters) before any remux write, and the script refuses the remux itself when the estimate does not fit; if `disk.ok` is false in the summary, stop and tell the creator before any render.
   - Source QC: inspect the extracted first and last frames per source for edge defects (black edges, wrong aspect, letterboxed or cropped content) before any render is built on them.
3. Transcribe each take: `uv run {skill-root}/scripts/transcribe.py raw/<take> -o transcript/words.json --provider <[transcription] provider from the config>` (suffix the output `<source-id>.words.json` when the project has multiple sources). Default provider parakeet-mlx runs local and free; the model downloads once on first run.
4. Candidates: `uv run {skill-root}/scripts/cutplan.py transcript/words.json -o cut/candidates.json` plus any `{workflow.cutplan_flags}` finds silences, filler runs, stutters, and retakes mechanically. On an `interview` source (project.json `sources`), it also flags each spoken interviewer-question read as a `marker` candidate: cut the marker and question, keep the answer. The default marker cue is "question from the interviewer"; projects recorded against the older "question from claude" convention pass `--marker-cues "question from claude"` (via `{workflow.cutplan_flags}`).
5. Make the taste calls: against `script.md` and the Production Bible, pick best takes, order segments, decide keep-or-cut on every candidate in `cut/candidates.json`. Write `cut/cutplan.md` as a short human-readable plan whose spine is the judgment calls, each with a timestamp and the quoted words (the "trailing 'so' at 42:20, keep or cut?" shape). Group the obvious silence trims into one line; itemize only what the creator might disagree with.
6. Write `cut/edl.json`: `{source, source_duration, fade_ms: 30, pad_ms: 60, segments: [...]}` with ordered segments of {source, start, end, beat, quote, reason} obeying the cutting rules below.
7. Set `approvals.cutplan = "pending"`, present cutplan.md, and STOP for gate 2.
8. After approval, and again after every later re-approval that changes the cut:
   - Render the preview, always: `uv run {skill-root}/scripts/render_preview.py cut/edl.json -o renders/preview.mp4 --boundary-frames cut/boundaries/` plus any `{workflow.preview_flags}` (720p CRF 28 defaults; pass the `[render]` preview keys from the studio config when set). Inspect the boundary frames per the cutting rules.
   - Once the graphics stage has rendered overlays into `graphics/`, re-render composited so the creator iterates on overlays and CTAs visually: same command plus `--beats beats/beats.md --graphics-dir graphics/`. Report any `overlays_missing` from the summary.
   - Export the editor timeline, always, per `[editor] timeline-format` in the config: `fcpxml` via `uv run {skill-root}/scripts/edl_to_fcpxml.py cut/edl.json -o cut/rough.fcpxml` (Resolve and Final Cut import it natively; refuses VFR sources loudly); `xmeml`/`edl` are planned lanes, so Premiere users work from cutplan.md + edl.json + the rendered preview/final until the xmeml lane lands (see TODO); `none` (Descript and manual workflows) skips export, and the deliverables are cutplan.md + edl.json + renders/preview.mp4 as the cut map.
   - resolve_import.py (push the timeline into a running Resolve) is currently a stub: do NOT offer it. When its STATUS line says implemented, offer it only if `[mcp] davinci-resolve` is true in the config.
   - Record the ISO date in `approvals.cutplan`, append `cut` to `stages_done`, and set `stage` to the next entry in project.json's `stages` array.

## Composited preview (after graphics)

mc-pipeline routes here as soon as the graphics stage completes (mc-graphics hands back after writing `graphics/HANDOFF.md`), and again whenever an overlay in `graphics/` is later re-rendered. This entry point runs after the `cut` stage and touches no gates, approvals, or stage fields: re-render the preview composited, `uv run {skill-root}/scripts/render_preview.py cut/edl.json -o renders/preview.mp4 --boundary-frames cut/boundaries/ --beats beats/beats.md --graphics-dir graphics/` plus any `{workflow.preview_flags}`, report any `overlays_missing` from the summary (each one is a beat whose overlay has not landed in `graphics/`), present the composited preview to the creator, and stop.

## Final render (gate 4)

When the project reaches the final stage, offer the final-quality render from this skill: `uv run {skill-root}/scripts/render_final.py cut/edl.json -o renders/final.mp4 --beats beats/beats.md --graphics-dir graphics/` plus any `{workflow.final_flags}`, with `--codec`, `--crf`, and `--height` per `[render]` in the studio config. It bakes the same EDL the creator approved with graphics composited from the approved beat table, hardware encode when available (videotoolbox on macOS, libx264 fallback), segment-parallel rendering, a disk preflight, progress reporting, and boundary-frame checks. Finishing in the creator's own editor from the always-exported timeline is an equally supported path; either closes gate 4.

## Dual timecode

Chapters or event notes written against original source timecode (a livestream VOD chapter list, log notes) remap onto the edited timeline with `uv run {skill-root}/scripts/remap_timecode.py cut/edl.json --direction orig-to-clean --chapters <file> -o <out>`. The same utility maps clean times back to source timecode (`--direction clean-to-orig`); mc-package carries its own duplicate of it (per the script-duplication convention) for the dual-timeline chapters deliverable whenever an EDL exists.

## Cutting rules (non-negotiable)

- Never cut inside a word. Pad cut edges 30 to 200 ms.
- 30 ms audio fades on every cut boundary.
- Every EDL segment records: source, start, end, the quoted words, and the reason for the cut.
- Self-verify: extract frames at each cut boundary and inspect; up to 3 retries per cut.
- Raw recordings must be constant frame rate (mitigates FCPXML desync). The step 2 preflight catches and remuxes VFR before transcription; never cut against a VFR file.
- Never shrink or letterbox the source video to make room for graphics; overlays composite over the full frame in safe zones.

## Checklist

- No cut lands inside a word (check edl times against word timestamps).
- Every edl segment has quote + reason.
- Preflight ran on every source; any VFR file was remuxed and its CFR master recorded in project.json `sources`.
- QC frames inspected for edge defects; disk preflight passed before rendering.
- renders/preview.mp4 watched (spot-check at minimum three boundaries) before declaring done; after the graphics render, the composited preview re-checked and `overlays_missing` is empty or explained.
- FCPXML sync verified in the editor on the first project this converter touches.
