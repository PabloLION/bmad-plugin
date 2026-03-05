# Plugin Distribution

How Claude Code plugins are distributed and installed.

## Distribution Mechanism

Plugins are distributed via **Git repositories**, not npm. Each marketplace is a
Git repo containing a `.claude-plugin/marketplace.json` catalog file. Plugins
are cached locally at `~/.claude/plugins/cache/` after installation.

## Adding a Marketplace

```bash
# GitHub shorthand
claude plugin marketplace add owner/repo

# Full Git URL (GitLab, Bitbucket, self-hosted)
claude plugin marketplace add https://gitlab.com/company/plugins.git

# Specific branch or tag
claude plugin marketplace add https://gitlab.com/company/plugins.git#v1.0.0

# Local path
claude plugin marketplace add ./my-marketplace
```

The official Anthropic marketplace (`claude-plugins-official`) is available
automatically — no need to add it.

## Installing Plugins

Two equivalent methods:

### CLI (from terminal)

```bash
# Default scope (user)
claude plugin install plugin-name@marketplace-name

# Project scope (shared via .claude/settings.json)
claude plugin install plugin-name@marketplace-name --scope project

# Local scope (gitignored)
claude plugin install plugin-name@marketplace-name --scope local
```

### Interactive (inside Claude Code REPL)

```text
/plugin install plugin-name@marketplace-name
```

Or use `/plugin` to open the tabbed UI (Discover → Installed → Marketplaces →
Errors).

## Installation Scopes

| Scope     | Settings file                 | Shared? | Use case                    |
|-----------|-------------------------------|---------|-----------------------------|
| `user`    | `~/.claude/settings.json`    | No      | Personal, all projects      |
| `project` | `.claude/settings.json`      | Yes     | Team-wide via VCS           |
| `local`   | `.claude/settings.local.json`| No      | Per-project, gitignored     |
| `managed` | Managed settings             | Yes     | Admin-deployed (read-only)  |

## Submitting to Official Marketplace

Submit via:

- **Claude.ai**: <https://claude.ai/settings/plugins/submit>
- **Console**: <https://platform.claude.com/plugins/submit>

## Other CLI Commands

```bash
claude plugin uninstall plugin-name@marketplace-name
claude plugin enable plugin-name@marketplace-name
claude plugin disable plugin-name@marketplace-name
claude plugin update plugin-name@marketplace-name
```

All accept `--scope` (`user`, `project`, `local`).

## References

- [Discover and install plugins](https://code.claude.com/docs/en/discover-plugins)
- [Plugins reference](https://code.claude.com/docs/en/plugins-reference)
- [Plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)
