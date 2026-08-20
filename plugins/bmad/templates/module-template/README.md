# BMad Module Template

[![Python Version](https://img.shields.io/badge/python-%3E%3D3.10-blue?logo=python&logoColor=white)](https://www.python.org)
[![uv](https://img.shields.io/badge/uv-package%20manager-blueviolet?logo=uv)](https://docs.astral.sh/uv/)

A minimal template for creating [BMad Method](https://docs.bmad-method.org/) modules. Fork this repo or use it as a GitHub template to start building your own module.

## Quick Start

1. Click **Use this template** on GitHub (or fork the repo)
2. Rename `skills/my-skill/` to your skill name
3. Edit `skills/my-skill/SKILL.md` with your skill's instructions
4. Update `.claude-plugin/marketplace.json` with your module info
5. Update `LICENSE` with your name and year
6. Replace this README with what your module does

## Structure

```
your-module/
├── .claude-plugin/
│   └── marketplace.json       # Module manifest (required for installation)
├── skills/
│   └── my-skill/              # Rename to your skill name
│       ├── SKILL.md           # Skill instructions
│       ├── prompts/           # Internal capability prompts (optional)
│       ├── scripts/           # Deterministic scripts (optional)
│       └── assets/            # Module registration files (optional)
├── docs/                      # Documentation (optional, GitHub Pages ready)
├── LICENSE
└── README.md
```

## Building with BMad Builder

You don't have to write skills from scratch. The [BMad Builder](https://bmad-builder-docs.bmad-method.org/) provides guided tools for creating production-quality skills:

- **[Agent Builder](https://bmad-builder-docs.bmad-method.org/reference/builder-commands)** — Build agent skills through conversational discovery
- **[Workflow Builder](https://bmad-builder-docs.bmad-method.org/reference/builder-commands)** — Build workflow and utility skills
- **[Module Builder](https://bmad-builder-docs.bmad-method.org/reference/builder-commands)** — Package skills into an installable module with help system registration
- **[Build Your First Module](https://bmad-builder-docs.bmad-method.org/tutorials/build-your-first-module)** — Full walkthrough from idea to distributable module

The Module Builder can scaffold registration files (`module.yaml`, `module-help.csv`, merge scripts) so your module integrates with the BMad help system.

## Adding More Skills

Add skill directories under `skills/` and list them in `marketplace.json`:

```json
"skills": [
  "./skills/my-agent",
  "./skills/my-workflow"
]
```

## Documentation

A `docs/` folder is included for your module's documentation. Publish it with [GitHub Pages](https://docs.github.com/en/pages) or any static site host. For a richer docs site, consider [Starlight](https://starlight.astro.build/) (used by the official BMad modules).

## Installation

Users install your module with:

```bash
npx bmad-method install --custom-content https://github.com/your-org/your-module
```

See [Distribute Your Module](https://bmad-builder-docs.bmad-method.org/how-to/distribute-your-module) for full details on repo structure, the marketplace.json format, and versioning.

## Publishing to the Marketplace

Once your module is stable, you can list it in the [BMad Plugins Marketplace](https://github.com/bmad-code-org/bmad-plugins-marketplace) for broader discovery:

1. Tag a release (e.g., `v1.0.0`)
2. Open a PR to the marketplace repo adding a registry entry to `registry/community/`
3. Your module goes through automated validation and manual review

Review the marketplace [contribution guide](https://github.com/bmad-code-org/bmad-plugins-marketplace/blob/main/CONTRIBUTING.md) and [governance policy](https://github.com/bmad-code-org/bmad-plugins-marketplace/blob/main/GOVERNANCE.md) before submitting.

## Resources

- [BMad Method Documentation](https://docs.bmad-method.org/) — Core framework
- [BMad Builder Documentation](https://bmad-builder-docs.bmad-method.org/) — Build agents, workflows, and modules
- [BMad Plugins Marketplace](https://github.com/bmad-code-org/bmad-plugins-marketplace) — Registry, categories, and submission process

## Community

- [Discord](https://discord.gg/gk8jAdXWmj) — Get help, share ideas, collaborate
- [YouTube](https://youtube.com/@BMadCode) — Tutorials, master class, and more
- [X / Twitter](https://x.com/BMadCode)
- [Website](https://bmadcode.com)

## Support BMad

BMad is free for everyone and always will be. Star this repo, [buy me a coffee](https://buymeacoffee.com/bmad), or email contact@bmadcode.com for corporate sponsorship.

## License

MIT — update `LICENSE` with your own copyright.
