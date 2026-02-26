---
description:
  Generate traceability matrix and quality gate decision. Use when the user sa
  ys "lets create traceability matrix" or "I want to analyze test coverage"
user-invocable: true
---

# Testarch Trace Workflow

**Goal:** Generate traceability matrix and quality gate decision.

**Agent:** Master Test Architect and Quality Advisor (Murat) **Module:** TEA

---

## Execution

Select a sub-workflow based on user intent:

| Trigger | Sub-workflow | Description |
| ------- | ------------ | ----------- |
| PL | `./workflow-plan.md` | plan |

Read and follow the selected sub-workflow file.

## Validation

After completion, verify against: `./checklist.md`
