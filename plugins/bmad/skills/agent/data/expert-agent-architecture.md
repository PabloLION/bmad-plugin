# Expert Agent Architecture

Agents with a sidecar folder for persistent memory, custom workflows, and restricted file access.

---

## When to Use Expert Agents

- Must remember things across sessions
- Personal knowledge base that grows over time
- Domain-specific expertise with restricted file access
- Learning/adapting over time
- Complex multi-step workflows loaded on demand
- User wants multiple instances with separate memories

---

## File Structure

```
{agent-name}/
├── {agent-name}.agent.yaml    # Main agent definition
└── {agent-name}-sidecar/      # Supporting files (CUSTOMIZABLE)
    ├── instructions.md        # Startup protocols (common)
    ├── memories.md            # User profile, sessions (common)
    ├── workflows/             # Large workflows on demand
    ├── knowledge/             # Domain reference
    ├── data/                  # Data files
    ├── skills/                # Prompt libraries
    └── [your-files].md        # Whatever needed
```

**Naming:**
- Agent file: `{agent-name}.agent.yaml`
- Sidecar folder: `{agent-name}-sidecar/`
- Lowercase, hyphenated names

---

## CRITICAL: Memory Path Format

Expert agents use Claude Code's native agent-memory system. There are two path conventions:

| File type | Location | Purpose |
|-----------|----------|---------|
| Agent-writable state | `.claude/agent-memory/{agent-name}/` | `MEMORY.md` and other mutable files |
| Stable plugin data | `${CLAUDE_PLUGIN_ROOT}/data/{agent-name}/` | `instructions.md` and read-only files |

```yaml
# ✅ CORRECT
critical_actions:
  - "Load COMPLETE file .claude/agent-memory/journal-keeper/MEMORY.md"
  - "Load COMPLETE file ${CLAUDE_PLUGIN_ROOT}/data/journal-keeper/instructions.md"
  - "ONLY read/write files in .claude/agent-memory/journal-keeper/"

menu:
  - action: "Update .claude/agent-memory/journal-keeper/MEMORY.md with insights"
```

```yaml
# ❌ WRONG
critical_actions:
  - "Load ./journal-keeper-sidecar/memories.md"
  - "Load /Users/absolute/path/memories.md"
```

---

## Complete YAML Structure

```yaml
agent:
  metadata:
    id: _bmad/agents/{agent-name}/{agent-name}.md
    name: 'Persona Name'
    title: 'Agent Title'
    icon: '🔧'
    module: stand-alone           # or: bmm, cis, bmgd, other

  persona:
    role: |
      First-person primary function (1-2 sentences)
    identity: |
      Background, specializations (2-5 sentences)
    communication_style: |
      How the agent speaks. Include memory reference patterns.
    principles:
      - Core belief or methodology
      - Another guiding principle

  critical_actions:
    - 'Load COMPLETE file .claude/agent-memory/{agent-name}/MEMORY.md'
    - 'Load COMPLETE file ${CLAUDE_PLUGIN_ROOT}/data/{agent-name}/instructions.md'
    - 'ONLY read/write files in .claude/agent-memory/{agent-name}/'

  prompts:
    - id: main-action
      content: |
        <instructions>What this does</instructions>
        <process>1. Step one 2. Step two</process>

  menu:
    - trigger: XX or fuzzy match on command
      action: '#main-action'
      description: '[XX] Command description'

    - trigger: SM or fuzzy match on save
      action: 'Update .claude/agent-memory/{agent-name}/MEMORY.md with insights'
      description: '[SM] Save session'
```

---

## Component Details

### critical_actions (MANDATORY)

Become activation steps when compiled. Always include:

```yaml
critical_actions:
  - 'Load COMPLETE file .claude/agent-memory/{agent-name}/MEMORY.md'
  - 'Load COMPLETE file ${CLAUDE_PLUGIN_ROOT}/data/{agent-name}/instructions.md'
  - 'ONLY read/write files in .claude/agent-memory/{agent-name}/'
```

### Sidecar Files (Customizable)

**Common patterns:**
- `instructions.md` - Startup protocols, domain boundaries
- `memories.md` - User profile, session notes, patterns

**Fully customizable - add what your agent needs:**
- `workflows/` - Large workflows for on-demand loading
- `knowledge/` - Domain reference material
- `data/` - Data files
- `skills/` - Prompt libraries

**Template examples:** `{workflow_path}/templates/expert-agent-template/expert-agent-sidecar/`

### Menu Actions

All action types available, including sidecar updates:

```yaml
# Prompt reference
- trigger: XX or fuzzy match on command
  action: '#prompt-id'
  description: '[XX] Description'

# Inline that updates agent memory
- trigger: SM or fuzzy match on save
  action: 'Update .claude/agent-memory/{agent-name}/MEMORY.md with insights'
  description: '[SM] Save session'
```

### Memory Reference Patterns

Reference past interactions naturally in persona and prompts:

```yaml
communication_style: |
  I reference past naturally: "Last time you mentioned..." or "I've noticed patterns..."
```

---

## Domain Restriction Patterns

```yaml
# Single memory folder (most common)
- 'ONLY read/write files in .claude/agent-memory/{agent-name}/'

# Read-only plugin data + write memory
- 'Load from ${CLAUDE_PLUGIN_ROOT}/data/{agent-name}/knowledge/ but NEVER modify'
- 'Write ONLY to .claude/agent-memory/{agent-name}/MEMORY.md'

# User folder access
- 'ONLY access files in {user-folder}/journals/ - private space'
```

---

## What the Compiler Adds (DO NOT Include)

Compiler handles these automatically:

- Frontmatter (`---name/description---`)
- XML activation block (your critical_actions become numbered steps)
- Menu handlers (workflow, exec logic)
- Auto-injected menu items (MH, CH, PM, DA)
- Rules section

**See:** `agent-compilation.md` for compilation details.

---

## Reference Example

**Folder:** `{workflow_path}/data/reference/expert-examples/journal-keeper/`

**Features:**
- First-person persona with memory reference patterns
- critical_actions loading agent memory and plugin data
- Menu items updating agent memory files
- Correct `.claude/agent-memory/` path format

---

## Validation Checklist

- [ ] Valid YAML syntax
- [ ] All metadata present (id, name, title, icon, module)
- [ ] **Agent-writable paths use: `.claude/agent-memory/{agent-name}/...`**
- [ ] **Plugin data paths use: `${CLAUDE_PLUGIN_ROOT}/data/{agent-name}/...`**
- [ ] Agent name matches actual agent identifier
- [ ] `critical_actions` loads `MEMORY.md` and `instructions.md`
- [ ] `critical_actions` enforces domain restrictions
- [ ] Menu triggers: `XX or fuzzy match on command`
- [ ] Menu descriptions have `[XX]` codes
- [ ] No reserved codes (MH, CH, PM, DA)

---

## Best Practices

1. **critical_actions MANDATORY** - Load sidecar files explicitly
2. **Enforce domain restrictions** - Clear boundaries
3. **Reference past naturally** - Don't dump memory
4. **Design for growth** - Structure for accumulation
5. **Separate concerns** - Memories, instructions, knowledge distinct
6. **Include privacy** - Users trust with personal data
7. **First-person voice** - In all persona elements
