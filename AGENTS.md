# Agent Instructions

Project-specific instructions for AI agents working in this repo.

## Available Scripts

Run project scripts via `bun run <name>`, not by invoking files directly.

| Script | Command | Description |
| --- | --- | --- |
| validate | `bun run validate` | Upstream coverage validation (agents, skills, content, naming) |
| sync | `bun run sync` | Sync upstream content to plugin |
| sync:dry | `bun run sync:dry` | Dry-run sync (preview changes) |
| update-readme | `bun run update-readme` | Update README version badge |
