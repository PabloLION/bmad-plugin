---
name: bmad-ux-design
description:
  'This skill should be used when the user asks to "create ux design", "design
  ux", "user experience design", or needs to plan UX to inform architecture and
  implementation. Phase 2 Planning workflow.'
user-invocable: true
disable-model-invocation: true
---

# UX Design Workflow

**Goal:** Guidance through realizing the plan for UX to inform architecture and
implementation.

**Agent:** UX Designer (Sally) **Phase:** 2 - Planning

---

## Workflow Architecture

Step-file architecture with 14 steps from discovery through completion.

## Initialization

Check for project config at `bmad/config.yaml`. Requires PRD as input.

## Execution

Read and execute: `./steps/step-01-init.md`
