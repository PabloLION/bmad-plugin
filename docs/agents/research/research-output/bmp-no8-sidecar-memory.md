# BMAD Sidecar Memory System Research

**Issue:** bmp-no8
**Date:** 20260306
**Sources searched:** `.upstream/BMAD-METHOD/`, `.upstream/bmad-builder/`

---

## Summary

The BMAD sidecar memory system is a per-agent persistent memory mechanism. Each
"expert" agent optionally ships with a folder of markdown files that get
installed into `_bmad/_memory/<agent-name>-sidecar/` at the user's project
root. The agent then reads and writes those files at runtime to maintain state
across sessions. No `memories.md` file exists in BMAD-METHOD itself — it is
a template file that lives in the sidecar source directory and is defined by
whoever creates the agent.

---

## 1. The `_memory/` folder structure

After installation, the runtime location is:

```text
{project-root}/_bmad/_memory/
└── tech-writer-sidecar/
    └── documentation-standards.md
```

Only one agent in `BMAD-METHOD` ships with a sidecar: `tech-writer`. Its
sidecar source is at:

```text
src/bmm/agents/tech-writer/tech-writer-sidecar/
└── documentation-standards.md
```

The installer copies the source folder to `_bmad/_memory/tech-writer-sidecar/`
during `bmad install`.

The `bmad-builder` upstream provides two additional sidecar examples used as
reference material:

```text
# Reference example (journal-keeper):
src/workflows/agent/data/reference/with-sidecar/journal-keeper/journal-keeper-sidecar/
├── memories.md
├── instructions.md
├── mood-patterns.md
├── breakthroughs.md
└── entries/

# Sample custom module (wellness-companion):
samples/sample-custom-modules/sample-wellness-module/agents/wellness-companion/wellness-companion-sidecar/
├── memories.md
├── instructions.md
├── insights.md
├── patterns.md
└── addition1.md
```

The `_memory/` folder is specifically excluded from module detection logic in
the installer — it is never treated as a BMAD module directory.

---

## 2. What is `memories.md`?

`memories.md` is an agent-writable state file that an agent updates after every
session. It acts as the agent's long-term user profile and session history.

The journal-keeper example shows what it contains:

- User profile (preferences, communication style)
- Recurring themes detected over time
- Emotional patterns and growth markers
- Per-session notes (mood, themes, observations)

The `instructions.md` for journal-keeper explicitly directs the agent:

> "Load memories.md FIRST - know our history together"
> "Always save to memories.md" (after each session)

`memories.md` is not a template in the sense of being read-only. It ships
with placeholder text (`[Date of first session]`, etc.) as a structured
scaffold. The agent overwrites and extends it at runtime. It is therefore a
**writable state file that starts from a template scaffold**.

`memories.md` is not present in BMAD-METHOD itself. The tech-writer sidecar
ships only `documentation-standards.md` and has no `memories.md`. The
`memories.md` pattern comes from agent authoring guidance in `bmad-builder`.

---

## 3. Why is there a `_memory/` folder in addition to `memories.md`?

The question contains a slight conflation. There is no `memories.md` in
BMAD-METHOD's own agents. The relationship is:

- `_memory/` is the **folder** — the installed sidecar at the project root
- `memories.md` is one **file** that may live inside a sidecar

The folder can contain many files, not just `memories.md`. Each file serves
a distinct purpose. Using multiple files instead of one monolithic file keeps
concerns separated:

- `memories.md` — session history, user profile, accumulated state (writable)
- `instructions.md` — agent operating protocols, safety rules (mostly stable)
- `documentation-standards.md` (tech-writer) — style rules the user can update
- `mood-patterns.md`, `breakthroughs.md` — domain-specific tracking tables

The `understanding-agent-types.md` document in `bmad-builder` shows the
canonical sidecar structure:

```text
agent-name-sidecar/
├── memories.md           # User profile, session history
├── instructions.md       # Protocols, boundaries
├── [custom-files].md     # Tracking, goals, etc.
├── workflows/            # Large workflows on-demand
└── knowledge/            # Domain reference
```

Each file type has a different lifecycle:
- Some files the agent writes to every session (`memories.md`)
- Some files the agent reads but rarely writes (`instructions.md`)
- Some files the user updates via a menu command (`documentation-standards.md`)
- Some files store structured logs (`mood-patterns.md`)

---

## 4. Read-only templates vs agent-writable state

Classification of each file type found in the sidecar examples:

```csv
File,Classification,Written by,Notes
memories.md,Agent-writable state,Agent (every session),Starts as scaffold; grows at runtime
instructions.md,Stable read-only,Agent author,Defines protocols; agent reads but does not rewrite
documentation-standards.md,User-updatable,User via [US] menu command,Agent reads; user extends via "Update Standards" action
mood-patterns.md,Agent-writable state,Agent (per session),Tabular log; agent appends rows
breakthroughs.md,Agent-writable state,Agent (on event),Agent captures insight entries
insights.md,Agent-writable state,Agent,Per wellness-companion example
patterns.md,Agent-writable state,Agent,Per wellness-companion example
```

The key distinction: `instructions.md` is the agent's operating contract
(written by the agent author, read by the agent at startup). `memories.md`
is the agent's growing memory of the user (written by the agent at runtime).

There is one notable exception: `documentation-standards.md` in the
tech-writer sidecar has a `## User Specified CRITICAL Rules` section that the
agent is explicitly instructed to write to when the user runs the `[US] Update
Standards` command. This makes it a hybrid — it ships as a read-only template
but is designed to be extended by the agent on user request.

---

## 5. How the sidecar system is initialized

The sidecar is installed by the BMAD CLI installer, not created at runtime.

The flow in `tools/cli/installers/lib/modules/manager.js`:

1. When installing a module, the installer compiles each `.agent.yaml` to a
   `.md` file and checks `agent.metadata.hasSidecar`.
2. If `hasSidecar: true`, it looks for a directory named `<agent-name>-sidecar`
   alongside the `.agent.yaml` file.
3. It copies all files from that source sidecar directory into
   `_bmad/_memory/<agent-name>-sidecar/` in the user's project.
4. On updates, the installer compares file hashes. If the user has modified
   a sidecar file since installation, the file is preserved. If the file is
   unmodified, the installer updates it from the source.

This means the initial content of `memories.md` (and all other sidecar files)
is whatever the agent author put in the source sidecar directory. It is
pre-existing in the repo, not generated at runtime.

Relevant code paths:

- `tools/cli/installers/lib/modules/manager.js` — `copySidecarToMemory()`,
  `installModuleAgents()`, lines 92–186 and 980–1018
- `tools/cli/installers/lib/core/installer.js` — sidecar directories are
  skipped during regular file copy (line 2207–2214); `_memory` dir is excluded
  from module detection (line 1739)

---

## 6. How agents reference sidecar files

Agents reference sidecar files using the literal path
`_bmad/_memory/<agent-name>-sidecar/<file>.md` in their YAML source.

From `tech-writer.agent.yaml`:

```yaml
# In principles:
- I will always strive to follow `_bmad/_memory/tech-writer-sidecar/documentation-standards.md` best practices.

# In menu actions:
action: "Author final document following all `_bmad/_memory/tech-writer-sidecar/documentation-standards.md`."
action: "Update `_bmad/_memory/tech-writer-sidecar/documentation-standards.md` adding user preferences..."
action: "Review the specified document against `_bmad/_memory/tech-writer-sidecar/documentation-standards.md`..."
```

The `bmad-builder` `understanding-agent-types.md` shows the canonical pattern
for agents with sidecar — two mandatory `critical_actions` entries:

```yaml
critical_actions:
  - "Load COMPLETE file {project-root}/_bmad/_memory/{sidecar-folder}/memories.md"
  - "Load COMPLETE file {project-root}/_bmad/_memory/{sidecar-folder}/instructions.md"
  - "ONLY read/write files in {project-root}/_bmad/_memory/{sidecar-folder}/"
```

The tech-writer agent does not follow this exact pattern (it lacks
`memories.md` and `instructions.md`); it references the sidecar only in
principles and menu actions, not in `critical_actions`.

---

## 7. What `hasSidecar` means in agent YAML files

`hasSidecar` is a boolean metadata field on every agent. Its sole purpose is
to tell the installer whether to look for and copy a sidecar directory.

```yaml
agent:
  metadata:
    hasSidecar: true   # or false
```

All agents in BMAD-METHOD have this field. Among the bmm module agents, only
`tech-writer` has `hasSidecar: true`. All others (`analyst`, `architect`,
`dev`, `pm`, `qa`, `ux-designer`, `sm`, `quick-flow-solo-dev`) have
`hasSidecar: false`. The core `bmad-master` also has `hasSidecar: false`.

The schema validates this field as a required boolean
(`tools/schema/agent.js`, line 232).

At install time, if `hasSidecar: true`:
- Installer looks for `<agent-name>-sidecar/` next to the `.agent.yaml`
- Copies contents to `_bmad/_memory/<agent-name>-sidecar/`
- Warns if the directory is missing

If `hasSidecar: false`:
- Installer skips sidecar processing entirely

The `hasSidecar` flag has no effect at LLM runtime — the agent's own
`critical_actions` or `principles` must explicitly reference the sidecar
paths for the LLM to load them. The flag is purely an installer concern.

---

## Recommendations for Plugin Port

1. **No equivalent mechanism needed for Claude Code.** Claude Code already
   has native persistent memory (`.claude/agent-memory/`). The sidecar system
   solves a problem that does not exist in our architecture.

2. **For agents that need persistent domain state** (e.g., tech-writer
   documentation standards), use the Claude Code agent `memory:` setting and
   topic files (e.g., `documentation-standards.md` in agent memory dir) rather
   than replicating the `_memory/` folder convention.

3. **`memories.md` is not a concept to port** — it is a pattern for
   conversation-state agents (journal keepers, coaches) that maintain user
   relationship history. Our plugin agents are task-focused specialists
   dispatched per issue; they do not maintain per-user session history.

4. **`instructions.md` content** can be folded into the agent's system prompt
   directly in the Claude Code agent definition, since agent files are not
   compiled from YAML and do not have the same size constraints.

5. **`documentation-standards.md` pattern is worth porting** — the tech-writer
   agent's "user-updatable standards file in a known path" is genuinely useful.
   The Claude Code equivalent would be a file in the agent's memory directory
   that the agent reads at startup and can update when the user requests.

6. **`hasSidecar` flag** has no direct equivalent needed in our plugin. The
   nearest concept is whether an agent has a non-empty memory directory with
   topic files beyond `MEMORY.md`.
