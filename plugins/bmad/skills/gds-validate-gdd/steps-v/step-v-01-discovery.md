---
name: 'step-v-01-discovery'
description: 'Document Discovery & Confirmation - Handle fresh-context validation, confirm GDD path, discover input documents'

# File references (ONLY variables used in this step)
nextStepFile: './step-v-02-format-detection.md'
advancedElicitationTask: 'skill:bmad-advanced-elicitation'
partyModeWorkflow: 'skill:bmad-party-mode'
gddPurpose: '../data/gdd-purpose.md'
---

# Step V-1: Document Discovery & Confirmation

## STEP GOAL:

Handle fresh-context validation by confirming the GDD path, discovering and loading input documents from frontmatter, and initializing the validation report.

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
- ✅ We engage in collaborative dialogue, not command-response
- ✅ You bring systematic validation expertise and analytical rigor
- ✅ User brings game design knowledge and specific GDD context

### Step-Specific Rules:

- 🎯 Focus ONLY on discovering the GDD and input documents, not validating yet
- 🚫 FORBIDDEN to perform any validation checks in this step
- 💬 Approach: Systematic discovery with clear reporting to user
- 🚪 This is the setup step - get everything ready for validation

## EXECUTION PROTOCOLS:

- 🎯 Discover and confirm GDD to validate
- 💾 Load GDD and all input documents from frontmatter
- 📖 Initialize validation report next to GDD
- 🚫 FORBIDDEN to load next step until user confirms setup

## CONTEXT BOUNDARIES:

- Available context: GDD path (user-specified or discovered), workflow configuration
- Focus: Document discovery and setup only
- Limits: Don't perform validation, don't skip discovery
- Dependencies: Configuration loaded from GDD workflow.md initialization

## MANDATORY SEQUENCE

**CRITICAL:** Follow this sequence exactly. Do not skip, reorder, or improvise unless user explicitly requests a change.

### 1. Load GDD Purpose and Standards

Load and read the complete file at:
`{gddPurpose}`

This file contains the BMAD GDD philosophy, standards, and validation criteria that will guide all validation checks. Internalize this understanding - it defines what makes a great BMAD GDD.

### 2. Discover GDD to Validate

**If GDD path provided as invocation parameter:**

- Use provided path

**If no GDD path provided, auto-discover:**

- Search `{planning_artifacts}` for files matching `*gdd*.md`
- Prefer the canonical location `{planning_artifacts}/gdd.md`
- Also check for sharded GDDs: `{planning_artifacts}/*gdd*/*.md`

**If exactly ONE GDD found:**

- Use it automatically
- Inform user: "Found GDD: {discovered_path} — using it for validation."

**If MULTIPLE GDDs found:**

- List all discovered GDDs with numbered options
- "I found multiple GDDs. Which one would you like to validate?"
- Wait for user selection

**If NO GDDs found:**

- "I couldn't find any GDD files in {planning_artifacts}. Please provide the path to the GDD file you want to validate."
- Wait for user to provide GDD path.

### 3. Validate GDD Exists and Load

Once GDD path is provided:

- Check if GDD file exists at specified path
- If not found: "I cannot find a GDD at that path. Please check the path and try again."
- If found: Load the complete GDD file including frontmatter

### 4. Extract Frontmatter and Input Documents

From the loaded GDD frontmatter, extract:

- `inputDocuments: []` array (if present)
- Any other relevant metadata (classification.gameType, classification.platforms, date, etc.)

**If no inputDocuments array exists:**
Note this and proceed with GDD-only validation

### 5. Load Input Documents

For each document listed in `inputDocuments`:

- Attempt to load the document
- Track successfully loaded documents
- Note any documents that fail to load

**Build list of loaded input documents:**

- Game Brief (if present) - typically from `gds-create-game-brief`
- Research documents (if present)
- Competitive analysis (if present)
- Other reference materials

### 6. Ask About Additional Reference Documents

"**I've loaded the following documents from your GDD frontmatter:**

{list loaded documents with file names}

**Are there any additional reference documents you'd like me to include in this validation?**

These could include:

- Additional research or context documents
- Competitive analysis or genre references
- Prototype notes or playtest findings
- Art or audio direction documents

Please provide paths to any additional documents, or type 'none' to proceed."

**Load any additional documents provided by user.**

### 7. Initialize Validation Report

Create validation report at: `{validationReportPath}`

**Initialize with frontmatter:**

```yaml
---
validationTarget: '{gdd_path}'
validationDate: '{current_date}'
inputDocuments: [list of all loaded documents]
validationStepsCompleted: []
validationStatus: IN_PROGRESS
---
```

**Initial content:**

```markdown
# GDD Validation Report

**GDD Being Validated:** {gdd_path}
**Validation Date:** {current_date}

## Input Documents

{list all documents loaded for validation}

## Validation Findings

[Findings will be appended as validation progresses]
```

### 8. Present Discovery Summary

"**Setup Complete!**

**GDD to Validate:** {gdd_path}

**Input Documents Loaded:**

- GDD: {gdd_name} ✓
- Game Brief: {count} {if count > 0}✓{else}(none found){/if}
- Research: {count} {if count > 0}✓{else}(none found){/if}
- Additional References: {count} {if count > 0}✓{else}(none){/if}

**Validation Report:** {validationReportPath}

**Ready to begin validation.**"

### 9. Present MENU OPTIONS

Display: **Select an Option:** [A] Advanced Elicitation [P] Party Mode [C] Continue to Format Detection

#### EXECUTION RULES:

- ALWAYS halt and wait for user input after presenting menu
- ONLY proceed to next step when user selects 'C'
- User can ask questions or add more documents - always respond and redisplay menu

#### Menu Handling Logic:

- IF A: Read fully and follow: {advancedElicitationTask}, and when finished redisplay the menu
- IF P: Read fully and follow: {partyModeWorkflow}, and when finished redisplay the menu
- IF C: Read fully and follow: {nextStepFile} to begin format detection
- IF user provides additional document: Load it, update report, redisplay summary
- IF Any other: help user, then redisplay menu

---

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:

- GDD path discovered and confirmed
- GDD file exists and loads successfully
- All input documents from frontmatter loaded
- Additional reference documents (if any) loaded
- Validation report initialized next to GDD
- User clearly informed of setup status
- Menu presented and user input handled correctly

### ❌ SYSTEM FAILURE:

- Proceeding with non-existent GDD file
- Not loading input documents from frontmatter
- Creating validation report in wrong location
- Proceeding without user confirming setup
- Not handling missing input documents gracefully

**Master Rule:** Complete discovery and setup BEFORE validation. This step ensures everything is in place for systematic validation checks.
