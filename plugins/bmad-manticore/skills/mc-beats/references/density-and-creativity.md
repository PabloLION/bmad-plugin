# Density and Creativity Reference

Research-backed rules for proposing the graphics beat table from a transcript of talking-head, tutorial, or livestream-VOD content. mc-beats reads this before planning any beats. Goal: maximize retention through purposeful visual variety without clutter.

## The creativity mandate (read this first)

The single most common failure mode of automated graphics planning is a sparse sequence of plain text cards: a few bullet slides scattered through the video. That is a failed plan. In high-retention channels, plain talking head is the minority of screen time in the opening, and the supporting visuals are diverse: b-roll, animated diagrams, screenshots with motion, annotated zooms, stat treatments, not just text.

Hard rules for every plan:

- Variety quota: use at least 6 distinct overlay types (from the taxonomy below) in any video over 5 minutes. No single type may account for more than 40% of proposed beats.
- Plain text card cap: static text-only cards may be at most 25% of beats, and never more than 2 consecutive beats of the same type. Every text moment should first be considered for an upgrade: can it be an icon plus text callout, an animated list build, a stat counter, a diagram, or a screenshot instead?
- Escalate the treatment to the content: a number deserves a big animated stat, not a sentence on a card. A process deserves a diagram, not a paragraph. A comparison deserves a split-screen or table build, not two bullets.
- Default to motion: every element enters and exits with simple animation (fade, slide, pop, word-by-word build). Static frames read as unfinished.
- When in doubt, propose the richer option and mark it optional. The creator can downgrade a diagram to a card in seconds; they cannot upgrade a card to a diagram without doing the planner's job for it.

## Density tiers

The graphics-frequency tier comes from `[style]` in the studio config, with per-format overrides recorded in the Production Bible. Two budgets matter: visual changes (any pattern interrupt: cut, zoom, b-roll, graphic) and graphic beats (what this plan proposes). These targets govern the beats:

| Tier | Seconds per beat | Beats per minute | Character | Typical mix |
|---|---|---|---|---|
| high | ~10-20 s | 3-6 | Retention-editing style; something new on screen most of the time; layered sound cues | Heavy b-roll, keyword pops, animated diagrams, zoom annotations; talking head rarely bare for more than 10 s |
| medium | ~20-45 s | 1.5-3 | Polished educational channel; every key point visualized, breathing room between | B-roll, lower thirds, list builds, stat cards, screenshots; bare talking head fine for 15-20 s stretches |
| low | ~45-90 s | 0.7-1.3 | Minimal, authoritative; graphics only where they genuinely clarify | Chapter cards plus the occasional stat, diagram, or screenshot at the most important moments only |

Benchmarks behind the tiers: high-energy content changes something visually every 5-7 seconds; top creators average roughly 19 shot changes in the first 30 seconds with bare talking head under ~20% of those shots; high-production channels introduce a new stimulus every 20-30 seconds; minimal-touch guidance for long talking segments is one well-placed graphic every 30-60 seconds.

## Pacing curve (apply at every tier, front-loaded)

- Front-load: in the first 30-60 seconds, run roughly 2x the tier's density. This is where most drop-off happens.
- Mid-video: settle to the tier baseline; favor context-adding b-roll and diagrams over decorative pops.
- Reset every 1-2 minutes: insert a deliberate pattern interrupt (chapter card, big diagram, full-screen b-roll) so no long stretch is visually flat.
- Chapter and topic changes always get a visual event, regardless of tier.
- Livestream VODs: treat the trimmed VOD like a normal video; density targets apply to the edited runtime. Additionally add context overlays (what is happening, who is speaking, what was just asked) since replay viewers lack the live chat context.

STORYBOARD.md must justify any stretch that exceeds the tier's seconds-per-beat budget.

## Overlay taxonomy and when-to-use rules

| Type | What it is | Use when | Notes |
|---|---|---|---|
| Keyword pop | 1-4 words that punch onto screen as spoken | Emphasis on a key term, punchline, or strong claim | 1-2 s; sync exactly to the spoken word; optional subtle sound cue |
| Icon + text callout | Small icon paired with a short label, off to one side | Tips, tools, features, pro-tip moments | Preferred upgrade over bare text; keeps the face visible |
| Lower third | Name/title/context bar at bottom | Introducing a person, source, tool, or segment | Simple fade or slide only; nothing that spins or bounces |
| Animated list build | Items appearing one by one, timed to speech | Any enumerated list of 2+ items (reasons, steps, rules) | Never show all items at once; the build creates forward pull |
| Stat/number card | Large animated number, counter, or percentage with a short label | Any statistic, price, date, metric, or quantified claim | Numbers on screen are far more memorable than spoken alone |
| Comparison split / table build | Side-by-side panels or a table filling in row by row | X vs Y, before/after, pros/cons, option evaluation | Split-screen for two things; table for three or more attributes |
| Animated diagram | Simple boxes, arrows, and flows animating in stages | Processes, architectures, pipelines, relationships, abstract concepts | The highest-value beat in tutorials; stage the reveal with the narration |
| Screenshot with zoom/pan | Real UI, document, or page with motion and a highlight | Any mention of a specific tool, site, setting, doc, or code | Highlight the relevant region; motion prevents the static-slide feel |
| Annotation overlay | Circle, arrow, underline, or highlight drawn over existing footage | Directing attention within an already-visible frame | Cheap, effective attention director |
| B-roll clip | Footage (stock, recorded, or generated) illustrating the topic | Stories, anecdotes, examples, physical objects, mood | 2-5 s per clip; chain several over continuous speech to lift pace |
| Meme / reaction insert | Short meme image, GIF, or reaction clip | Jokes, sarcasm, relatable pain points, exaggeration | Audience-dependent; strong in dev/gaming/creator niches, sparing in corporate content; flag as swappable |
| Quote card | Styled quotation with attribution | Quoting a person, review, post, or document | Give it typographic treatment (kinetic, word-by-word), not a plain box |
| Definition popup | Term plus one-line definition in a small panel | First use of jargon, acronyms, or technical terms | Keeps novices on board without interrupting speech |
| Chapter/section card | Full-screen or large title marking a new section | Every chapter or topic change | Doubles as a pattern-interrupt reset; number chapters to signal progress |
| Progress bar / step tracker | Persistent or recurring indicator of position in a list or process | Multi-step tutorials, countdown lists, day-X formats | Creates completion pressure that fights mid-video drop-off |
| Chart/graph | Animated bar, line, or pie visualization | Trends, distributions, anything with 3+ data points | Animate the data drawing in; never paste a static chart |
| Timeline | Horizontal sequence of dated or ordered events | History, roadmaps, how-we-got-here narratives | Reveal events sequentially |
| Kinetic typography sequence | Full-screen animated text choreography | Big statements, manifesto moments, hooks | Reserve for 1-2 peak moments per video; expensive attention-wise |

## Transcript-trigger heuristics

Scan the transcript sentence by sentence. Each pattern below is a trigger; the mapped treatment is the default proposal. (Adobe's B-Script research confirmed that transcript-anchored b-roll recommendation produces measurably more engaging edits than unaided placement.)

| Transcript trigger | Detect by | Default treatment |
|---|---|---|
| Enumerated list / steps | "three things", "first... second...", steps, ordinals | Animated list build; add a progress tracker if it spans the video |
| Number, stat, price, date, metric | Digits, percentages, currency, "million", years | Stat/number card or animated counter |
| Comparison / trade-off | "versus", "compared to", "better than", "pros and cons", before/after | Split-screen or table build |
| Technical term / acronym (first use) | Domain terms, capitalized acronyms, "so-called" | Definition popup or icon plus text callout |
| Named tool, product, site, company, person | Proper nouns | Screenshot with zoom/pan, logo pop, or lower third (for people) |
| Process / how-it-works explanation | "first it... then it...", "the way this works", causal chains | Animated diagram, staged with the narration |
| Story / anecdote / example | "for example", "one time", past-tense narrative | B-roll sequence (2-3 clips chained) |
| Joke, sarcasm, exaggeration | Punchline structure, hyperbole, self-deprecation | Meme/reaction insert or comedic keyword pop with sound cue |
| Direct quote or citation | "as X said", "the study found", reading text aloud | Quote card with attribution |
| Strong claim / key takeaway | "the most important thing", "here's the truth", superlatives | Keyword pop or kinetic emphasis; treat as a headline moment |
| Question posed to viewer | Second-person questions, rhetorical setups | On-screen question text (builds an open loop) |
| Chapter/topic transition | "next", "moving on", "now let's talk about", long pause plus topic shift | Chapter card plus optional progress indicator |
| Warning / common mistake | "don't", "avoid", "the biggest mistake" | Alert-style callout (icon plus text, warning color) |
| Data trend / result | "grew", "dropped", "over time", multiple related numbers | Animated chart |
| Resource / link / CTA | URLs, "link in description", "download" | Lower third or corner badge; end-screen card for the final CTA (see the CTA placement reference) |
| Emotional peak / reveal | Tone shift, "and then...", payoff of a setup | Reserve the biggest treatment here: full-screen graphic, dramatic zoom with sound, kinetic type |
| Spoken but not shown (VOD) | References to chat, off-screen events, earlier context | Context overlay explaining what the viewer cannot see |

Priority when triggers collide or the budget is tight: chapter changes > processes and diagrams > numbers, lists, comparisons > term definitions and tool screenshots > quotes and jokes > decorative keyword pops. If a 60-second stretch has zero triggers, add b-roll or a summarizing callout anyway; flat stretches are where retention dies.

## Craft rules for every beat

- Sync to speech: an overlay appears on the exact word it supports and leaves when the point is done. Late or lingering graphics feel broken.
- Durations: keyword pops 1-2 s; callouts and lower thirds 3-6 s; b-roll clips 2-5 s; diagrams and list builds as long as the explanation, animating in stages.
- One graphic at a time: never stack two competing overlays (persistent progress bars and captions excepted).
- Layout: keep a 3-5% margin from screen edges; never cover the speaker's face or the most informative region of the frame; respect caption space when captions are on.
- Consistency: one type scale, one color system, one animation language across the whole video (the Production Bible is that contract). Variety of type, consistency of style.
- Readable on a phone: big, high-contrast text; roughly 8 words maximum per text element.
- Sound cues: a subtle whoosh or pop on important beats signals attention, but not on every element.
- Match the register of the content: no memes in a corporate explainer, no neon gaming pops in a finance channel. When style is unknown, default to clean and neutral and flag tone-dependent beats as swappable.

## The two anti-patterns

1. Sparse static text cards. The baseline failure this reference exists to prevent: a handful of unanimated bullet slides across a long video. Fixed by the creativity mandate, the variety quota, and the tier's density floor.
2. Overedited chaos. Endless zooms, whooshes, and effects on routine sentences fatigue viewers, especially audiences 25 and up; even the most-watched hyper-edited channels publicly slowed their editing in 2024 because hyper-stimulus was hurting watch time. Density targets are ceilings as well as floors: space elements out, keep one graphic at a time, and save the biggest treatments for genuine peaks.

## Plan self-check

Before presenting the beat table, verify:

- Beats per minute match the configured tier, with roughly 2x density in the first 30-60 seconds.
- No gap longer than the tier's seconds-per-beat ceiling without any visual event (or a STORYBOARD.md justification).
- At least 6 overlay types used; no type over 40% of beats; plain text cards at or under 25%.
- Every list, number, comparison, process, and chapter change in the transcript has a treatment.
- Every beat is anchored to a specific transcript timestamp and phrase.
- The biggest treatments land on the video's genuine peak moments.
- Nothing overlaps, covers faces, or hugs screen edges.

## Sources

- AIR Media-Tech, Advanced retention editing: cutting patterns that keep viewers past minute 8. https://air.io/en/youtube-hacks/advanced-retention-editing-cutting-patterns-that-keep-viewers-past-minute-8
- Edicion Video Pro, Audience Retention: How to Edit Videos That Keep Viewers Hooked. https://edicionvideopro.com/en/video-workflow-tutorials/audience-retention-how-to-edit-videos-that-keep-viewers-hooked/
- Huber et al. (Adobe Research, CHI 2019), B-Script: Transcript-based B-roll Video Editing with Recommendations. https://arxiv.org/abs/1902.11216
- Uppbeat, How to Increase Audience Retention on YouTube. https://uppbeat.io/blog/youtube-growth/youtube-analytics/youtube-audience-retention
- Washington Post (2024), MrBeast calls for slowing down video editing styles. https://www.washingtonpost.com/technology/2024/03/30/video-editing-mrbeast-retention/
- Increditors, Guide to Hormozi, Abdaal, and MrBeast editing styles. https://increditors.com/an-ultimate-guide-to-alex-hormozi-ali-abdaal-and-mr-beast-video-editing-style-and-methods/
- FilterGrade, How to Edit Livestreams for YouTube Highlight Videos. https://filtergrade.com/how-to-edit-livestreams-youtube-highlight/
