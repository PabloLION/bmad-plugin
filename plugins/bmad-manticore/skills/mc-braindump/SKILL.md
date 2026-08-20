---
name: mc-braindump
description: Interview the creator about a video idea and capture their exact words verbatim. The braindump is the raw material every script sentence must trace back to. Use at the braindump stage or when the creator wants to talk through an idea for a project.
---

# mc-braindump

The single most important input to the whole pipeline: the script stage may only use words that exist in this file (quote-or-cut). Capture generously.

## Steps

1. Load the studio config (`uv run {project-root}/_bmad/scripts/resolve_config.py --project-root {project-root} --key modules.manticore`; empty means mc-setup has not run: stop and route the creator there) and this skill's own surface (`uv run {project-root}/_bmad/scripts/resolve_customization.py --skill {skill-root}`; run `{workflow.activation_steps_prepend}` now, `{workflow.activation_steps_append}` after this step, and hold `{workflow.persistent_facts}` as standing context). Resolve `paths` values against `{project-root}`. Read `project.json` and `brief.md`. Confirm stage is `braindump`. Read the format profile at `{formats-path}/<format>.md` for the project's `format` and any taste files it names.
2. ALWAYS offer camera-rolling capture (interview-recording mode) before the first question: if the creator records this session (constant frame rate), their spoken answers double as potential takes. The convention: they read each question aloud to the lens as "Question from the interviewer: <the question>" before answering; that spoken marker cue lets mc-cut segment the recording mechanically (cut the question reads, keep the answers). The cue is configurable (setup interview; cutplan.py `--marker-cues`); the older "question from claude" phrasing remains a documented alternative for studios that recorded with it. Whether or not the camera rolls, then interview, one question at a time, conversationally. Goal: get the creator talking at length in their own phrasing. Capture each answer into `braindump.md` verbatim as it is given; never rely on conversation memory for their exact words. Cover, in whatever order the conversation goes:
   - the core claim (what do they actually believe here),
   - who it is for and what they get,
   - the story or example they would tell a friend,
   - the strongest objection and their answer to it,
   - what everyone else gets wrong,
   - the demo/proof they can show,
   - what the viewer should SEE, asked verbatim: "what should the viewer see: demos, screens, drawings, motion, or moments you picture as a graphic?" (capture the answer word for word like every other; mc-outline and mc-beats read it as candidate visual moments),
   - how they would say the payoff in one breath.
3. Keep interviewing until their phrasing repeats (saturation) or they call it. Do not stop at a fixed question count.
4. Finalize `braindump.md`: VERBATIM capture of their answers, lightly grouped under the question headings. Their words untouched: keep their fragments, their slang, their fillers. No paraphrasing, no cleanup, no summarizing.
5. If the session was recorded: have the creator drop the file into the project's `raw/` and register it in project.json `sources` with role `"interview"` (see the PIPELINE.md contract). It is both braindump corpus and candidate takes.
6. Update project.json: set `artifacts.braindump`, append `braindump` to `stages_done`, and set `stage` to the entry after `braindump` in this project's `stages` array. Stop.

## Rules

- Never polish their phrasing. The point is a corpus of their real language.
- If the session arrives as an external recording/transcript instead of live conversation, save the raw transcript into the project's `raw/` first, then quote from it in braindump.md.
- Your questions are scaffolding; their answers are the artifact.
