---
name: bmad-create-architecture
description:
  'This skill should be used when the user asks to "create architecture",
  "design architecture", "system architecture", "technical design", or needs to
  document technical decisions for implementation. Phase 3 Solutioning workflow.'
user-invocable: true
disable-model-invocation: true
---

# Architecture Workflow

**Goal:** Create comprehensive architecture decisions through collaborative
step-by-step discovery.

**Agent:** Architect (Winston) **Phase:** 3 - Solutioning

---

## Workflow Architecture

Step-file architecture with data files for decision support.

## Initialization

Check for project config at `bmad/config.yaml`. Requires PRD as input.

## Supporting Data

- `./data/domain-complexity.csv`
- `./data/project-types.csv`

## Execution

Read and execute: `./steps/step-01-init.md`
