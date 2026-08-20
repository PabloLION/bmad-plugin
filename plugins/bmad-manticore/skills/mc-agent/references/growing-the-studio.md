# Growing the studio

Load this file when the creator wants a capability Manticore does not have. Scope the new capability with the creator before any file is written.

## The build ladder

1. If the BMB builder skills are available in this harness (bmad-workflow-builder, bmad-agent-builder), use them; they are the canonical factory.
2. If not, suggest installing the BMB module (`npx bmad-method install` and add bmb), and offer to proceed without it meanwhile.
3. Without BMB, follow the skill best practices at https://agentskills.io/skill-creation/best-practices and the house rules: taste in files, mechanics in scripts run via `uv run` with PEP 723 metadata, skills as thin routers, config through the studio config and a `customize.toml`, nothing user-specific inside the skill itself.

## Joining the pipeline

New stage skills that join the pipeline must conform to the mc-pipeline contract (stage table, project.json, gates); route the creator through mc-pipeline's docs for that contract rather than improvising one. A capability that serves other skills without owning a stage (the mc-audio and mc-ograf shape) needs no stage-table entry: no gate, no project.json state, called by name from whatever needs it.

## Check what already exists first

Before building, read the help catalog (`{project-root}/_bmad/_config/bmad-help.csv`): the capability may already be installed from another module, and routing beats rebuilding.
