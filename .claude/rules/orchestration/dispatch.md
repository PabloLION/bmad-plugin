# Dispatch

How to size, batch, and dispatch issues to agents.

## Issue Sizing

Each issue should be handleable by one agent. If an issue is too large or spans
multiple domains, break it into smaller issues before dispatching. Each
sub-issue is assigned to one agent. The original issue becomes a parent or is
replaced by the sub-issues.

**Domain split rule**: When pre-dispatch review reveals an issue touches
multiple agent domains (e.g., backend logic + frontend wiring), split it into
one sub-issue per agent domain before dispatching. Do not ask the user which
agent to use — split proactively and set dependencies between the sub-issues.

## Sequential Batching

One agent handles multiple issues sequentially. Group issues by:

- File scope (same files touched)
- Domain (same area of the codebase)
- Dependency (issue B needs context from issue A)

## Batch Dispatch Workflow

Dispatch happens in batches, not all at once. The orchestrator never dispatches
without explicit user approval.

### Readiness

An issue is **ready** when the orchestrator has 95% confidence that the spec is
clear and unambiguous. Otherwise, it is **not ready**.

- Ready issues: proceed to pre-dispatch protocol
- Not-ready issues: label as `needs-design`, discuss with user

For every issue presented, report a **numerical confidence percentage** (0-100%)
that the issue is actionable as-written. Always list every doubt that reduces
confidence, explaining what specifically accounts for the gap to 100%. For
example, at 90% confidence, explain what the missing 10% represents — which
unknowns, ambiguities, or risks reduce confidence. At 100%, state "No doubts
from orchestrator" explicitly. This applies to the confidence table and to each
issue in the pre-dispatch protocol.

### Pre-Dispatch Protocol (per issue)

For **every** issue, before dispatching — even when the orchestrator has zero
doubts. The user may have doubts of their own. Never skip showing an issue.

1. Show the full issue: run `bd show <id>` and print doubts **immediately
   after** that single output. Do NOT batch multiple `bd show` calls — present
   one issue at a time, doubts directly following the output, before moving to
   the next issue. If a doubt references another issue, run `bd show` for that
   related issue inline (right where the doubt is stated). If no doubts, state
   "No doubts from orchestrator" explicitly.
2. Invite the user to raise their own doubts: "Do you have any questions or
   concerns about this issue?" Then wait for the user's explicit go-ahead. Do
   not dispatch until the user gives a clear signal.
3. If user wants changes: update the issue first, then re-present
4. When a doubt is cleared or a design decision is made, update the issue
   description or notes (`bd update <id> --description/--notes`) so the agent
   gets the full context at dispatch time
5. Only dispatch after user says the issue is ready

### Lookahead

Always keep **two issues visible** in the conversation: one for dispatch
decision, one as lookahead. Present them **sequentially** (not batched tool
calls): run `bd show` for the first issue, print its doubts immediately after,
then run `bd show` for the second issue and print its doubts. This preserves the
issue → doubts → issue → doubts flow. After user approves and the issue is
dispatched, immediately present the next issue for approval with a new lookahead
— never leave the user with zero issues to review.

For each issue shown, include: full issue details (`bd show`), all doubts (even
minor ones), and whether it reaches 95% confidence. Raise every doubt you can
identify — if it's negligible, the user will skip it.

### Discussion Priority

The goal is to keep every agent busy. When choosing which issue to discuss next,
apply these rules in order:

1. **Idle agent first**: prefer issues whose corresponding agent has no active
   work — this keeps agents utilized. Cycle through all idle agents before
   revisiting busy ones.
2. **Difficulty ordering** (tiebreaker among idle agents):
   - If fewer than 6 agents are running: discuss easiest issues first (highest
     confidence), so agents get dispatched quickly
   - If 6 or more agents are running: discuss hardest issues first (lowest
     confidence), so complex design work happens while agents are busy
3. **Pace**: move quickly through idle agents. Show the issue, state doubts, get
   approval, dispatch, immediately move to the next idle agent. Do not linger on
   one agent while others sit idle.

### Dispatch Cycle

1. Present confidence table for all pending issues (ready / not ready)
2. Follow pre-dispatch protocol for ready issues (show, doubts, user approval)
3. Launch approved issues to **background** agents (worktree + dispatch)
4. Continue discussing not-ready issues in **foreground**
5. When more issues become ready, repeat from step 2
6. Loop until all dispatched or deferred

### Labels for Readiness

- `needs-design`: issue spec is incomplete, needs user discussion
- Remove label after design is settled and spec is updated
