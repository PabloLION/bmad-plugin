---
name: 'step-v-12-completeness-validation'
description: 'Completeness Check - Final comprehensive completeness check before report generation'

# File references (ONLY variables used in this step)
nextStepFile: './step-v-13-report-complete.md'
gddFile: '{gdd_file_path}'
gddFrontmatter: '{gdd_frontmatter}'
validationReportPath: '{validation_report_path}'
---

# Step V-12: Completeness Validation

## STEP GOAL:

Final comprehensive completeness check - validate no template variables remain, each section has required content, section-specific completeness is met, and frontmatter is properly populated.

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
- ✅ You bring attention to detail and completeness verification
- ✅ This step runs autonomously - no user input needed

### Step-Specific Rules:

- 🎯 Focus ONLY on completeness verification
- 🚫 FORBIDDEN to validate quality (done in step 11) or other aspects
- 💬 Approach: Systematic checklist-style verification
- 🚪 This is a validation sequence step - auto-proceeds when complete

## EXECUTION PROTOCOLS:

- 🎯 Check template completeness (no variables remaining)
- 🎯 Validate content completeness (each section has required content)
- 🎯 Validate section-specific completeness
- 🎯 Validate frontmatter completeness
- 💾 Append completeness matrix to validation report
- 📖 Display "Proceeding to final step..." and load next step
- 🚫 FORBIDDEN to pause or request user input

## CONTEXT BOUNDARIES:

- Available context: Complete GDD file, frontmatter, validation report
- Focus: Completeness verification only (final gate)
- Limits: Don't assess quality, don't pause for user input
- Dependencies: Steps 1-11 completed - all validation checks done

## MANDATORY SEQUENCE

**CRITICAL:** Follow this sequence exactly. Do not skip, reorder, or improvise unless user explicitly requests a change.

### 1. Attempt Sub-Process Validation

**Try to use Task tool to spawn a subprocess:**

"Perform completeness validation on this GDD - final gate check:

**1. Template Completeness:**

- Scan GDD for any remaining template variables
- Look for: {variable}, {{variable}}, {placeholder}, [placeholder], and any unfilled `{{GAME_TYPE_SPECIFIC_SECTIONS}}` token
- List any found with line numbers

**2. Content Completeness:**

- Executive Summary: Core concept, target audience, USPs present?
- Goals and Context: Goals and background present?
- Core Gameplay: Pillars, core loop, win/loss conditions present?
- Game Mechanics: Primary mechanics and controls present?
- Progression and Balance: Progression, difficulty, economy present?
- Level Design Framework: Level types and progression present?
- Art and Audio Direction: Art style and audio approach present?
- Technical Specifications: Performance targets and platform specs present?
- Development Epics: High-level epics present?
- Success Metrics: Technical and gameplay metrics present?
- Out of Scope: Explicit exclusions present?
- Assumptions and Dependencies: Listed?

For each section: Is required content present? (Yes/No/Partial)

**3. Section-Specific Completeness:**

- Game Pillars: At least 3 distinct pillars?
- Core Gameplay Loop: Each loop step documented?
- Mechanics: Each primary mechanic has concrete values?
- Success Metrics: Each has a target value and measurement method?
- Epics: Each epic has scope and high-level stories?

**4. Frontmatter Completeness:**

- stepsCompleted: Populated?
- classification: Present (gameType, platforms, genreComplexity)?
- inputDocuments: Tracked?
- date: Present?

Return completeness matrix with status for each check."

**Graceful degradation (if no Task tool):**

- Manually scan for template variables
- Manually check each section for required content
- Manually verify frontmatter fields
- Build completeness matrix

### 2. Build Completeness Matrix

**Template Completeness:**

- Template variables found: count
- List if any found (including unfilled `{{GAME_TYPE_SPECIFIC_SECTIONS}}`)

**Content Completeness by Section:**

- Executive Summary: Complete / Incomplete / Missing
- Goals and Context: Complete / Incomplete / Missing
- Core Gameplay: Complete / Incomplete / Missing
- Game Mechanics: Complete / Incomplete / Missing
- Progression and Balance: Complete / Incomplete / Missing
- Level Design Framework: Complete / Incomplete / Missing
- Art and Audio Direction: Complete / Incomplete / Missing
- Technical Specifications: Complete / Incomplete / Missing
- Development Epics: Complete / Incomplete / Missing
- Success Metrics: Complete / Incomplete / Missing
- Out of Scope: Complete / Incomplete / Missing
- Assumptions and Dependencies: Complete / Incomplete / Missing

**Section-Specific Completeness:**

- Pillars: ≥3 distinct pillars / <3 / none
- Core loop: Each step documented / Partial / Missing
- Mechanics: Each has concrete values / Some do / None do
- Success Metrics: All have targets+methods / Some do / None do
- Epics: All have scope+stories / Some do / None do

**Frontmatter Completeness:**

- stepsCompleted: Present / Missing
- classification.gameType: Present / Missing
- classification.platforms: Present / Missing
- classification.genreComplexity: Present / Missing
- inputDocuments: Present / Missing
- date: Present / Missing

**Overall completeness:**

- Sections complete: X/Y
- Critical gaps: [list if any]

### 3. Report Completeness Findings to Validation Report

Append to validation report:

```markdown
## Completeness Validation

### Template Completeness

**Template Variables Found:** {count}
{If count > 0, list variables with line numbers}
{If count = 0, note: No template variables remaining ✓}

### Content Completeness by Section

**Executive Summary:** [Complete/Incomplete/Missing]
{If incomplete or missing, note specific gaps}

**Goals and Context:** [Complete/Incomplete/Missing]
{If incomplete or missing, note specific gaps}

**Core Gameplay:** [Complete/Incomplete/Missing]
{If incomplete or missing, note specific gaps}

**Game Mechanics:** [Complete/Incomplete/Missing]
{If incomplete or missing, note specific gaps}

**Progression and Balance:** [Complete/Incomplete/Missing]
{If incomplete or missing, note specific gaps}

**Level Design Framework:** [Complete/Incomplete/Missing]
{If incomplete or missing, note specific gaps}

**Art and Audio Direction:** [Complete/Incomplete/Missing]
{If incomplete or missing, note specific gaps}

**Technical Specifications:** [Complete/Incomplete/Missing]
{If incomplete or missing, note specific gaps}

**Development Epics:** [Complete/Incomplete/Missing]
{If incomplete or missing, note specific gaps}

**Success Metrics:** [Complete/Incomplete/Missing]
{If incomplete or missing, note specific gaps}

**Out of Scope:** [Complete/Incomplete/Missing]
{If incomplete or missing, note specific gaps}

**Assumptions and Dependencies:** [Complete/Incomplete/Missing]
{If incomplete or missing, note specific gaps}

### Section-Specific Completeness

**Game Pillars:** [≥3 / <3 / none]
{If fewer than 3, note which are weak or missing}

**Core Gameplay Loop:** [All steps documented / Partial / Missing]
{If partial, note missing steps}

**Mechanics Concrete Values:** [All / Some / None] have concrete values
{If Some or None, note which mechanics lack values}

**Success Metrics Target+Method:** [All / Some / None] have both
{If Some or None, note which metrics are incomplete}

**Epics Scope+Stories:** [All / Some / None] have both
{If Some or None, note which epics are incomplete}

### Frontmatter Completeness

**stepsCompleted:** [Present/Missing]
**classification.gameType:** [Present/Missing]
**classification.platforms:** [Present/Missing]
**classification.genreComplexity:** [Present/Missing]
**inputDocuments:** [Present/Missing]
**date:** [Present/Missing]

**Frontmatter Completeness:** {complete_fields}/6

### Completeness Summary

**Overall Completeness:** {percentage}% ({complete_sections}/{total_sections})

**Critical Gaps:** [count] [list if any]
**Minor Gaps:** [count] [list if any]

**Severity:** [Critical if template variables remain or critical sections missing, Warning if minor gaps, Pass if complete]

**Recommendation:**
[If Critical] "GDD has completeness gaps that must be addressed before use. Fix template variables and complete missing sections."
[If Warning] "GDD has minor completeness gaps. Address them for complete documentation."
[If Pass] "GDD is complete with all required sections and content present."
```

### 4. Display Progress and Auto-Proceed

Display: "**Completeness Validation Complete**

Overall Completeness: {percentage}% ({severity})

**Proceeding to final step...**"

Without delay, read fully and follow: {nextStepFile} (step-v-13-report-complete.md)

---

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:

- Scanned for template variables systematically (including unfilled GAME_TYPE_SPECIFIC_SECTIONS)
- Validated each section for required content
- Validated section-specific completeness (pillars, loop, mechanics values, metrics, epics)
- Validated frontmatter completeness
- Completeness matrix built with all checks
- Severity assessed correctly
- Findings reported to validation report
- Auto-proceeds to final step
- Subprocess attempted with graceful degradation

### ❌ SYSTEM FAILURE:

- Not scanning for template variables
- Missing section-specific completeness checks
- Not validating frontmatter
- Not building completeness matrix
- Not reporting findings to validation report
- Not auto-proceeding

**Master Rule:** Final gate to ensure the document is complete before presenting findings. Template variables or critical gaps must be fixed before the GDD is usable downstream.
