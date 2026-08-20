# Generative Editing Rules

Safety rules for every generative asset lane (image and video, any provider). mc-assets applies them on every farm and every revision; they are mirrored in the mc-assets checklist and in the `farm_asset.py` docstring. Violating any of them produces the classic generative failure modes: compounding artifacts, mutated subjects, and wasted iteration loops.

## Rule 1: never chain generative edits

Every revision regenerates from the ORIGINAL source assets with all accumulated fixes expressed in one prompt. Never feed a generated output back in as the base for the next edit: passing the revision of a revision of a revision degrades like a photocopy of a photocopy. When a tweak is needed (say a thumbnail built from some assets and a prompt), start fresh: send ALL the original assets again with one improved prompt, not the first version plus a delta. Reference inputs (`--ref`) take real photography or the original source only, never a prior generation.

## Rule 2: small deterministic fixes are composited, never regenerated

A logo swap, one wrong text line, a color correction: these are programmatic composites (rsvg, ffmpeg), not regeneration jobs. Regenerating a whole asset to fix one deterministic element risks everything else that was already right.

## Rule 3: self-inspect before the creator sees anything

Inspect every output against the request at zoom BEFORE presenting it: the gesture points at the right target, the expression matches, no anatomical or rendering artifacts, all text is exactly the requested string. An output that fails inspection is retried, not shown.

## Rule 4: people come from their original photos

To put the creator (or anyone) in an asset, pass the approved original photo as a reference input and say it in the prompt: "use the person in this image to {whatever the asset needs}". Current image models handle the likeness from there; no pre-processing, masking, or cutout step is required. What breaks likeness is not the model, it is chaining (rule 1): every revision re-sends the same original photo with the revised prompt, never a prior generation of the person.

## Rule 5: prompting rules

- Short text that must appear in the asset is quoted as an exact string in the prompt ("the badge reads exactly: \"1.0\""). This replaces the stale blanket warning that generated text is always gibberish; current models render short quoted strings reliably, and exactness comes from quoting.
- Wardrobe and object edits spell out the physics (how fabric hangs, what the object rests on, what occludes what) instead of naming the item alone.
- Always list what must NOT change, explicitly, every time (face, pose, lighting, background, framing).
- Ask for margins when content sits near canvas edges; generation crops and drifts at borders.
- Expression variants from one reference image use the pattern: "use this person but have them {expression}".

## Rule 6: long tasks run in background; deadlines cap iteration

Long generative jobs (video generation, large batches) run in the background with proactive progress reporting; the creator is never left staring at a silent stage. When the project carries an event deadline (set at mc-new), deadline mode orders deliverables by their hard external gates and caps iteration loops in favor of good-enough delivery: a shipped asset at the deadline beats a perfect asset after it.
