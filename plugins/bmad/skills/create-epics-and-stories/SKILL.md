---
name: bmad-create-epics-and-stories
description:
  'This skill should be used when the user asks to "create epics", "create
  stories", "write user stories", "epic planning", or needs to break down
  architecture into implementable epics and stories. Phase 3 Solutioning
  workflow.'
user-invocable: true
disable-model-invocation: true
---

# Create Epics and Stories Workflow

**Goal:** Break down architecture into implementable epics with user stories.

**Agent:** Architect (Winston) **Phase:** 3 - Solutioning

---

## Workflow Architecture

Step-file architecture with 4 steps.

## Initialization

Check for project config at `bmad/config.yaml`. Requires PRD, architecture
document, and optionally UX design.

## Execution

Read and execute: `./steps/step-01-validate-prerequisites.md`
