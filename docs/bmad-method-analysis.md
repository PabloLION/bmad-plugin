# BMAD-METHOD v6 Analysis

> Analysis of official `bmadcode/BMAD-METHOD` repository for plugin development.
>
> **📌 Historical snapshot (early 2026, source pinned to v6.0.0-alpha.23).**
> This is the analysis that drove the plugin's initial design. It is
> intentionally frozen — agent personas, workflow paths, and the
> `.agent.yaml` schema described below have all evolved upstream since.
> For the current state see [README.md](../README.md) and
> [docs/bmad-ecosystem.md](bmad-ecosystem.md). For the design decisions
> that followed from this analysis see
> [docs/project-decisions.md](project-decisions.md) and
> [docs/upstream-sync-design.md](upstream-sync-design.md).

## 1. Repository Structure

```text
BMAD-METHOD/
├── src/
│   ├── core/                  # Core system (BMad Master)
│   │   ├── agents/
│   │   ├── tasks/
│   │   └── workflows/
│   ├── bmm/                   # Main BMAD Method Module
│   │   ├── agents/            # 9 agent personas
│   │   ├── workflows/         # 50+ workflows by phase
│   │   ├── testarch/          # TEA knowledge base
│   │   └── sub-modules/
│   └── utility/
├── docs/                      # Astro/Starlight documentation
└── tools/                     # CLI and tooling
```

---

## 2. Agents (9 Core Personas)

| Agent           | Name    | Icon | Phase            | Role                                            |
| --------------- | ------- | ---- | ---------------- | ----------------------------------------------- |
| **Analyst**     | Mary    | 📊   | 1-Analysis       | Business Analyst, market research, requirements |
| **PM**          | John    | 📋   | 2-Planning       | Product Manager, PRD creation, validation       |
| **UX Designer** | Sally   | 🎨   | 2-Planning       | UX/UI specialist, design guidance               |
| **Architect**   | Winston | 🏗️   | 3-Solutioning    | System architect, technical design              |
| **SM**          | Bob     | 🏃   | 4-Implementation | Scrum Master, sprint planning, stories          |
| **DEV**         | Amelia  | 💻   | 4-Implementation | Senior engineer, story execution                |
| **TEA**         | Murat   | 🧪   | Cross-phase      | Test architect, quality automation              |
| **Tech Writer** | Paige   | 📚   | Cross-phase      | Documentation specialist                        |
| **Barry**       | Barry   | 🚀   | Quick Flow       | Solo dev, lean artifacts                        |

### Agent Structure (from .agent.yaml files)

```yaml
agent:
  metadata:
    id: "_bmad/bmm/agents/[name].md"
    name: PersonName
    title: Agent Title
    icon: emoji
    module: bmm

  persona:
    role: "Specific expertise area"
    identity: "Background and specialization"
    communication_style: "Voice and tone"
    principles: |
      - Principle 1
      - Principle 2

  critical_actions:
    - "Action 1"

  menu:
    - trigger: "XY or fuzzy match"
      exec: "{project-root}/_bmad/.../workflow.md"
      description: "[XY] Command: Description"
```

---

## 3. Workflow Phases

### Phase 1: Analysis

- `brainstorm-project` (BP) → Guided brainstorming
- `research` (RS) → Market/competitive research
- `product-brief` (CB) → Executive brief creation
- `document-project` (DP) → Brownfield documentation

### Phase 2: Planning

- `create-prd` (CP) → Product Requirements Document
- `validate-prd` (VP) → PRD quality check
- `edit-prd` (EP) → PRD modifications
- `create-ux-design` (CU) → UX planning

### Phase 3: Solutioning

- `create-architecture` (CA) → Architecture decisions
- `create-epics-and-stories` (CE) → Break PRD into epics
- `implementation-readiness` (IR) → Validate readiness

### Phase 4: Implementation

- `sprint-planning` (SP) → Sprint status tracking
- `create-story` (CS) → Story preparation
- `dev-story` (DS) → Story implementation
- `code-review` (CR) → Code quality review
- `correct-course` (CC) → Course correction
- `epic-retrospective` (ER) → Review and learnings

### TEA (Test Architecture)

- `test-framework` (TF), `atdd` (AT), `test-automate` (TA)
- `test-design` (TD), `test-trace` (TR), `nfr-assess` (NR)
- `continuous-integration` (CI), `test-review` (RV)

### Quick Flow (Solo Dev)

- `quick-spec` (TS) → Lean tech spec
- `quick-dev` (QD) → End-to-end implementation

---

## 4. Key Design Patterns

### Pattern 1: Progressive Disclosure

Workflows use sequential step files. AI only sees current step.

```text
workflow-name/
├── workflow.md           # Entry point
├── steps/
│   ├── step-01-init.md
│   ├── step-02-something.md
│   └── step-N-final.md
├── templates/
└── data/
```

### Pattern 2: Tri-Modal (Create/Validate/Edit)

Critical workflows support three modes:

- **Create**: Build from scratch
- **Validate**: Quality check anytime
- **Edit**: Update while maintaining compliance

### Pattern 3: State Tracking

Frontmatter tracks progress for multi-session workflows:

```yaml
---
stepsCompleted: [1, 2, 3]
inputDocuments: [file1.md, file2.md]
---
```

### Pattern 4: Facilitative (Not Directive)

Agents guide discovery, not dictate answers. Users are domain experts.

### Pattern 5: Workflow Chaining

```text
brainstorming → research → brief → PRD → UX → architecture → epics → sprints → stories
```

---

## 5. Agent → Workflow Ownership

| Agent               | Workflows Owned                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| Analyst (Mary)      | brainstorm-project, research, product-brief, document-project                                                 |
| PM (John)           | create-prd, validate-prd, edit-prd, create-epics-and-stories, implementation-readiness, correct-course        |
| UX Designer (Sally) | create-ux-design, validate-design                                                                             |
| Architect (Winston) | create-architecture, implementation-readiness                                                                 |
| SM (Bob)            | sprint-planning, create-story, epic-retrospective, correct-course                                             |
| DEV (Amelia)        | dev-story, code-review                                                                                        |
| TEA (Murat)         | test-framework, atdd, test-automate, test-design, test-trace, nfr-assess, continuous-integration, test-review |
| Tech Writer (Paige) | document-project, write-document, update-standards, mermaid-gen, validate-doc                                 |
| Barry               | quick-spec, quick-dev, code-review                                                                            |

---

## 6. Configuration System

```yaml
# {project-root}/_bmad/bmm/config.yaml
project_name: string
user_name: string
user_skill_level: beginner|intermediate|expert
communication_language: English
document_output_language: English
planning_artifacts: {project-root}/planning-artifacts
implementation_artifacts: {project-root}/implementation-artifacts
project_knowledge: {project-root}/docs
```

### Variables

- `{project-root}` — Project root directory
- `{project_name}` — From config
- `{user_name}` — From config
- `{date}` — System datetime
- `{{variable}}` — Step-specific

---

## 7. File Locations (Source of Truth)

### Agents

- `/src/bmm/agents/analyst.agent.yaml`
- `/src/bmm/agents/pm.agent.yaml`
- `/src/bmm/agents/architect.agent.yaml`
- `/src/bmm/agents/dev.agent.yaml`
- `/src/bmm/agents/sm.agent.yaml`
- `/src/bmm/agents/tea.agent.yaml`
- `/src/bmm/agents/ux-designer.agent.yaml`
- `/src/bmm/agents/tech-writer/tech-writer.agent.yaml`
- `/src/bmm/agents/quick-flow-solo-dev.agent.yaml`
- `/src/core/agents/bmad-master.agent.yaml`

### Workflows

- `/src/bmm/workflows/1-analysis/`
- `/src/bmm/workflows/2-plan-workflows/`
- `/src/bmm/workflows/3-solutioning/`
- `/src/bmm/workflows/4-implementation/`
- `/src/bmm/workflows/bmad-quick-flow/`
- `/src/bmm/workflows/testarch/`
- `/src/bmm/workflows/document-project/`

---

## 8. Mapping to Claude Code Plugin

| BMAD Concept                 | Claude Code Component                       |
| ---------------------------- | ------------------------------------------- |
| Agents (Mary, John, etc.)    | **Subagents**                               |
| Workflows (create-prd, etc.) | **Skills** (task type)                      |
| BMad Master                  | **Orchestrator skill** or main plugin logic |
| Config system                | Plugin configuration                        |
| Templates                    | Bundled in plugin                           |
| Menu commands                | **Commands**                                |

### Key Adaptation Needs

1. Convert `.agent.yaml` persona → subagent markdown with frontmatter
2. Convert workflow step files → skill markdown (may need simplification)
3. Map variables to Claude Code's `${CLAUDE_PLUGIN_ROOT}` system
4. Tri-modal workflows → separate skills or parameterized single skill

---

Source: bmadcode/BMAD-METHOD v6.0.0-alpha.23
