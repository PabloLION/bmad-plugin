# Voice Bible: Build Spec

The voice bible is the primary taste file for mc-script. It lives at `{brand-path}/voice-bible.md` and is deconstructed from the creator's OWN published transcripts, never written from memory or imagination. mc-setup copies this spec there as the placeholder until it is built.

## How to build it

1. Pull transcripts for 5 to 10 of the creator's published videos (`yt-dlp --write-auto-subs`, or captions they already have).
2. Save the cleaned spoken transcripts of the 3 to 5 best-performing ones into `{brand-path}/exemplars/` (naming: `YYYY-MM-DD-<video-slug>.md`, frontmatter noting the URL and stats at capture time).
3. Deconstruct, with evidence quotes for every claim:
   - Sentence length distribution and rhythm (short/long alternation).
   - How they open a video (their real cold-opens, not a formula).
   - How they transition between points (their actual connective phrases).
   - Signature phrases and recurring constructions they really use.
   - What they do with jargon (which terms they assume, which they unpack).
   - How they hedge, emphasize, and express opinion.
   - Filler behavior worth keeping (authenticity) vs cutting.
   - Speaking rate: MEASURE it from a real transcript (word count / duration) and write the number into the studio config `[owner] wpm`. On-camera educators often run 180+; the generic 145 estimate is usually wrong.
4. Every rule in the bible must cite at least one verbatim example from an exemplar.

## Consumers

- mc-script reads it before weaving and checks output against it.
- mc-outline uses the hook section to shape hook candidates.
- mc-retro appends corrections when the creator flags voice misses.

## Also in the brand folder

- `exemplars/` as above.
- `headshots/`: 3 to 6 approved reference photos of the creator, the input for face-consistent thumbnail generation. Approved photos only; mc-package never uses arbitrary frames from footage.
