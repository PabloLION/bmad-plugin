# Agent Template

How to define named agents for orchestrated dispatch. Settings in frontmatter
are programmatically enforced — prefer settings over prose rules.

## Template

```markdown
---
name: <agent-name>
description: <domain expertise and when to delegate>
model: sonnet
memory: project
isolation: worktree
background: true
tools: Read, Write, Edit, Glob, Grep, Bash, Task(Explore)
---

You are a <domain> specialist. You work in an isolated worktree and make atomic
commits. Run the project test suite before each commit. Update your MEMORY.md
after completing work. Do NOT push — the orchestrator handles merges.
```

## Required Settings

```csv
Setting,Value,Why
memory,project,Persistent memory at .claude/agent-memory/<name>/MEMORY.md — auto-loaded on each invocation
isolation,worktree,Isolated git worktree per dispatch — prevents file conflicts
background,true,Runs concurrently — orchestrator continues discussing other issues
```

## Recommended Settings

```csv
Setting,Value,Why
model,sonnet,Good balance of speed and capability for code work
tools,explicit list,Restrict to needed tools — prevents unintended side effects
```

## System Prompt Guidelines

The agent body (below frontmatter) becomes the system prompt. Include only
behavior that settings cannot enforce:

- Domain expertise description
- Atomic commit discipline
- Test suite execution before commits
- Memory update after completing
- No pushing (orchestrator merges)

Do NOT repeat in the system prompt what settings already handle:

```csv
Don't write,Setting handles it
"Work in an isolated worktree",isolation: worktree
"Check your persistent memory",memory: project (auto-loads MEMORY.md)
"Run in the background",background: true
```

## File Location

Place agent definitions at `.claude/agents/<name>.md` (project scope). These
are git-tracked and shared with the team.

## Persistence

### Definition

`.claude/agents/<name>.md` — git-tracked, permanent.

### Memory

`.claude/agent-memory/<name>/MEMORY.md` — persists across sessions. First 200
lines auto-loaded on each invocation. The agent builds knowledge over time:
patterns, conventions, architectural decisions.

### Conversation

Starts fresh each invocation. MEMORY.md provides continuity.
