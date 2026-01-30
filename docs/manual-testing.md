# Manual Testing Guideline

Manual tests cover what automated E2E tests cannot — primarily plugin loading behavior in a real Claude Code session.

## Setup

```sh
cd "$(mktemp -d)" && claude --plugin-dir /absolute/path/to/bmad-plugin/plugins/bmad
```

## What to Test Manually

### Skill registration

Type `/bmad-` and verify autocomplete appears. Focus on representative cases:

- **A core skill** (e.g., `/bmad-dev`) — confirms core upstream sync works
- **A TEA skill** (e.g., `/bmad-teach-me-testing`) — confirms external module sync works
- **A skill that exists in both upstreams** (e.g., `/bmad-automate`) — confirms ownership resolution

If these appear, the rest will too since they use the same registration mechanism.

### Skill execution

Run `/bmad-teach-me-testing` and verify it reads its `instructions.md` and presents the workflow intro. Expected: agent asks what testing topic you want to learn about.

Run `/bmad-atdd` and verify it reads its step files. Expected: agent begins the ATDD workflow and asks about the project context.

### What NOT to test manually

- Exhaustive skill listing (covered by E2E tests)
- File content correctness (covered by `bun run validate`)
- Upstream sync integrity (covered by validation checks)
