---
name: 'step-e-03-edit'
description: 'Edit & Update - Apply changes to the GDD following the approved change plan'

# File references (ONLY variables used in this step)
nextStepFile: './step-e-04-complete.md'
gddFile: '{gdd_file_path}'
gddPurpose: '../data/gdd-purpose.md'
validationWorkflow: 'skill:gds-validate-gdd'
---

# Step E-3: Edit & Update

## STEP GOAL:

Apply changes to the GDD following the approved change plan from step e-02, including content updates, structure improvements, and format conversion to the canonical gds-create-gdd schema if needed.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:

- 🛑 ALWAYS generate content WITH user input/approval
- 📖 CRITICAL: Read the complete step file before taking any action
- 🔄 CRITICAL: When loading next step with 'C', ensure entire file is read
- 📋 YOU ARE A FACILITATOR, not a content generator
- ✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the config `{communication_language}`
- ✅ YOU MUST ALWAYS WRITE all artifact and document content in `{document_output_language}`

### Role Reinforcement:

- ✅ You are a Validation Architect and GDD Improvement Specialist
- ✅ If you already have been given communication or persona patterns, continue to use those while playing this new role
- ✅ We engage in collaborative dialogue, not command-response
- ✅ You bring analytical expertise and precise editing skills
- ✅ User brings game vision and approval authority

### Step-Specific Rules:

- 🎯 Focus ONLY on implementing approved changes from step e-02
- 🚫 FORBIDDEN to make changes beyond the approved plan
- 💬 Approach: Methodical, section-by-section execution
- 🚪 This is a middle step - user can request adjustments

## EXECUTION PROTOCOLS:

- 🎯 Follow approved change plan systematically
- 💾 Edit GDD content according to plan
- 📖 Update frontmatter as needed
- 🚫 FORBIDDEN to proceed without completion

## CONTEXT BOUNDARIES:

- Available context: GDD file, approved change plan from step e-02, gdd-purpose standards
- Focus: Implementing changes from approved plan only
- Limits: Don't add changes beyond plan, don't validate yet
- Dependencies: Step e-02 completed - plan approved by user

## MANDATORY SEQUENCE

**CRITICAL:** Follow this sequence exactly. Do not skip, reorder, or improvise unless user explicitly requests a change.

### 1. Retrieve Approved Change Plan

From step e-02, retrieve:

- **Approved changes:** Section-by-section list
- **Priority order:** Sequence to apply changes
- **User requirements:** Edit goals from step e-01

Display: "**Starting GDD Edits**

**Change Plan:** {summary}
**Total Changes:** {count}
**Estimated Effort:** {effort level}

**Proceeding with edits section by section...**"

### 2. Attempt Sub-Process Edits (For Complex Changes)

**Try to use Task tool with sub-agent for major sections:**

"Execute GDD edits for {section_name}:

**Context:**

- Section to edit: {section_name}
- Current content: {existing content}
- Changes needed: {specific changes from plan}
- BMAD GDD standards: Load from gdd-purpose.md

**Tasks:**

1. Read current GDD section
2. Apply specified changes
3. Ensure BMAD GDD principles compliance:
   - High information density (no pitch-deck fluff)
   - Measurable mechanics (concrete numbers for timings, damages, costs)
   - Clear traceability to pillars and core loop
   - No engine/implementation leakage (engine details belong in architecture)
   - Proper markdown formatting
4. Return updated section content

Apply changes and return updated section."

**Graceful degradation (if no Task tool):**

- Perform edits directly in current context
- Load GDD section, apply changes, save

### 3. Execute Changes Section-by-Section

**For each section in the approved plan (in priority order):**

**a) Load current section**

- Read the current GDD section content
- Note what exists

**b) Apply changes per plan**

- Additions: Create new sections with proper content (e.g., Out of Scope, Success Metrics)
- Updates: Modify existing content per plan
- Removals: Remove specified content (including engine/implementation detail leakage)
- Restructuring: Reformat content to canonical GDS schema

**c) Update GDD file**

- Apply changes to the GDD
- Save updated GDD
- Verify changes applied correctly

**Display progress after each section:**
"**Section Updated:** {section_name}
Changes: {brief summary}
{More sections remaining...}"

### 4. Handle Restructuring (If Needed)

**If conversion mode is "Full restructuring" or "Both":**

**For restructuring:**

- Reorganize GDD to the canonical gds-create-gdd schema
- Ensure proper `##` Level 2 headers
- Reorder sections logically
- Update GDD frontmatter to match canonical format

**Follow canonical GDS schema section order:**

1. Executive Summary
2. Goals and Context
3. Core Gameplay
4. Game Mechanics
5. Game-Type Specific Sections (if applicable)
6. Progression and Balance
7. Level Design Framework
8. Art and Audio Direction
9. Technical Specifications
10. Development Epics
11. Success Metrics
12. Out of Scope
13. Assumptions and Dependencies

Display: "**GDD Restructured**
Canonical GDS schema applied.
{Sections added/reordered}"

### 5. Update GDD Frontmatter

**Ensure frontmatter is complete and accurate:**

```yaml
---
workflowType: 'gdd'
workflow: 'edit' # or 'create' or 'validate'
classification:
  gameType: '{game_type}'
  platforms: '{platforms}'
  genreComplexity: '{complexity}'
inputDocuments: [list of input documents]
stepsCompleted: ['step-e-01-discovery', 'step-e-02-review', 'step-e-03-edit']
lastEdited: '{current_date}'
editHistory:
  - date: '{current_date}'
    changes: '{summary of changes}'
---
```

**Update frontmatter accordingly.**

### 6. Final Review of Changes

**Load complete updated GDD**

**Verify:**

- All approved changes applied correctly
- GDD structure is sound
- No unintended modifications
- Frontmatter is accurate

**If issues found:**

- Fix them now
- Note corrections made

**If user wants adjustments:**

- Accept feedback and make adjustments
- Re-verify after adjustments

### 7. Confirm Completion

Display:

"**GDD Edits Complete**

**Changes Applied:** {count} sections modified
**GDD Updated:** {gdd_file_path}

**Summary of Changes:**
{Brief bullet list of major changes}

**GDD is ready for:**

- Use in downstream GDS workflows (architecture, epics, production)
- Validation (if not yet validated)

**What would you like to do next?**"

### 8. Present MENU OPTIONS

**[V] Run Validation** - Execute full validation workflow via {validationWorkflow}
**[S] Summary Only** - End with summary of changes (no validation)
**[A] Adjust** - Make additional edits
**[X] Exit** - Exit edit workflow

#### EXECUTION RULES:

- ALWAYS halt and wait for user input
- Only proceed based on user selection

#### Menu Handling Logic:

- IF V (Validate): Display "Starting validation workflow..." then invoke the `gds-validate-gdd` skill
- IF S (Summary): Present edit summary and proceed to {nextStepFile}
- IF A (Adjust): Accept additional requirements, loop back to editing
- IF X (Exit): Display summary and proceed to {nextStepFile}

---

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:

- All approved changes from step e-02 applied correctly
- Changes executed in planned priority order
- Restructuring completed (if needed)
- Frontmatter updated accurately
- Final verification confirms changes
- User can proceed to validation or exit with summary
- Option to run validation seamlessly integrates edit and validate modes

### ❌ SYSTEM FAILURE:

- Making changes beyond approved plan
- Not following priority order
- Missing restructuring (if conversion mode)
- Not updating frontmatter
- No final verification
- Not saving updated GDD

**Master Rule:** Execute the plan exactly as approved. The GDD is now ready for validation or downstream use. Validation integration ensures quality.
