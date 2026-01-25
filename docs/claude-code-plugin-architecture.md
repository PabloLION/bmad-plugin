# Claude Code Plugin Architecture Reference

> Captured from official Claude Code documentation (2026-01)

## 1. Plugin Directory Structure

```text
my-plugin/
├── .claude-plugin/
│   ├── plugin.json          # Required - plugin metadata
│   └── marketplace.json     # Optional - for self-hosted marketplace
├── skills/                  # Optional - SKILL.md files
├── commands/                # Optional - slash command .md files
├── agents/                  # Optional - subagent definitions
├── hooks/                   # Optional - event handlers
├── mcp/                     # Optional - MCP server configs
└── README.md
```

**Important:** Never put `commands/`, `agents/`, or `skills/` inside
`.claude-plugin/` - only `plugin.json` goes there.

---

## 2. Plugin Metadata (plugin.json)

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "What the plugin does",
  "author": "Your Name",
  "license": "MIT"
}
```

---

## 3. Marketplace Configuration (marketplace.json)

For self-hosted marketplaces:

```json
{
  "name": "my-marketplace",
  "owner": {
    "name": "Your Name",
    "email": "email@example.com"
  },
  "plugins": [
    {
      "name": "my-plugin",
      "source": "./plugins/my-plugin",
      "description": "What your plugin does",
      "version": "1.0.0"
    }
  ]
}
```

**Reserved marketplace names** (cannot be used):

- `claude-code-marketplace`, `claude-code-plugins`, `claude-plugins-official`
- `anthropic-marketplace`, `anthropic-plugins`, `agent-skills`, `life-sciences`

---

## 4. Skills vs Subagents

| Aspect                | Skills                        | Subagents                             |
| --------------------- | ----------------------------- | ------------------------------------- |
| **Standard**          | Open (agentskills.io)         | Claude Code specific                  |
| **Context**           | Main conversation (inline)    | Isolated context window               |
| **Purpose**           | Knowledge + workflows         | Specialized assistants/roles          |
| **Invocation**        | User or Claude (configurable) | Claude delegates based on description |
| **Output**            | Integrated into main context  | Results returned to main              |
| **Tools**             | Inherit all available         | Can be restricted                     |
| **Model**             | Uses main model               | Can use different model               |
| **Use for roles**     | No                            | **Yes - ideal**                       |
| **Use for knowledge** | **Yes - ideal**               | Via `skills` field                    |

### When to Use Skills

- Domain knowledge Claude should always have
- Workflows invoked directly with `/skill-name`
- Content that should stay in main context

### When to Use Subagents

- Tasks with verbose output (tests, logs)
- Need tool restrictions for security
- Self-contained work returning a summary
- **Modeling roles/personas** (Business Analyst, PM, etc.)

---

## 5. Skill Format (SKILL.md)

Skills use markdown with YAML frontmatter:

```markdown
---
name: my-skill
description: What this skill does
version: 1.0.0
user-invocable: true
disable-model-invocation: false
allowed-tools:
  - Read
  - Glob
  - Grep
---

# Skill Content

Instructions for Claude when this skill is invoked...
```

### Frontmatter Fields

| Field                      | Required | Description                                  |
| -------------------------- | -------- | -------------------------------------------- |
| `name`                     | Yes      | Skill identifier                             |
| `description`              | Yes      | What skill does (Claude uses for matching)   |
| `version`                  | No       | Semantic version                             |
| `user-invocable`           | No       | Can user invoke with `/name` (default: true) |
| `disable-model-invocation` | No       | Prevent Claude from auto-invoking            |
| `allowed-tools`            | No       | Restrict available tools                     |
| `context`                  | No       | `fork` to run in subagent                    |
| `agent`                    | No       | Which subagent to use with `context: fork`   |

### Skill Types

1. **Knowledge Skills** - Reference material

   ```yaml
   user-invocable: false
   disable-model-invocation: false
   ```

2. **Task Skills** - User-invoked workflows

   ```yaml
   user-invocable: true
   disable-model-invocation: true
   ```

3. **Forked Skills** - Run in subagent

   ```yaml
   context: fork
   agent: Explore
   ```

---

## 6. Subagent Format

Subagents are defined in `agents/` directory:

```markdown
---
name: product-manager
description: Product management specialist for feature planning
tools:
  - Read
  - Grep
  - Glob
model: haiku
skills:
  - domain-knowledge
---

You are a product manager. When analyzing features:

1. Understand user needs and business context
2. Identify requirements and acceptance criteria
3. Consider tradeoffs and priorities

Always ask: Why this feature? Who benefits?
```

### Subagent Fields

| Field         | Description                                  |
| ------------- | -------------------------------------------- |
| `name`        | Agent identifier                             |
| `description` | What agent does (Claude uses for delegation) |
| `tools`       | Allowed tools (restricts access)             |
| `model`       | Model to use (sonnet, haiku, opus)           |
| `skills`      | Skills to preload as context                 |

---

## 7. Commands Format

Commands in `commands/` directory:

```markdown
---
name: my-command
description: What this command does
---

Instructions for Claude when /my-command is invoked...
```

Commands are always user-invoked (`/command-name`).

---

## 8. Plugin Installation & Distribution

### User Installation

```bash
/plugin marketplace add owner/repo
/plugin install plugin-name@marketplace-name
```

### Team Distribution

Add to `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "your-marketplace": {
      "source": {
        "source": "github",
        "repo": "owner/repo"
      }
    }
  }
}
```

### Official Registry

Submit via:
[clau.de/plugin-directory-submission](https://clau.de/plugin-directory-submission)

---

## 9. Special Variables

| Variable                | Description                   |
| ----------------------- | ----------------------------- |
| `${CLAUDE_PLUGIN_ROOT}` | Plugin installation directory |
| `$ARGUMENTS`            | Arguments passed to skill     |

---

## 10. Key Insights for BMAD Plugin

Based on this architecture:

1. **Roles (Business Analyst, PM, Architect, etc.)** → Define as **subagents**
2. **Workflows (product-brief, prd, architecture)** → Define as **skills** (task
   skills)
3. **Methodology knowledge** → Define as **skills** (knowledge skills)
4. **User commands (/init, /status)** → Define as **commands**

This differs from AJ's approach which incorrectly modeled roles as skills.

---

## Sources

- [Claude Code Plugins](https://code.claude.com/docs/en/plugins.md)
- [Plugin Marketplaces](https://code.claude.com/docs/en/plugin-marketplaces.md)
- [Skills](https://code.claude.com/docs/en/skills.md)
- [Sub-agents](https://code.claude.com/docs/en/sub-agents.md)
- [Agent Skills Standard](https://agentskills.io)
