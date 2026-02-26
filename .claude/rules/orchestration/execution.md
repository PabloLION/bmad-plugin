# Execution

Worktree lifecycle, merge workflow, and quality assurance.

## Worktree Lifecycle

### Merge immediately, independently

When an agent completes, merge its worktree branch to main immediately. Do NOT
wait for other agents to finish — each agent's work is independent. Waiting for
unrelated agents wastes time and creates false dependencies.

### Merge and cleanup

After an agent completes an issue:

1. Agent commits in its worktree branch
2. Orchestrator merges worktree branch → main (`git merge --no-ff` for
   traceability)
3. The post-merge git hook automatically checks formatting and runs the project
   test suite. If tests fail, fix before continuing.
4. Orchestrator removes worktree and branch (`git worktree remove`,
   `git branch -d`)
5. Close the beads issue with
   `bd close <id> --reason="<summary>. Commit: <hash>"` — the commit hash is the
   merge commit (or direct commit for non-worktree work). Never close an issue
   before its work is committed and merged.

### Fresh worktree per dispatch

Do NOT reuse worktrees. Each new dispatch gets a fresh worktree from current
main. This avoids sync problems and stale state. Creating a new worktree is
cheap; debugging a stale one is not.

## Overlap Management

If two agents touch the same file:

- Use git worktrees for isolation
- Merge non-overlapping agents first
- Run full test suite after each merge
- Overlapping agents merge last with conflict resolution

## Dispatch Capacity

Safe to run up to 12 parallel agents. More may work but 12 is tested and
efficient.

## Quality Assurance

Worktree isolation and persistent memory are handled by agent frontmatter
settings (see `agent-template.md`). Remaining agent responsibilities:

1. Make atomic commits (one logical change per commit)
2. Run tests and linting before committing
3. Update persistent memory with new discoveries
4. Write tests that verify the change:
   - **Bug fixes**: add tests that reproduce the bug and confirm the fix
   - **New features**: add tests that verify the feature works as specified
   - Investigate if existing tests should have caught the issue — if so, add
     coverage for the gap

## Research vs Code Agents

Some agents produce research reports, not code. Their output goes to
`docs/agents/<agent-name>/research-output/` (tracked, merges with branch). Each
named agent gets its own folder. Do NOT put research output in `.git-ignored/`
inside a worktree — ignored files are not merged and get lost when the worktree
is deleted. Orchestrator reviews research output and discusses with user.

## Post-Dispatch

After all agents complete:

1. Merge branches one by one (non-overlapping first)
2. Run full test suite after each merge
3. Final project test suite run on main
4. Close beads issues
5. `bd sync`
