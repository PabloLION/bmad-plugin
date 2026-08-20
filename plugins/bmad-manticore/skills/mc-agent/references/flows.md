# The flows

Intent playbooks: when the creator states a goal, this file is the default path Manny walks. Load it when a session turns from chat to doing. Flows are defaults, not rails; the creator can enter anywhere and skip anything optional. The only hard stops are the four gates, and those are never optional.

## "I have an idea for a video"

1. mc-new, idea-first: pick a format together (talking-head for a first video), get the project folder.
2. mc-braindump: get everything they believe out of their head, in their words. Offer camera-rolling mode before starting, not after.
3. mc-outline, gate 1. From here the packaging promise exists; note that mc-package is now available any time.
4. mc-script, then they record however they always record.
5. mc-cut, gate 2; preview render lands with every approval.
6. mc-beats (riff first), gate 3; then mc-graphics and mc-assets; the composited preview follows.
7. Gate 4: the offered final render, or they finish in their editor from the always-exported timeline.
8. After publish: mc-retro.

## "I already have footage" (a recording, a talk, a livestream VOD)

1. mc-new ingest mode, never work beside the pipeline: the source gets registered and the project gets a post-production stage list starting at cut.
2. The same gates apply from the cut onward: cutplan, beats (CTAs mined from the transcript), graphics, package with dual-timeline chapters, the final offer.
3. Livestream VODs use the livestream-vod format; replay framing in packaging, never live framing.

## "I have a stream coming up"

Ask which side of the lane: an upcoming broadcast routes to mc-stream-pack (the branded OBS pack) plus mc-package's live-event mode (scheduled-broadcast title, description, and thumbnail; the thumbnail is never the Starting Soon scene card). An existing stream recording is the footage-first flow above.

## "Titles? Thumbnail? Description?"

mc-package, any time after gate 1. Offer it proactively when the creator has dead time between stages or is fretting about packaging; never let it pile up at the end. Face thumbnails need approved headshots; if none exist, route through mc-setup's headshot step first and say why.

## "I need a sound / music / a voice"

mc-audio directly: narration or two-host dialogue (stock voices, say so), instrumental beds, SFX. Songs with vocals: not implemented, planned lane, be honest. First use may bootstrap the engine workspace; the downloads are large and always consented.

## "Make it look/feel different" (style, density, overlays, animation)

Durable style corrections route to the Production Bible, ISO-dated: through mc-retro when they surface after a video, or via mc-setup's style interview for a deliberate re-tune. One-off fixes inside a project belong to the stage that owns the artifact (mc-graphics for a graphic, mc-beats for the plan). Never edit a bible silently; tell the creator what got recorded.

## "I published it"

mc-retro, one round of notes, then the post-publish wrap. This is the compounding loop; sell it that way.

## "I don't know / where was I?"

mc-pipeline for real state, always. Then recommend the single next step with reasoning, and offer to run it now. If the ask reaches beyond Manticore (planning, code, another module's territory), read the help catalog and route; see the help section in SKILL.md.

## "Can Manticore do X?"

Load `references/skills-map.md` and answer from it. If X exists but is planned, say planned. If X does not exist, the growing-the-studio flow (`references/growing-the-studio.md`) is the honest offer.
