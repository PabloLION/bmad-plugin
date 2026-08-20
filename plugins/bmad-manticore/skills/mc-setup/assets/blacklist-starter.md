# Script Blacklist: LLM Tells and Slop

Starter blacklist shipped with Manticore; mc-setup copies it to `{brand-path}/blacklist.md`, which is the live copy the lint enforces. Enforced by the pipeline's `lint_script.py` on every script before it is presented. The lint parses every fenced `regex` block in this file; one pattern per line, `#` lines are comments, matching is case-insensitive per line of the target.

Scope: each regex block opens with a `# scope:` comment. `all` blocks bind every linted surface (scripts, outlines, titles, descriptions, CTA copy). `scripts` blocks carry spoken-cadence rules and bind spoken artifacts only (script.md, outline.md); on written packaging copy a hit from a `scripts` block is advisory, not blocking. `lint_script.py` itself applies every block to whatever it is given, which is correct for spoken artifacts; the calling skill decides which hits block for written surfaces.

mc-retro appends new patterns to the live copy when the creator flags a tell in a published or drafted script. The live copy only grows; prune it by hand if a pattern bites legitimate speech.

## Voice patterns (all surfaces)

```regex
# scope: all
# openers and throat-clearing
\bin today'?s video\b
\bwithout further ado\b
\bwelcome back to (the|my) channel\b
\blet'?s (dive|jump) (right )?in(to)?\b
# banned words
\bdelve\b
\bdive deep\b
\bdeep dive\b
\bgame.?chang(er|ing)\b
\bunleash\b
\bunlock (the )?(power|potential|secrets?)\b
\brevolutioniz\w*
\bseamless(ly)?\b
\bleverag(e|ing)\b
\brobust\b
\belevate\b
\bembark\b
\bsupercharg\w*
\bactionable\b
\bharness (the )?power\b
\bhidden gem\b
# banned transitions
\bfurthermore\b
\bmoreover\b
\badditionally\b
\bin conclusion\b
\bin summary\b
\bto summarize\b
\bfirst and foremost\b
\blast but not least\b
\b(that|with that) being said\b
\bwith that said\b
\bneedless to say\b
\bit'?s worth noting\b
\bnow that we'?ve covered\b
# banned phrases and constructions
\bin the world of\b
\bin the (ever.)?(changing|evolving) landscape\b
\bit'?s important to note\b
\bat the end of the day\b
\blet that sink in\b
\bbut here'?s the (thing|kicker|catch)\b
\btake (it|this|your \w+) to the next level\b
\bimagine (a world|if you could)\b
\bwhether you'?re a\b
\bnot (just|only) \w[^.,;]{0,40}, but\b
\bthe (best|craziest|wildest) part\?
\bgone are the days\b
\bsay goodbye to\b
```

## Spoken-cadence punctuation (scripts only)

Scripts are read aloud. Dashes are written-LLM cadence the creator would never speak, and TTS engines read them badly. These rules bind script.md and outline.md; written packaging copy is exempt unless the creator adds a matching rule via retro.

```regex
# scope: scripts
# punctuation tells
—
–
```

## Manual QA (not regexable, checked by mc-script's craft pass)

- Fake-casual specificity: invented details like "Tuesday", coffee props, weather set-dressing. Real details or none.
- Sentences that do not trace to a braindump phrase and are not flagged as invented (quote-or-cut violations).
- Symmetric triads ("fast, cheap, and reliable") where the creator's natural speech would use one or two items.
- Rhetorical questions the viewer did not ask.
- Every paragraph opening with the same construction.
