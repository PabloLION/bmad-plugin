---
name: 'step-e-01-discovery'
description: 'Discovery & Understanding - Understand what user wants to edit and detect GDD format'

# File references (ONLY variables used in this step)
altStepFile: './step-e-01b-legacy-conversion.md'
nextStepFile: './step-e-02-review.md'
gddPurpose: '../data/gdd-purpose.md'
advancedElicitationTask: 'skill:bmad-advanced-elicitation'
partyModeWorkflow: 'skill:bmad-party-mode'
---

# Step E-1: Discovery & Understanding

## STEP GOAL:

Understand what the user wants to edit in the GDD, detect GDD format/type, check for validation report guidance, and route appropriately.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:

- 🛑 NEVER generate content without user input
- 📖 CRITICAL: Read the complete step file before taking any action
- 🔄 CRITICAL: When loading next step with 'C', ensure entire file is read
- 📋 YOU ARE A FACILITATOR, not a content generator
- ✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the config `{communication_language}`
- ✅ YOU MUST ALWAYS WRITE all artifact and document content in `{document_output_language}`

### Role Reinforcement:

- ✅ You are a Validation Architect and GDD Improvement Specialist
- ✅ If you already have been given communication or persona patterns, continue to use those while playing this new role
- ✅ We engage in collaborative dialogue, not command-response
- ✅ You bring analytical expertise and game-design improvement guidance
- ✅ User brings game vision, design intent, and edit requirements

### Step-Specific Rules:

- 🎯 Focus ONLY on discovering user intent and GDD format
- 🚫 FORBIDDEN to make any edits yet
- 💬 Approach: Inquisitive and analytical, understanding before acting
- 🚪 This is a branch step - may route to legacy conversion

## EXECUTION PROTOCOLS:

- 🎯 Discover user's edit requirements
- 🎯 Auto-detect validation reports in GDD folder (use as guide)
- 🎯 Load validation report if provided (use as guide)
- 🎯 Detect GDD format (canonical gds-create-gdd schema / legacy or external)
- 🎯 Route appropriately based on format
- 💾 Document discoveries for next step
- 🚫 FORBIDDEN to proceed without understanding requirements

## CONTEXT BOUNDARIES:

- Available context: GDD file to edit, optional validation report, auto-detected validation reports
- Focus: User intent discovery and format detection only
- Limits: Don't edit yet, don't validate yet
- Dependencies: None - this is first edit step

## MANDATORY SEQUENCE

**CRITICAL:** Follow this sequence exactly. Do not skip, reorder, or improvise unless user explicitly requests a change.

### 1. Load GDD Purpose Standards

Load and read the complete file at:
`{gddPurpose}` (data/gdd-purpose.md)

This file defines what makes a great BMAD GDD. Internalize this understanding - it will guide improvement recommendations.

### 2. Discover GDD to Edit

"**GDD Edit Workflow**

Which GDD would you like to edit?

Default location: `{planning_artifacts}/gdd.md`

Provide the path to the GDD file you want to edit, or press Enter to use the default."

**Wait for user to provide GDD path (or accept default).**

### 3. Validate GDD Exists and Load

Once GDD path is provided:

- Check if GDD file exists at specified path
- If not found, also try fuzzy match: `{planning_artifacts}/*gdd*.md`
- If still not found: "I cannot find a GDD at that path. Please check the path and try again."
- If found: Load the complete GDD file including frontmatter

### 4. Check for Existing Validation Report

**Check if validation report exists in the GDD folder:**

```bash
# Look for most recent validation report in the GDD folder
ls -t {gdd_folder_path}/validation-report-*.md 2>/dev/null | head -1
```

**If validation report found:**

Display:
"**📋 Found Validation Report**

I found a validation report from {validation_date} in the GDD folder.

This report contains findings from previous validation checks and can help guide our edits to fix known issues.

**Would you like to:**

- **[U] Use validation report** - Load it to guide and prioritize edits
- **[S] Skip** - Proceed with manual edit discovery"

**Wait for user input.**

**IF U (Use validation report):**

- Load the validation report file
- Extract findings, issues, and improvement suggestions
- Note: "Validation report loaded - will use it to guide prioritized improvements"
- Continue to step 5

**IF S (Skip) or no validation report found:**

- Note: "Proceeding with manual edit discovery"
- Continue to step 5

**If no validation report found:**

- Note: "No validation report found in GDD folder"
- Continue to step 5 without asking user

### 5. Ask About Validation Report (Manual Path)

"**Do you have a validation report to guide edits?**

If you've run the validation workflow on this GDD, I can use that report to guide improvements and prioritize changes.

Validation report path (or type 'none'):"

**Wait for user input.**

**If validation report path provided:**

- Load the validation report
- Extract findings, severity, improvement suggestions
- Note: "Validation report loaded - will use it to guide prioritized improvements"

**If no validation report:**

- Note: "Proceeding with manual edit discovery"
- Continue to step 6

### 6. Discover Edit Requirements

"**What would you like to edit in this GDD?**

Describe the changes you want to make. For example:

- Tighten specific sections (mechanics measurability, vision clarity, etc.)
- Add missing sections or content (e.g., out-of-scope, success metrics)
- Rework the core gameplay loop or pillars
- Adjust progression and balance
- Convert to canonical gds-create-gdd schema (if GDD came from an external tool)
- Remove engine/implementation details that belong in architecture
- General improvements

**Describe your edit goals:**"

**Wait for user to describe their requirements.**

### 7. Detect GDD Format

Analyze the loaded GDD:

**Extract all ## Level 2 headers** from GDD

**Check for canonical gds-create-gdd core sections:**

1. Executive Summary
2. Goals and Context
3. Core Gameplay
4. Game Mechanics
5. Progression and Balance
6. Technical Specifications
7. Development Epics (or Epic Structure)

**Classify format:**

- **Canonical GDS Schema:** 6-7 core sections present, follows gds-create-gdd structure
- **GDS Variant:** 4-5 core sections present, generally follows the pattern with gaps
- **Legacy / External (Non-Standard):** Fewer than 4 core sections, from an external tool or legacy GDD template

### 8. Route Based on Format and Context

**IF validation report provided OR GDD is Canonical/Variant:**

Display: "**Edit Requirements Understood**

**GDD Format:** {classification}
{If validation report: "**Validation Guide:** Yes - will use validation report findings"}
**Edit Goals:** {summary of user's requirements}

**Proceeding to deep review and analysis...**"

Read fully and follow: {nextStepFile} (step-e-02-review.md)

**IF GDD is Legacy (Non-Standard) AND no validation report:**

Display: "**Format Detected:** Legacy / External GDD

This GDD does not follow the canonical gds-create-gdd structure (only {count}/7 core sections present).

**Your edit goals:** {user's requirements}

**How would you like to proceed?**"

Present MENU OPTIONS below for user selection

### 9. Present MENU OPTIONS (Legacy GDDs Only)

**[C] Convert to Canonical GDS Schema** - Convert GDD to gds-create-gdd structure, then apply your edits
**[E] Edit As-Is** - Apply your edits without converting the format
**[X] Exit** - Exit and review conversion options

#### EXECUTION RULES:

- ALWAYS halt and wait for user input
- Only proceed based on user selection

#### Menu Handling Logic:

- IF C (Convert): Read fully and follow: {altStepFile} (step-e-01b-legacy-conversion.md)
- IF E (Edit As-Is): Display "Proceeding with edits..." then read fully and follow: {nextStepFile}
- IF X (Exit): Display summary and exit
- IF Any other: help user, then redisplay menu

---

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:

- User's edit requirements clearly understood
- Auto-detected validation reports loaded and analyzed (when found)
- Manual validation report loaded and analyzed (if provided)
- GDD format detected correctly against canonical gds-create-gdd schema
- Canonical/Variant GDDs proceed directly to review step
- Legacy/external GDDs pause and present conversion options
- User can choose conversion path or edit as-is

### ❌ SYSTEM FAILURE:

- Not discovering user's edit requirements
- Not auto-detecting validation reports in GDD folder
- Not loading validation report when provided (auto or manual)
- Missing format detection
- Not pausing for legacy GDDs without guidance
- Auto-proceeding without understanding intent

**Master Rule:** Understand before editing. Detect format early so we can guide users appropriately. Auto-detect and use validation reports for prioritized improvements.
