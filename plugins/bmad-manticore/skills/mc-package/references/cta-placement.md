# CTA Placement Reference

Research-backed rules (2024-2026 era) for deciding when, where, and how to place CTA beats in a video, using the transcript and position-based retention logic. mc-beats reads this during its CTA placement pass; mc-package reads it for description lines, the pinned-comment suggestion, and end-screen guidance. Brand-agnostic; the creator's actual inventory comes from `[cta]` in the studio config and the Production Bible's CTA section.

## Core principles

1. Earn before asking. CTAs convert best immediately after a moment of delivered value: a payoff, insight, demo result, or completed segment. Asking before value is delivered depresses both conversion and retention.
2. One primary CTA per video. Multiple CTAs are fine only when spaced apart, serving different purposes, with a clear hierarchy. Competing asks in the same window create choice paralysis and read as noise.
3. Verbal plus on-screen beats either alone. A spoken ask reinforced by a synchronized graphic outperforms voice-only or graphic-only CTAs. When the transcript contains a verbal CTA, always pair it with a graphic, synced to start within about half a second of the spoken words. A silent graphic is acceptable only for low-friction asks (subscribe bug, link-in-description lower third).
4. Continue the journey, do not interrupt it. Retention graphs commonly dip at CTA moments; the dips come from jarring, disconnected asks, not from CTAs per se. A CTA framed as the natural next step holds retention; a hard sales pivot does not.
5. Never interrupt tension. No CTAs mid-explanation, mid-demo, during a build-up, or in high-information-density passages. Place them at natural seams: topic transitions, post-payoff moments, chapter boundaries.
6. Asking works. Controlled creator tests consistently show meaningful lift (a few percent up to 30-40% relative increase in subscribe conversion, in some tests a doubling) when a clear, non-pushy verbal ask is present versus absent. The graphic supports the spoken ask; it does not replace it.

## Placement zones by video position

Positions are fractions of total runtime. Use the transcript to find the nearest natural seam (sentence or topic boundary) to the target position; never cut into a sentence.

### Zone A: hook (0% to ~5%, or the first 30 seconds, whichever is longer)

No CTAs of any kind. A CTA in the first 30 seconds is the single most reliably harmful placement: viewers have received zero value and early retention is the most algorithm-sensitive part of the curve. Exception: the platform's persistent watermark/subscribe bug (a channel setting, not an edit).

### Zone B: early body (~5% to ~25%)

Avoid engagement CTAs; retention is still settling. Permitted: a brief content-relevant utility pointer ("chapters below", "code linked in the description") as a short lower third at the first topic transition, only if it serves the viewer rather than the channel.

### Zone C: mid-video peak zone (~25% to ~60%), the primary CTA zone

The primary engagement CTA belongs here, at a post-payoff seam near the 40-50% mark. Retention is typically at its healthiest and viewers have received tangible value; end-of-video placement wastes the ask because a large share of viewers never reaches it (retention collapses in the final 30 seconds). Trigger on payoff moments, not the clock: find the strongest completed value moment nearest 40-50% (a problem just solved, a demo that just worked, a section just wrapped) and anchor the CTA there. Reason-based asks outperform bare asks: prefer copy that states a benefit ("Subscribe for weekly deep dives") over a bare "Subscribe". Platform cards (the info teaser) also belong here, at 50-75% of runtime, tied to the moment a related topic is mentioned; use 1-2 at most.

### Zone D: valleys and interior dips (anywhere in the body)

Never place CTAs in retention valleys or known drop-off patterns (long static passages, tangents); a CTA there accelerates the exit. Valleys call for pattern interrupts, not asks. If a segment reads as low-energy filler in the transcript, place CTAs before it (at the preceding peak) or after it (at the next payoff), never inside it.

### Zone E: pre-outro (~85% to ~95%)

The slot for the conversion CTA (community, site, newsletter, product) when the video has one: viewers still here are the most invested, and the ask can be substantive. Pair a spoken pitch with a lower third and "link in description", backed by a description-top link and a pinned comment pointing at the same next step. Also the right place for a secondary subscribe ask, but only if the primary CTA earlier was a conversion CTA rather than subscribe.

### Zone F: end screen (final 5-20 seconds)

Reserve the last 10-20 seconds as a deliberate outro runway: a talking-head or holding shot with clear safe areas. Fewer elements win: one watch-next video element plus one subscribe element is the highest-performing layout; cluttered four-element screens underperform. The verbal outro must reference the end screen ("I show you how to deploy this in this video right here"); an end screen the narration never mentions dramatically underperforms. The watch-next element must be topically continuous with what the viewer just watched; session continuation is the highest-value action at video end, more valuable than a subscribe ask there. No important content, on-screen text, or code under the end-screen overlay zone, and no other overlay beats in the final 20 seconds unless they are the end card.

## Frequency caps and spacing

- Hard cap: 3 CTA moments per video, excluding the end screen and the persistent watermark. Typical target: 1-2 for videos under 10 minutes; up to 3 for 20-plus-minute videos. The configured appetite (aggressive, moderate, minimal) tunes the count within this cap; minimal means one well-placed ask or none.
- One primary CTA plus at most 1-2 lightweight secondaries of different kinds.
- Minimum spacing: no two CTA graphics within 2 minutes or 20% of runtime of each other, whichever is larger.
- Never stack: no two different asks within the same 30-second window. Rapid-fire "like AND subscribe AND join" is the canonical failure; one well-placed prompt outperforms three.
- Duplicate suppression: if the speaker verbally asks for the same action more than once, graphic-support only the strongest instance (best zone per the rules above); leave the others voice-only, or flag them for trimming when editing is in scope.
- Forbidden zones: the first 30 seconds; mid-sentence; mid-demo or mid-tension; retention valleys; under the end screen.

## On-screen treatment

- Format: lower third or corner element; never center-screen, never covering the subject's face, on-screen code, or demo UI.
- Duration: 4-7 seconds. Long enough to read twice, short enough not to nag.
- Motion: subtle animate-in and animate-out; animated elements outperform static ones, but the motion must be a gentle slide or fade, not a screen takeover.
- Copy: imperative plus benefit, 7 words or fewer.
- Consistency: one visual CTA style system per channel (same position, palette, animation, per the Production Bible's native-platform styling rule) so viewers learn to parse it instantly.
- Sync: when supporting a verbal CTA, the graphic appears as the words begin and exits shortly after the sentence ends.
- Off-video reinforcement (mc-package metadata, not edits): the primary conversion link goes in the first 1-2 lines of the description and is repeated in a pinned comment. End screen, cards, pinned comment, and description-top all point at the same next step.

## Position decision table

| Goal | Best position | Why |
|---|---|---|
| Subscribe / like (channel growth) | Mid-video, at the strongest payoff near 40-50% | Retention is highest; end-of-video asks miss most viewers |
| Comment prompt | Mid-video, phrased as a specific question tied to the content | Specific questions drive meaningful comments; generic "comment below" does not |
| Watch next / session continuation | End screen (final 10-20 s), optional card at 50-75% | Natural next step at content end |
| Conversion (community, site, newsletter, product) | Pre-outro (~85-95%) as the spoken pitch; description and pinned comment as the click surface | Remaining viewers are most invested; the full video earns the ask |
| Deep-dive / related-topic pointer | Card at the exact transcript moment the topic is mentioned | Contextual relevance drives card clicks |

Conversion CTAs are high-friction (they require leaving the video): maximum one per video, it must offer value beyond the video itself, and the graphic never carries the burden alone (verbal pitch plus graphic plus description-top link plus pinned comment, all identical). When both goals exist in one video, the conversion CTA is usually primary (pre-outro), subscribe becomes the mid-video secondary, and watch-next owns the end screen; never let all three compete in one zone.

## Livestream-VOD rules

When the source is an edited livestream VOD:

1. Strip or ignore live-only CTAs. Verbal asks aimed at the live audience ("drop it in chat", "hit the like while we're live", membership shout-outs) do not convert for replay viewers. Do not add graphics supporting them; flag them for removal when trimming is in scope.
2. Re-anchor to VOD-appropriate copy. Never "enjoying the stream?" on a VOD. Replace live framing with replay framing: "comment below" instead of "chat", "link in the description" instead of "link in chat", subscribe framing tied to the schedule ("streams every week; subscribe so the replays land in your feed").
3. Anchor to chapter seams, not percentages. Replay viewers skip and scrub by chapters; a scrubbing viewer landing mid-video should still encounter CTAs only at seams.
4. Always add an end-screen runway. Raw stream endings have none; hold or extend the final shot to create the 10-20 second zone and point at a related VOD or highlight video.
5. Clip-to-full-video CTAs: any short or clip cut from the VOD ends with an on-screen CTA pointing to the full video. This is the highest-leverage CTA in a clipping pipeline.

## Confidence notes

- High confidence (multiple independent sources or platform mechanics): end screens limited to the final 5-20 s; simple 2-element end screens beat cluttered ones; verbal plus visual pairing beats either alone; no CTAs in the opening seconds; retention collapses in the final 30 seconds, making end-only subscribe asks weak.
- Medium confidence (creator experiments, tool-vendor studies): the size of the ask-vs-no-ask lift; animated CTAs outperforming static; benefit-framed asks strongly outperforming bare commands.
- Directional (practitioner consensus, no controlled data): exact zone percentages, the 2-minute spacing rule, the 3-CTA cap. Treat these as sane defaults; per-channel retention data overrides them when available.
- Known trade-off: even well-executed CTAs produce small retention dips. A small dip at a well-placed ask is an acceptable cost for conversion; a large dip means the ask was jarring, mistimed, or too long.

## Config schema

mc-setup writes the creator's CTA inventory and appetite during the video style interview; it lives in the studio config and is mirrored in the Production Bible's CTA section. The placement pass fills CTA beats from this inventory by priority until the caps hit, and mc-package draws description lines and the pinned-comment suggestion from the same items.

```toml
# Sub-table of [modules.manticore] in the studio config
[cta]
appetite = "moderate"        # aggressive | moderate | minimal

[[cta.items]]
kind = "subscribe"           # subscribe | community | support | product | next-video | playlist | site
label = ""
url = ""
asset = ""                   # optional path under {brand-path} (e.g. a lower-third card)
priority = 1
```

## Placement pass summary

1. Compute runtime; mark the forbidden zones.
2. Scan the transcript for existing verbal CTAs; classify each (kind, target) and score its position against the zones. Keep the best instance per kind; mark the rest voice-only or removable. In VOD mode, additionally flag live-only asks.
3. Scan the transcript for payoff seams (completed explanations, demo successes, section ends) and topic transitions.
4. Fill CTA beats from the configured inventory by priority: sync graphics to kept verbal CTAs first, then place silent-eligible low-friction CTAs at the best remaining seams; enforce spacing, caps, and one ask per window.
5. Reserve and validate the end-screen runway: the final shot must tolerate overlays, and the narration should verbally bridge to the watch-next target (flag it when it does not).
6. Emit CTA rows in the beat table with timestamps, anchors, transcript evidence, and rationale, for gate-3 approval like any other beat.

## Sources

- vidIQ, What Is a YouTube CTA? Definition, Examples, and How to Write One. https://vidiq.com/blog/post/youtube-cta/
- Ventress, YouTube CTA Strategy 2025: Convert Viewers to Subscribers. https://ventress.app/blog/youtube-call-to-action-strategy-convert-viewers-subscribers/
- Mark Brinker, The Real Reason YouTubers Obsess Over Likes and Subscribes (TubeBuddy ask-vs-no-ask experiment). https://www.markbrinker.com/youtube-engagement
- TubeAnalytics, YouTube Cards and End Screens Checklist. https://www.tubeanalytics.net/blog/youtube-cards-end-screens-checklist-for-retention
- Humble & Brag, YouTube End Screens: How to Set Them Up and Optimise Them. https://humbleandbrag.com/blog/youtube-end-screens
- OverseerOS, YouTube Retention Curve Audit. https://www.overseeros.com/blog/youtube-retention-curve-audit
- Viral Idea Marketing, YouTube Video Editing for Livestream Replays. https://www.viralideamarketing.com/post/youtube-video-editing-for-livestream-replays-how-to-cut-and-repurpose-content
- Restream, 9 Ways to Repurpose Your Live Video Content. https://restream.io/blog/repurpose-live-videos/
