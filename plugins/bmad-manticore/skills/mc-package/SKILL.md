---
name: mc-package
description: Produce title+thumbnail packages, description, CTA metadata, and chapters for a Manticore project; series A/B pairs, dual-timeline chapters, and a live-event mode for scheduled broadcasts. Use at the package stage (may start any time after gate 1, since the packaging promise exists from the outline).
---

# mc-package

Packaging pays off the promise approved at gate 1; it is not invented fresh here. Read `references/cta-placement.md` in full before writing the description, the pinned comment, or the end-screen guidance (the file is duplicated from mc-beats; keep both copies identical). Two flows: the VOD flow (steps 1 to 9) and the live-event flow for scheduled broadcasts (see Live-event mode below).

## Steps

1. Load the studio config (`uv run {project-root}/_bmad/scripts/resolve_config.py --project-root {project-root} --key modules.manticore`; empty means mc-setup has not run: stop and route the creator there) and this skill's own surface (`uv run {project-root}/_bmad/scripts/resolve_customization.py --skill {skill-root}`; run `{workflow.activation_steps_prepend}` now, `{workflow.activation_steps_append}` after this step, and hold `{workflow.persistent_facts}` as standing context; the `[packaging]` keys below come from the same resolution). Resolve `paths` values against `{project-root}`. Read `project.json`, then branch on the promise source:
   - When the project's `stages` includes `outline`: confirm `approvals.outline` is an ISO date; if null or `"pending"`, stop and route the creator back to the outline gate. Read `outline.md` (the packaging promise) and `script.md`.
   - When it does not (footage-first and livestream projects have no outline stage): the promise comes from the footage itself; derive it from the final transcript, packaging only what the video actually delivers.

   Also read: the final transcript if the cut exists, the format profile at `{formats-path}/<format>.md`, `{brand-path}/tokens.json`, `{brand-path}/production-bible.md` (thumbnail style, the series templates it records, and the CTA section), `{brand-path}/headshots/` with its `index.md`, and from the studio config `[cta]` (inventory and appetite) and `[owner]` `links`. Mode check: when the format is `livestream-pack` (or `stages` contains `stream-pack`), this is a scheduled broadcast; run step 2, then jump to Live-event mode below.
2. Series template. When `series` in `project.json` is set, read `{brand-path}/templates/<series>.md` (see The series template contract below): its locked anchors bind every candidate in step 3 and 4; its per-episode variables are what this episode fills in. When `series` is set but the template file is missing, flag it, draft one from the Production Bible's series notes plus this episode's choices, save it to `{brand-path}/templates/`, and tell the creator the next episode inherits it.
3. Titles: `{packaging.candidates}` candidates (default 3) that pay off the approved promise. Under `{packaging.title-max-chars}` characters, front-loaded, no clickbait the video cannot cash. In a series, every candidate conforms to the template's locked title pattern.
4. Thumbnails, the locked flow. Face-plus-hook is the default treatment: an approved headshot plus a 2 to 4 word hook (`{packaging.hook-words-max}` is the cap).
   - Headshots: use ONLY approved headshots from `{brand-path}/headshots/`, picking the expression from `index.md` that matches the hook's emotion. When `headshots/` is missing or empty, flag it loudly: face-plus-hook is blocked, and mc-setup's headshot collection step is the fix. Proceed with a non-face treatment only on the creator's explicit say-so.
   - Draft, built programmatically: author each draft as a self-contained SVG or HTML composition themed from `tokens.json` (background, layout anchors, the hook text set in real type, the chosen headshot placed in the layout) and render it. The draft exists so the text is pixel-accurate: never ask a generative model to render the hook text. Drafts land in `packaging/work/`.
   - Improvement pass, ALWAYS: run every draft through the creator's configured image lane (`[assets]` `image-provider`, resolved to a `[[tools]]` entry and driven EXACTLY per its `headless` string and `notes`, or the API provider), passing the draft plus the ORIGINAL reference images (the chosen headshot photo, past blessed thumbnails when they exist) and an explicit mandate: use the person in the headshot image, optimize this thumbnail for clicks, keep the hook text verbatim. The pass may recompose, relight, and exaggerate. When it mangles the text, composite the text back programmatically over the improved image; never regenerate just to fix text.
   - Revisions start clean: when a candidate needs a change, re-send the SAME original inputs (draft, original headshot, references) with one improved prompt. Never pass a previous improved output back in as the base; a revision of a revision degrades like a photocopy of a photocopy.
   - 120px verification, mandatory: `uv run {skill-root}/scripts/verify_thumb.py <image> --out-dir <project>/packaging/work --width {packaging.verify-width}` on every candidate, then LOOK at the proof image it writes before presenting anything. No thumbnail ships unseen at 120px. A hook that is not instantly readable in the proof sends the candidate back to the draft or improvement step.
   - The presented candidates go to `packaging/thumbs/`; every draft, retry, and proof stays in `packaging/work/`.
5. Pairing and A/B: present the candidates as title+thumbnail PAIRS (title A with thumbnail A). Within a pair the two complement and never repeat each other: they share attention, not words. Series projects present exactly 3 pairs built on the template's locked anchors, ready for YouTube's Test & Compare to run as pairs; recommend which pair to lead with and why.
6. Description: the first 2 lines carry the hook and the search terms (they show before the fold), and when the video has a conversion CTA its link goes there too (description-top is half of its click surface, per the reference). Then the CTA lines drawn from `[cta]` items in priority order (imperative plus benefit, 7 words or fewer of ask copy per item); then the creator's `[owner]` `links`, in order; then the chapters block. Copy matches the lane: never live framing on a VOD ("enjoying the stream?", "link in chat" are wrong on a replay; use "comment below", "link in the description", schedule-tied subscribe framing), and livestream-vod projects get replay framing throughout.
7. Pinned comment and end screen, to `packaging/cta.md`: a paste-ready pinned-comment suggestion pointing at the same next step as the description-top link (identical URL; end screen, cards, pinned comment, and description-top all point at one next step), plus end-screen guidance for upload: the final 10 to 20 seconds are the outro runway, a 2-element layout (one watch-next plus one subscribe) beats cluttered screens, the watch-next target must be topically continuous, and the narration must verbally bridge to it. Check the script or transcript for that verbal bridge and flag loudly when it is missing.
8. Chapters: from the edited transcript's beat boundaries; first chapter 0:00, honest labels, no keyword stuffing. Dual-timeline rule: whenever `cut/edl.json` exists, chapters are a dual-timeline deliverable. `packaging/chapters.md` opens with the paste-ready block in edited (published) timecodes, followed by a clearly labeled table adding the original-source timecode per chapter (for finding the moment in the raw footage or VOD). The original column comes from this skill's own remap utility (a duplicate of the cut stage's, per the script-duplication convention), run against `cut/edl.json` (a project file): write the edited-timecode chapter list to `packaging/work/chapters-edited.md`, run `uv run {skill-root}/scripts/remap_timecode.py cut/edl.json --direction clean-to-orig --chapters packaging/work/chapters-edited.md -o packaging/work/chapters-orig.md`, and pair the two files line by line into the table. On a multi-source EDL, add a source column: use the script's `--events` mode instead (it records `source` on each remapped entry). If the cut does not exist yet (early run), chapters are pending: skip this step and the description's chapter block, and tell the creator to re-run mc-package after the cut to finish them.
9. Write `packaging/titles.md`, `packaging/description.md`, `packaging/cta.md`, and `packaging/chapters.md` (only when chapters were produced); update `artifacts` in `project.json`. If the project's stage is `package` and chapters are done, append `package` to `stages_done` and set `stage` to the next stage in the project's `stages`; on an early run, leave `stage` and `stages_done` untouched.

## The pick and blessed slots

Candidates accumulate in `packaging/thumbs/` and `titles.md`; the pick can happen immediately or after Test & Compare results come back. Whenever the creator declares the winners, write exactly one blessed asset per slot to `packaging/final/` (`packaging/final/title.txt`, `packaging/final/thumbnail.png`), record them in `project.json` `artifacts` (`"title"`, `"thumbnail"`), and set the project's `title` field to the blessed title. Alternates, drafts, and retries stay in `packaging/thumbs/` and `packaging/work/`; nothing downstream ever has to guess which asset shipped, because the deliverable path is `packaging/final/` and nothing else.

## Live-event mode (scheduled broadcasts)

For livestream-pack projects, packaging serves the scheduled broadcast, not a finished video:

1. Apply the series template (step 2) when the show belongs to a series; recurring shows usually do.
2. Produce one title (locked anchors apply) and one description. This is the live lane, so live framing is correct here (chat asks, the schedule, membership mentions), with the CTA lines and `[owner]` `links` per step 6.
3. Produce ONE scheduled-broadcast thumbnail through the full step 4 flow: face plus a 2 to 4 word hook, programmatic draft, mandatory improvement pass, mandatory 120px verification.
4. The two-asset rule, explicit: the scheduled-broadcast thumbnail competes in browse and search exactly like a VOD thumbnail and gets the full face-plus-hook treatment; it is NEVER a plain brand card. The plain branded card with the countdown safe zone is a different asset with a different job: the in-stream Starting Soon SCENE, produced by the stream-pack stage, not here. Never present one asset for both jobs, and never let the scene card become the broadcast thumbnail.
5. No chapters (nothing is cut). Write `packaging/titles.md`, `packaging/description.md`, and the thumbnail per the folder rules above; update `artifacts`, append `package` to `stages_done`, and set `stage` to the next stage in `stages`. Blessed slots apply once the creator approves the assets.

## The series template contract

One file per series at `{brand-path}/templates/<series>.md`, filename matching the `series` value in `project.json`. mc-setup's brand scaffold creates the `templates/` folder and one file per recurring series the creator names; mc-package is the consumer. The shape both sides honor:

- Locked anchors: everything each episode repeats so the series reads as a set in a feed. Thumbnail layout constants (face position and scale, wordmark or episode badge placement, background treatment, palette accents drawn from `tokens.json`) and the title pattern (fixed prefix, suffix, or numbering scheme).
- Per-episode variables: the slots each episode fills. Hook words, episode-specific imagery, guest name, episode number.

Locked anchors are non-negotiable within an episode; changing them is a series-level decision that routes through mc-retro into the template, ISO dated, so packaging wins compound across the series.

## Checklist

- Every title pays off something the video actually delivers.
- Within every pair, thumbnail text and title complement and do not repeat each other (they share attention, not words).
- Every presented thumbnail has a verify_thumb.py proof that was actually viewed; no thumbnail ships unseen at 120px.
- Every thumbnail hook is 2 to 4 words and survived the improvement pass verbatim.
- Every thumbnail revision was regenerated from the original inputs (draft, original headshot) with a revised prompt; no improved output was ever fed back in as a base.
- Face-plus-hook thumbnails use only approved headshots from `{brand-path}/headshots/`; the missing-headshots case was flagged loudly, not worked around silently.
- The description's first 2 lines carry the hook, search terms, and the conversion link when one exists; CTA copy matches the lane (no live framing on a VOD).
- Pinned comment, description-top, and end-screen guidance all point at the same next step.
- Chapters are dual-timeline whenever an EDL exists; the original column came from this skill's remap_timecode.py run against `cut/edl.json`.
- A scheduled-broadcast thumbnail is never a plain brand card (the two-asset rule).
- After a pick: exactly one blessed asset per slot in `packaging/final/`, recorded in `project.json` `artifacts`.
- Run `uv run {skill-root}/scripts/lint_script.py <file> --blacklist {brand-path}/blacklist.md` on titles.md, description.md, and cta.md.
