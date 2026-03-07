---
name: 'v-02e-validate-sidecar'
description: 'Validate sidecar structure and append to report'

nextStepFile: './v-03-summary.md'
validationReport: '{bmb_creations_output_folder}/validation-report-{agent-name}.md'
agentValidation: ../data/agent-validation.md
criticalActions: ../data/critical-actions.md
agentFile: '{agent-file-path}'
sidecarFolder: '{agent-sidecar-folder}'
---

# Validate Step 2e: Validate Sidecar

## STEP GOAL

Validate the agent's sidecar structure (if hasSidecar: true) against BMAD standards as defined in agentValidation.md. Append findings to validation report and auto-advance.

## MANDATORY EXECUTION RULES

- 📖 CRITICAL: Read the complete step file before taking any action
- 🔄 CRITICAL: Read validationReport and agentValidation first
- 🔄 CRITICAL: Load the actual agent file to check for sidecar
- 🚫 NO MENU - append findings and auto-advance
- ✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the config `{communication_language}`

### Step-Specific Rules:

- 🎯 Validate sidecar against agentValidation.md rules (for agents with sidecar)
- 📊 Append findings to validation report
- 🚫 FORBIDDEN to present menu

## EXECUTION PROTOCOLS

- 🎯 Load agentValidation.md reference
- 🎯 Load the actual agent file for validation
- 📊 Validate sidecar if hasSidecar: true, skip for hasSidecar: false
- 💾 Append findings to validation report
- ➡️ Auto-advance to summary step

## MANDATORY SEQUENCE

**CRITICAL:** Follow this sequence exactly. Do not skip, reorder, or improvise unless user explicitly requests a change.

### 1. Load References

Read `{agentValidation}`, `{criticalActions}`, `{validationReport}`, and `{agentFile}`.

### 2. Conditional Validation

**IF hasSidecar = true:**
Perform these checks systematically - validate EVERY rule specified in agentValidation.md:

#### A. Agent Memory Folder Validation
- [ ] Agent memory folder path in metadata is `.claude/agent-memory/{agent-name}/`
- [ ] `MEMORY.md` exists at `.claude/agent-memory/{agent-name}/MEMORY.md`
- [ ] Agent name in memory path matches the agent's identifier

#### B. Plugin Data Folder Validation
- [ ] Plugin data folder exists: `${CLAUDE_PLUGIN_ROOT}/data/{agent-name}/`
- [ ] `instructions.md` exists in plugin data folder (recommended)
- [ ] Validate file names follow conventions

#### C. Path Reference Validation
For each memory path reference in agent YAML:
- [ ] Extract path from YAML reference
- [ ] Writable paths use: `.claude/agent-memory/{agent-name}/...`
- [ ] Plugin data paths use: `${CLAUDE_PLUGIN_ROOT}/data/{agent-name}/...`
- [ ] No `{project-root}/_bmad/_memory/` paths remain
- [ ] Validate no broken path references

#### D. Critical Actions Validation (MANDATORY for hasSidecar: true)
- [ ] critical_actions section exists in agent YAML
- [ ] Contains at minimum 3 actions
- [ ] Loads agent memory: `.claude/agent-memory/{agent-name}/MEMORY.md`
- [ ] Loads plugin instructions: `${CLAUDE_PLUGIN_ROOT}/data/{agent-name}/instructions.md`
- [ ] Restricts file access: `ONLY read/write files in .claude/agent-memory/{agent-name}/`
- [ ] No placeholder text in critical_actions
- [ ] No compiler-injected steps

#### E. Memory Structure Completeness
- [ ] All referenced memory files present
- [ ] No orphaned references (files referenced but not present)
- [ ] File structure matches agent requirements

**IF hasSidecar = false:**
- [ ] Mark memory validation as N/A
- [ ] Confirm no memory-folder path in metadata
- [ ] Confirm no `.claude/agent-memory/` references in critical_actions (if present)
- [ ] Confirm no agent memory references in menu handlers

### 3. Append Findings to Report

Append to `{validationReport}`:

```markdown
### Sidecar Validation

**Status:** {✅ PASS / ⚠️ WARNING / ❌ FAIL / N/A}

**hasSidecar:** {true|false}

**Checks:**
- [ ] metadata.memory-folder present (if hasSidecar: true)
- [ ] Agent memory path format correct: `.claude/agent-memory/{agent-name}/...`
- [ ] Plugin data path format correct: `${CLAUDE_PLUGIN_ROOT}/data/{agent-name}/...`
- [ ] MEMORY.md exists at agent memory path (if hasSidecar: true)
- [ ] All referenced files present
- [ ] No broken path references

**Detailed Findings:**

*PASSING (for agents WITH persistent memory):*
{List of passing checks}

*WARNINGS:*
{List of non-blocking issues}

*FAILURES:*
{List of blocking issues that must be fixed}

*N/A (for agents WITHOUT persistent memory):*
N/A - Agent has hasSidecar: false, no memory folder required
```

### 4. Auto-Advance

Load and execute `{nextStepFile}` immediately.

---

**Compiling validation summary...**
