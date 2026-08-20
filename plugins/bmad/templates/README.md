# Plugin templates

Vendored scaffolds. Not skills — nothing here is loaded by Claude Code.

## `module-template/`

[bmad-code-org/bmad-module-template](https://github.com/bmad-code-org/bmad-module-template),
pinned by commit (the repo has no tags and no releases). The starting
point for authoring your own BMad module, kept next to the plugin so
`bmad-module-builder` and `bmad-agent-builder` have a local reference.

`.gitignore` is stored as `dot.gitignore` — a real nested `.gitignore`
would exclude sibling files from this repo's git tree, and marketplace
installs are git clones, so those files would vanish from the shipped
plugin. Rename it when you copy the scaffold out.

**It is deliberately not published as a marketplace plugin.** Its own
`.claude-plugin/marketplace.json` declares `"skills": ["./skills/my-skill"]`
and that directory does not exist in any upstream ref — `skills/` holds a
single empty `.gitkeep`, because an early `.gitignore` line (`.*/skills`)
swallowed the scaffold before it was ever committed. Publishing it would
put a dead entry named `my-module`, described as "TODO: What your module
does in one sentence.", in front of end users.

Authoring a module from here means writing `skills/<name>/SKILL.md` plus
a `skills/module.yaml` yourself; `/bmad:bmad-module-builder` can generate
both.
