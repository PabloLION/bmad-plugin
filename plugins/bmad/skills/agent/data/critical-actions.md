# critical_actions

Numbered steps executing FIRST on agent activation.

---

## Quick Reference

| hasSidecar | critical_actions |
|------------|------------------|
| `true` | **MANDATORY** - load memories, instructions, restrict file access |
| `false` | OPTIONAL - only if activation behavior needed |

---

## Patterns

### hasSidecar: true (MANDATORY)

```yaml
critical_actions:
  - 'Load COMPLETE file .claude/agent-memory/{agent-name}/MEMORY.md'
  - 'Load COMPLETE file ${CLAUDE_PLUGIN_ROOT}/data/{agent-name}/instructions.md'
  - 'ONLY read/write files in .claude/agent-memory/{agent-name}/'
```

### hasSidecar: false (OPTIONAL)

```yaml
critical_actions:
  - 'Show inspirational quote before menu'
  - 'Fetch latest stock prices before displaying menu'
  - 'Review {project-root}/finances/ for most recent data'
```

### hasSidecar: true + extras

```yaml
critical_actions:
  - 'Load COMPLETE file .claude/agent-memory/{agent-name}/MEMORY.md'
  - 'Load COMPLETE file ${CLAUDE_PLUGIN_ROOT}/data/{agent-name}/instructions.md'
  - 'ONLY read/write files in .claude/agent-memory/{agent-name}/'
  - 'Search web for biotech headlines, display before menu'
```

---

## Path Patterns

| Use | Pattern |
|-----|---------|
| Agent memory (writable) | `.claude/agent-memory/{agent-name}/MEMORY.md` |
| Plugin data (read-only) | `${CLAUDE_PLUGIN_ROOT}/data/{agent-name}/instructions.md` |
| Project data | `{project-root}/path/to/file.csv` |
| Output | `{output_folder}/results/` |

---

## Dos & Don'ts

| ✅ DO | ❌ DON'T |
|-------|---------|
| Use `Load COMPLETE file` | Use `Load file` or `Load ./path/file.md` |
| Restrict file access for sidecars | Duplicate compiler functions (persona, menu, greeting) |
| Use for activation-time behavior | Put philosophical guidance (use `principles`) |

---

## Compiler Auto-Adds (Don't Duplicate)

- Load persona
- Load configuration
- Menu system initialization
- Greeting/handshake
