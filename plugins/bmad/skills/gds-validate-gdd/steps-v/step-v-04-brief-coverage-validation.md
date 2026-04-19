---
name: 'step-v-04-brief-coverage-validation'
description: 'Game Brief Coverage Check - Validate the GDD covers all content from the Game Brief (if used as input)'

# File references (ONLY variables used in this step)
nextStepFile: './step-v-05-measurability-validation.md'
gddFile: '{gdd_file_path}'
gameBrief: '{game_brief_path}'
validationReportPath: '{validation_report_path}'
---

# Step V-4: Game Brief Coverage Validation

## STEP GOAL:

Validate that the GDD covers all content from the Game Brief (if a brief was used as input), mapping brief content to GDD sections and identifying gaps.

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
- ✅ You bring analytical rigor and traceability expertise
- ✅ This step runs autonomously - no user input needed

### Step-Specific Rules:

- 🎯 Focus ONLY on Game Brief coverage (conditional on brief existence)
- 🚫 FORBIDDEN to validate other aspects in this step
- 💬 Approach: Systematic mapping and gap analysis
- 🚪 This is a validation sequence step - auto-proceeds when complete

## EXECUTION PROTOCOLS:

- 🎯 Check if Game Brief exists in input documents
- 💬 If no brief: Skip this check and report "N/A - No Game Brief"
- 🎯 If brief exists: Map brief content to GDD sections
- 💾 Append coverage findings to validation report
- 📖 Display "Proceeding to next check..." and load next step
- 🚫 FORBIDDEN to pause or request user input

## CONTEXT BOUNDARIES:

- Available context: GDD file, input documents from step 1, validation report
- Focus: Game Brief coverage only (conditional)
- Limits: Don't validate other aspects, conditional execution
- Dependencies: Step 1 completed - input documents loaded

## MANDATORY SEQUENCE

**CRITICAL:** Follow this sequence exactly. Do not skip, reorder, or improvise unless user explicitly requests a change.

### 1. Check for Game Brief

Check if a Game Brief was loaded in step 1's inputDocuments. Look for files matching `{planning_artifacts}/*brief*.md` or entries in frontmatter referencing a game brief (typically produced by `gds-create-game-brief`).

**IF no Game Brief found:**
Append to validation report:

```markdown
## Game Brief Coverage

**Status:** N/A - No Game Brief was provided as input
```

Display: "**Game Brief Coverage: Skipped** (No Game Brief provided)

**Proceeding to next validation check...**"

Without delay, read fully and follow: {nextStepFile}

**IF Game Brief exists:** Continue to step 2 below

### 2. Attempt Sub-Process Validation

**Try to use Task tool to spawn a subprocess:**

"Perform Game Brief coverage validation:

1. Load the Game Brief
2. Extract key content:
   - Core fantasy / game vision
   - Target player / audience
   - Core gameplay hook / elevator pitch
   - Target platforms
   - Reference titles and inspirations
   - Key mechanics or systems the brief calls out
   - Design goals / pillars
   - Scope constraints (team size, timeline, engine)
3. For each item, search the GDD for corresponding coverage
4. Classify coverage: Fully Covered / Partially Covered / Not Found / Intentionally Excluded
5. Note any gaps with severity: Critical / Moderate / Informational

Return structured coverage map with classifications."

### 3. Graceful Degradation (if Task tool unavailable)

If Task tool unavailable, perform analysis directly:

**Extract from Game Brief:**

- Core fantasy: What is the player supposed to feel / be?
- Audience: Who is this game for?
- Hook: What's the one-sentence pitch?
- Platforms: Target hardware / storefronts
- References: Reference titles and inspirations
- Mechanics: Key mechanics the brief identified
- Pillars / goals: Design pillars or success criteria
- Scope: Team, timeline, engine, budget constraints

**For each item, search GDD:**

- Scan Executive Summary for core fantasy and hook
- Check Goals and Context for audience and pillars
- Look for references in Art/Audio or inspiration callouts
- Check Core Gameplay / Game Mechanics for called-out mechanics
- Review Technical Specifications for platform and scope constraints
- Check Out of Scope section for explicit exclusions

**Classify coverage:**

- **Fully Covered:** Content present and complete
- **Partially Covered:** Content present but incomplete
- **Not Found:** Content missing from GDD
- **Intentionally Excluded:** Content explicitly noted as out of scope

### 4. Assess Coverage and Severity

**For each gap (Partially Covered or Not Found):**

- Is this Critical? (Core fantasy, primary mechanics, target platform)
- Is this Moderate? (Secondary mechanics, nice-to-have pillars)
- Is this Informational? (Minor references, optional features)

**Note:** Some exclusions may be intentional - the GDD legitimately narrowed scope from the brief. Look for explicit mentions in the Out of Scope section.

### 5. Report Coverage Findings to Validation Report

Append to validation report:

```markdown
## Game Brief Coverage

**Game Brief:** {brief_file_name}

### Coverage Map

**Core Fantasy / Vision:** [Fully/Partially/Not Found/Intentionally Excluded]
[If gap: Note severity and specific missing content]

**Target Audience:** [Fully/Partially/Not Found/Intentionally Excluded]
[If gap: Note severity and specific missing content]

**Core Hook / Elevator Pitch:** [Fully/Partially/Not Found/Intentionally Excluded]
[If gap: Note severity and specific missing content]

**Target Platforms:** [Fully/Partially/Not Found/Intentionally Excluded]
[If gap: Note severity and specific missing content]

**Reference Titles / Inspirations:** [Fully/Partially/Not Found/Intentionally Excluded]
[If gap: Note severity and specific missing content]

**Key Mechanics from Brief:** [Fully/Partially/Not Found/Intentionally Excluded]
[If gap: List specific mechanics with severity]

**Design Pillars / Goals:** [Fully/Partially/Not Found/Intentionally Excluded]
[If gap: Note severity and specific missing content]

**Scope Constraints:** [Fully/Partially/Not Found/Intentionally Excluded]
[If gap: Note severity and specific missing content]

### Coverage Summary

**Overall Coverage:** [percentage or qualitative assessment]
**Critical Gaps:** [count] [list if any]
**Moderate Gaps:** [count] [list if any]
**Informational Gaps:** [count] [list if any]

**Recommendation:**
[If critical gaps exist] "GDD should be revised to cover critical Game Brief content - the brief defined what this project is; the GDD should honor it or explicitly document the deviation."
[If moderate gaps] "Consider addressing moderate gaps or documenting them as intentional scope changes in Out of Scope."
[If minimal gaps] "GDD provides good coverage of Game Brief content."
```

### 6. Display Progress and Auto-Proceed

Display: "**Game Brief Coverage Validation Complete**

Overall Coverage: {assessment}

**Proceeding to next validation check...**"

Without delay, read fully and follow: {nextStepFile} (step-v-05-measurability-validation.md)

---

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:

- Checked for Game Brief existence correctly
- If no brief: Reported "N/A" and skipped gracefully
- If brief exists: Mapped all key brief content to GDD sections
- Coverage classified appropriately (Fully/Partially/Not Found/Intentionally Excluded)
- Severity assessed for gaps (Critical/Moderate/Informational)
- Findings reported to validation report
- Auto-proceeds to next validation step
- Subprocess attempted with graceful degradation

### ❌ SYSTEM FAILURE:

- Not checking for brief existence before attempting validation
- If brief exists: not mapping all key content areas
- Missing coverage classifications
- Not reporting findings to validation report
- Not auto-proceeding

**Master Rule:** Game Brief coverage is conditional - skip if no brief, validate thoroughly if brief exists. Always auto-proceed.
