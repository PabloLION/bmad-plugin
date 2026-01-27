---
name: bmad-help
description:
  This skill should be used when the user asks for "bmad help", "what can bmad
  do", "show bmad commands", "list bmad workflows", or wants to see available
  BMAD options and capabilities.
user-invocable: true
---

# BMAD Method Help

## Quick Start

```bash
/bmad:init      # Initialize BMAD in your project
/bmad:status    # Check workflow status
/bmad:help      # Show this help
```

## Agents

BMAD provides specialized agents for each phase of development:

| Agent          | Name    | Role                                        |
| -------------- | ------- | ------------------------------------------- |
| 📊 Analyst     | Mary    | Business analysis, research, product briefs |
| 📋 PM          | John    | Product requirements, epics, stories        |
| 🎨 UX Designer | Sally   | User experience design                      |
| 🏗️ Architect   | Winston | System architecture                         |
| 🏃 SM          | Bob     | Sprint planning, story preparation          |
| 💻 DEV         | Amelia  | Story implementation                        |
| 🧪 TEA         | Murat   | Test architecture                           |
| 📚 Tech Writer | Paige   | Documentation                               |
| 🚀 Barry       | Barry   | Solo dev quick flow                         |

## Workflows by Phase

### Phase 1: Analysis

| Command                  | Description                          |
| ------------------------ | ------------------------------------ |
| `/bmad:brainstorm`       | Guided brainstorming session         |
| `/bmad:research`         | Market, domain, competitive research |
| `/bmad:product-brief`    | Create executive product brief       |
| `/bmad:document-project` | Document existing project            |

### Phase 2: Planning

| Command                  | Description                          |
| ------------------------ | ------------------------------------ |
| `/bmad:create-prd`       | Create Product Requirements Document |
| `/bmad:validate-prd`     | Validate PRD quality                 |
| `/bmad:edit-prd`         | Update existing PRD                  |
| `/bmad:create-ux-design` | Create UX design specification       |

### Phase 3: Solutioning

| Command                          | Description                              |
| -------------------------------- | ---------------------------------------- |
| `/bmad:create-architecture`      | Create system architecture               |
| `/bmad:epics-stories`            | Break PRD into epics and stories         |
| `/bmad:implementation-readiness` | Validate alignment before implementation |

### Phase 4: Implementation

| Command                 | Description                          |
| ----------------------- | ------------------------------------ |
| `/bmad:sprint-planning` | Generate sprint status tracking      |
| `/bmad:create-story`    | Prepare story with full context      |
| `/bmad:dev-story`       | Implement story tests and code       |
| `/bmad:code-review`     | Comprehensive code review            |
| `/bmad:correct-course`  | Course correction mid-implementation |

### Quick Flow (Solo Dev)

| Command            | Description                 |
| ------------------ | --------------------------- |
| `/bmad:quick-spec` | Lean tech spec with stories |
| `/bmad:quick-dev`  | End-to-end implementation   |

### Test Architecture

| Command                | Description               |
| ---------------------- | ------------------------- |
| `/bmad:test-framework` | Initialize test framework |
| `/bmad:atdd`           | Automated test design     |
| `/bmad:test-design`    | Create test scenarios     |

## Project Levels

| Level | Scope          | Stories | Recommended Flow             |
| ----- | -------------- | ------- | ---------------------------- |
| 0     | Single change  | 1       | quick-spec → quick-dev       |
| 1     | Small feature  | 1-10    | brief → tech-spec → dev      |
| 2     | Medium feature | 5-15    | brief → PRD → arch → sprints |
| 3     | Complex        | 12-40   | Full BMAD flow               |
| 4     | Enterprise     | 40+     | Full BMAD + TEA              |

## More Information

- [BMAD Method Repository](https://github.com/bmadcode/BMAD-METHOD)
- [Documentation](https://bmadcodes.com/bmad-method/)
- [Discord Community](https://discord.gg/gk8jAdXWmj)
