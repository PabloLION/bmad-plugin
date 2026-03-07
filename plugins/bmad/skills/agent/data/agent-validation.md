# Agent Validation

## Common (All Agents)

### YAML Structure
- [ ] Parses without errors
- [ ] `metadata`: `id`, `name`, `title`, `icon`, `module`, `hasSidecar`
- [ ] `hasSidecar`: `true`|`false`
- [ ] `module`: `stand-alone`|`bmm`|`cis`|`bmgd`|...
- [ ] `persona`: `role`, `identity`, `communication_style`, `principles`
- [ ] `menu`: ≥1 item
- [ ] Filename: `{name}.agent.yaml` (lowercase, hyphenated)

### Persona Fields

| Field | Contains | Does NOT Contain |
|-------|----------|------------------|
| `role` | Knowledge/skills/capabilities | Background, experience, "who" |
| `identity` | Background/experience/context | Skills, "what" |
| `communication_style` | Tone/voice/mannerisms (1-2 sentences) | "ensures", "expert", "believes", "who does X" |
| `principles` | Operating philosophy, behavioral guidelines | Verbal patterns, "how they talk" |

### Menu Items
- [ ] `trigger`: `XX or fuzzy match on command-name` (XX = 2-letter code, unique)
- [ ] No reserved codes: `MH`, `CH`, `PM`, `DA` (auto-injected)
- [ ] `description`: Starts with `[XX]`, code matches trigger
- [ ] `action`: `#prompt-id` (exists) or inline text

### Prompts (if present)
- [ ] Each has `id`, `content`
- [ ] IDs unique within agent
- [ ] Uses semantic XML: `<instructions>`, `<process>`, etc.

### Quality
- [ ] No broken references
- [ ] Indentation consistent
- [ ] Purpose clear from persona
- [ ] Name/title descriptive, icon appropriate

---

## hasSidecar: false

### Structure
- [ ] Single `.agent.yaml` file (no memory folder)
- [ ] No `.claude/agent-memory/` paths
- [ ] Size under ~250 lines (unless justified)

### critical_actions (OPTIONAL)
- [ ] No references to sidecar files
- [ ] No placeholders, no compiler-injected steps
- [ ] Valid paths if any files referenced

**Reference:** `commit-poet.agent.yaml`

---

## hasSidecar: true

### Structure
- [ ] Agent memory folder: `.claude/agent-memory/{agent-name}/`
- [ ] Memory folder contains: `MEMORY.md` (agent-writable)
- [ ] Plugin data folder: `${CLAUDE_PLUGIN_ROOT}/data/{agent-name}/` (contains `instructions.md` and other stable files)

### critical_actions (MANDATORY)
```yaml
critical_actions:
  - 'Load COMPLETE file .claude/agent-memory/{agent-name}/MEMORY.md'
  - 'Load COMPLETE file ${CLAUDE_PLUGIN_ROOT}/data/{agent-name}/instructions.md'
  - 'ONLY read/write files in .claude/agent-memory/{agent-name}/'
```
- [ ] Exists with ≥3 actions
- [ ] Loads agent memory, loads plugin instructions, restricts file access
- [ ] No placeholders, no compiler-injected steps

### Path Format (CRITICAL)
- [ ] Agent-writable paths use: `.claude/agent-memory/{agent-name}/...`
- [ ] Plugin data paths use: `${CLAUDE_PLUGIN_ROOT}/data/{agent-name}/...`
- [ ] No `{project-root}/_bmad/_memory/` paths
- [ ] No `./` or `/Users/` paths

### Persona Addition
- [ ] `communication_style` includes memory reference patterns
- [ ] Natural: "Last time you mentioned..." or "I've noticed patterns..."

### Menu Actions
- [ ] Memory references use `.claude/agent-memory/{agent-name}/` path format
- [ ] Update actions are complete

**Reference:** `journal-keeper/`

---

## Compiler-Injected (Skip Validation)
- Frontmatter (`---name/description---`)
- XML activation block
- Menu items: `MH`, `CH`, `PM`, `DA`
- Rules section

---

## Common Fixes

| Issue | Fix |
|-------|-----|
| Behaviors in `communication_style` | Move to `identity` or `principles` |
| `trigger: analyze` | `trigger: AN or fuzzy match on analyze` |
| `description: 'Analyze code'` | `description: '[AC] Analyze code'` |
| `./memories.md` | `.claude/agent-memory/{agent-name}/MEMORY.md` |
| Missing `critical_actions` (hasSidecar: true) | Add load MEMORY.md, load instructions, restrict access |
| No memory references (hasSidecar: true) | Add to `communication_style`: "Last time you mentioned..." |
