---
name: bmad-quick-dev
description:
  'This skill should be used when the user asks to "quick dev", "implement
  story", "quick flow develop", or needs to implement a story tech spec
  end-to-end. Quick Flow workflow.'
user-invocable: true
disable-model-invocation: true
---

# Quick Dev Workflow

**Goal:** Implement a story tech spec end-to-end (core of Quick Flow).

**Agent:** Barry (Quick Flow Solo Dev) **Phase:** Quick Flow

---

## Workflow Architecture

Step-file architecture with 6 steps including self-check and adversarial review.

## Supporting Data

- `./data/project-levels.yaml`

## Execution

Read and execute: `./steps/step-01-mode-detection.md`
