# Engine: OGraf (dual-target graphics)

Ships with the module: `assets/` (graphic templates), `references/` (spec notes, Resolve workflow notes), and `scripts/` (scaffold and Playwright-verify).

## Why this engine exists in the suite

OGraf (EBU spec) is the only graphics format that is simultaneously:

- a native DaVinci Resolve 21 media-pool citizen (graphics stay EDITABLE inside Resolve during the creator's polish pass, unlike baked alpha MOVs), and
- an OBS/CasparCG live graphic via the free SPX-GC controller (click-to-trigger during streams).

No commercial stream-package vendor sells assets that work in both places. That makes OGraf the engine for lower thirds and topic cards that need to live in both worlds, and the backbone of the livestream pack.

## Jobs

- Lower thirds and topic cards for mc-stream-pack (SPX-GC compatible, standalone-capable HTML).
- Resolve-editable titles/lower thirds for edited videos when post-import tweaking matters more than motion complexity (baked HyperFrames alpha is the default; OGraf is the "keep it editable" escape hatch).

## Ported knowledge

- `references/ograf-spec.md`: the loading rules and spec constraints that were hard-won getting OGraf graphics loading reliably in Resolve.
- `references/resolve-workflow.md`: how OGraf graphics behave in Resolve 21.
- `scripts/scaffold_ograf.py` + `scripts/verify_ograf.py` (+ tests): scaffold a compliant graphic; Playwright-verify rendering.

## Note

No commercial vendor sells brand-locked dual-target packs like this; it is a genuine differentiator for creators who both edit and stream.
