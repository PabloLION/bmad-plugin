---
name: 'step-v-06-traceability-validation'
description: 'Traceability Validation - Validate the chain from vision → pillars → core loop → mechanics → epics is intact'

# File references (ONLY variables used in this step)
nextStepFile: './step-v-07-implementation-leakage-validation.md'
gddFile: '{gdd_file_path}'
validationReportPath: '{validation_report_path}'
---

# Step V-6: Traceability Validation

## STEP GOAL:

Validate the traceability chain from Vision → Game Pillars → Core Gameplay Loop → Mechanics → Development Epics is intact, ensuring every mechanic and epic traces back to the core fantasy and pillars.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:

- 🛑 NEVER generate content without user input
- 📖 CRITICAL: Read the complete step file before taking any action
- 🔄 CRITICAL: When loading next step with 'C', ensure entire file is read
- 📋 YOU ARE A FACILITATOR, not a content generator
- ✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the config `{communication_language}`
- ✅ YOU MUST ALWAYS WRITE all artifact and document content in `{document_output_language}`

### Role Reinforcement:

- ✅ You are a Validation Architect and Quality Assurance Specialist
- ✅ If you already have been given communication or persona patterns, continue to use those while playing this new role
- ✅ We engage in systematic validation, not collaborative dialogue
- ✅ You bring analytical rigor and traceability-matrix expertise
- ✅ This step runs autonomously - no user input needed

### Step-Specific Rules:

- 🎯 Focus ONLY on traceability chain validation
- 🚫 FORBIDDEN to validate other aspects in this step
- 💬 Approach: Systematic chain validation and orphan detection
- 🚪 This is a validation sequence step - auto-proceeds when complete

## EXECUTION PROTOCOLS:

- 🎯 Build and validate traceability matrix
- 💾 Identify broken chains and orphan mechanics / epics
- 📖 Append findings to validation report
- 📖 Display "Proceeding to next check..." and load next step
- 🚫 FORBIDDEN to pause or request user input

## CONTEXT BOUNDARIES:

- Available context: GDD file, validation report
- Focus: Traceability chain validation only
- Limits: Don't validate other aspects, don't pause for user input
- Dependencies: Steps 2-5 completed - initial validations done

## MANDATORY SEQUENCE

**CRITICAL:** Follow this sequence exactly. Do not skip, reorder, or improvise unless user explicitly requests a change.

### 1. Attempt Sub-Process Validation

**Try to use Task tool to spawn a subprocess:**

"Perform traceability validation on this GDD:

1. Extract content from Executive Summary (core fantasy / vision, USPs)
2. Extract Game Pillars from Core Gameplay
3. Extract Core Gameplay Loop
4. Extract Mechanics from Game Mechanics (and any game-type specific sections)
5. Extract Development Epics
6. Extract Scope (Out of Scope section)

**Validate chains:**

- Vision / Core Fantasy → Pillars: Do pillars embody the core fantasy?
- Pillars → Core Gameplay Loop: Does the loop reinforce the pillars?
- Core Loop → Mechanics: Does each mechanic serve the loop or a pillar?
- Mechanics → Epics: Does each mechanic map to a delivering epic?
- Scope → Mechanics: Do in-scope mechanics align with pillars, and out-of-scope items truly belong out?

**Identify orphans:**

- Mechanics that don't serve any pillar or the core loop
- Pillars without mechanics reinforcing them
- Epics not tied to any mechanic or system
- Loop elements without supporting mechanics

Build traceability matrix and identify broken chains and orphan mechanics/epics.

Return structured findings with chain status and orphan list."

### 2. Graceful Degradation (if Task tool unavailable)

If Task tool unavailable, perform analysis directly:

**Step 1: Extract key elements**

- Executive Summary: Note core fantasy / vision
- Game Pillars: List pillars
- Core Gameplay Loop: Describe the loop's steps
- Mechanics: List all mechanics and systems
- Epics: List all development epics
- Out of Scope: List excluded items

**Step 2: Validate Vision → Pillars**

- Do the pillars express the core fantasy in actionable terms?
- Are pillars specific enough to steer design decisions?
- Note any misalignment

**Step 3: Validate Pillars → Core Loop**

- Does the core gameplay loop actively reinforce the pillars?
- Are pillars visible in the loop's steps?
- Note pillars that don't show up in the loop

**Step 4: Validate Core Loop → Mechanics**

- For each loop step, is there a mechanic that enables it?
- List mechanics that don't map to the loop or a pillar
- Note orphan mechanics (mechanics without design justification)

**Step 5: Validate Mechanics → Epics**

- Does each mechanic have an epic delivering it?
- Are there epics without a clear mechanic payload?
- Note misalignments

**Step 6: Validate Scope → Alignment**

- Do in-scope mechanics align with pillars?
- Are out-of-scope items truly off-pillar, or are they critical mechanics misclassified?
- Note scope incoherence

**Step 7: Build traceability matrix**

- Map each mechanic to its source (pillar or loop step)
- Map each epic to its mechanics
- Note orphan mechanics and orphan epics
- Identify broken chains

### 3. Tally Traceability Issues

**Broken chains:**

- Vision → Pillars misalignment: count
- Pillars → Loop gaps: count
- Loop → Mechanics gaps: count
- Mechanics → Epics gaps: count
- Scope → Mechanics misalignments: count

**Orphan elements:**

- Orphan mechanics (no pillar/loop source): count
- Unsupported pillars (no reinforcing mechanics): count
- Orphan epics (no clear mechanic payload): count
- Loop steps without supporting mechanics: count

**Total issues:** Sum of all broken chains and orphans

### 4. Report Traceability Findings to Validation Report

Append to validation report:

```markdown
## Traceability Validation

### Chain Validation

**Vision → Pillars:** [Intact/Gaps Identified]
{If gaps: List specific misalignments}

**Pillars → Core Gameplay Loop:** [Intact/Gaps Identified]
{If gaps: List pillars without loop reinforcement}

**Core Loop → Mechanics:** [Intact/Gaps Identified]
{If gaps: List loop steps without supporting mechanics}

**Mechanics → Epics:** [Intact/Gaps Identified]
{If gaps: List mechanics without delivering epics}

**Scope → Mechanics Alignment:** [Intact/Misaligned]
{If misaligned: List specific issues}

### Orphan Elements

**Orphan Mechanics (no pillar/loop source):** {count}
{List orphan mechanics}

**Unsupported Pillars:** {count}
{List pillars lacking reinforcing mechanics}

**Orphan Epics:** {count}
{List epics without clear mechanic payload}

**Loop Steps Without Mechanics:** {count}
{List loop steps lacking supporting mechanics}

### Traceability Matrix

{Summary table showing pillar → mechanic → epic coverage}

**Total Traceability Issues:** {total}

**Severity:** [Critical if orphan mechanics or unsupported pillars exist, Warning if gaps, Pass if intact]

**Recommendation:**
[If Critical] "Orphan mechanics or unsupported pillars found - every mechanic must serve a pillar or the core loop, every pillar must be reinforced by mechanics. Fix these before proceeding to architecture."
[If Warning] "Traceability gaps identified - strengthen chains so downstream phases (architecture, epics) can trust the design intent."
[If Pass] "Traceability chain is intact - mechanics serve pillars, epics deliver mechanics, scope reflects the design."
```

### 5. Display Progress and Auto-Proceed

Display: "**Traceability Validation Complete**

Total Issues: {count} ({severity})

**Proceeding to next validation check...**"

Without delay, read fully and follow: {nextStepFile} (step-v-07-implementation-leakage-validation.md)

---

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:

- All traceability chains validated systematically
- Orphan mechanics / epics identified
- Broken chains documented
- Traceability matrix built
- Severity assessed correctly
- Findings reported to validation report
- Auto-proceeds to next validation step
- Subprocess attempted with graceful degradation

### ❌ SYSTEM FAILURE:

- Not validating all traceability chains
- Missing orphan detection
- Not building traceability matrix
- Not reporting findings to validation report
- Not auto-proceeding

**Master Rule:** Every mechanic should trace to a pillar or the core loop. Every epic should deliver a mechanic. Orphan mechanics are scope creep in disguise.
