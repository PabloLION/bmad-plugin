---
name: 'step-v-02-format-detection'
description: 'Format Detection & Structure Analysis - Classify GDD format and route appropriately'

# File references (ONLY variables used in this step)
nextStepFile: './step-v-03-density-validation.md'
altStepFile: './step-v-02b-parity-check.md'
gddFile: '{gdd_file_path}'
validationReportPath: '{validation_report_path}'
---

# Step V-2: Format Detection & Structure Analysis

## STEP GOAL:

Detect if the GDD follows the canonical gds-create-gdd schema and route appropriately - classify as Canonical GDS / GDS Variant / Non-Standard, with optional parity check for non-standard formats.

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
- ✅ You bring systematic validation expertise and pattern recognition
- ✅ User brings game design knowledge and GDD context

### Step-Specific Rules:

- 🎯 Focus ONLY on detecting format and classifying structure
- 🚫 FORBIDDEN to perform other validation checks in this step
- 💬 Approach: Analytical and systematic, clear reporting of findings
- 🚪 This is a branch step - may route to parity check for non-standard GDDs

## EXECUTION PROTOCOLS:

- 🎯 Analyze GDD structure systematically
- 💾 Append format findings to validation report
- 📖 Route appropriately based on format classification
- 🚫 FORBIDDEN to skip format detection or proceed without classification

## CONTEXT BOUNDARIES:

- Available context: GDD file loaded in step 1, validation report initialized
- Focus: Format detection and classification only
- Limits: Don't perform other validation, don't skip classification
- Dependencies: Step 1 completed - GDD loaded and report initialized

## MANDATORY SEQUENCE

**CRITICAL:** Follow this sequence exactly. Do not skip, reorder, or improvise unless user explicitly requests a change.

### 1. Extract GDD Structure

Load the complete GDD file and extract:

**All Level 2 (##) headers:**

- Scan through entire GDD document
- Extract all `##` section headers
- List them in order

**GDD frontmatter:**

- Extract `classification.gameType` if present
- Extract `classification.platforms` if present
- Extract `classification.genreComplexity` if present
- Note any other relevant metadata

### 2. Check for Canonical GDS Core Sections

Check if the GDD contains the following canonical gds-create-gdd core sections:

1. **Executive Summary** (or variations: ## Executive Summary, ## Overview, ## Core Concept)
2. **Goals and Context** (or: ## Goals, ## Project Goals, ## Context)
3. **Core Gameplay** (or: ## Core Gameplay, ## Gameplay Loop, ## Game Pillars)
4. **Game Mechanics** (or: ## Game Mechanics, ## Mechanics, ## Systems)
5. **Progression and Balance** (or: ## Progression, ## Balance, ## Difficulty)
6. **Technical Specifications** (or: ## Technical Specs, ## Technical Requirements, ## Performance)
7. **Development Epics** (or: ## Epics, ## Epic Structure, ## Development Plan)

**Count matches:**

- How many of these 7 core sections are present?
- Which specific sections are present?
- Which are missing?

### 3. Classify GDD Format

Based on core section count, classify:

**Canonical GDS Schema:**

- 6-7 core sections present
- Follows gds-create-gdd structure closely

**GDS Variant:**

- 4-5 core sections present
- Generally follows canonical patterns but has structural differences
- Missing some sections but recognizable as a BMAD GDS-style GDD

**Non-Standard:**

- Fewer than 4 core sections present
- Does not follow canonical GDS structure
- May be a completely custom format, legacy GDD template, or from another framework/tool

### 4. Report Format Findings to Validation Report

Append to validation report:

```markdown
## Format Detection

**GDD Structure:**
[List all ## Level 2 headers found]

**Canonical GDS Core Sections Present:**

- Executive Summary: [Present/Missing]
- Goals and Context: [Present/Missing]
- Core Gameplay: [Present/Missing]
- Game Mechanics: [Present/Missing]
- Progression and Balance: [Present/Missing]
- Technical Specifications: [Present/Missing]
- Development Epics: [Present/Missing]

**Format Classification:** [Canonical GDS / GDS Variant / Non-Standard]
**Core Sections Present:** [count]/7
```

### 5. Route Based on Format Classification

**IF format is Canonical GDS or GDS Variant:**

Display: "**Format Detected:** {classification}

Proceeding to systematic validation checks..."

Without delay, read fully and follow: {nextStepFile} (step-v-03-density-validation.md)

**IF format is Non-Standard (< 4 core sections):**

Display: "**Format Detected:** Non-Standard GDD

This GDD does not follow the canonical gds-create-gdd structure (only {count}/7 core sections present).

You have options:"

Present MENU OPTIONS below for user selection

### 6. Present MENU OPTIONS (Non-Standard GDDs Only)

**[A] Parity Check** - Analyze gaps and estimate effort to reach canonical GDS parity
**[B] Validate As-Is** - Proceed with validation using current structure
**[C] Exit** - Exit validation and review format findings

#### EXECUTION RULES:

- ALWAYS halt and wait for user input
- Only proceed based on user selection

#### Menu Handling Logic:

- IF A (Parity Check): Read fully and follow: {altStepFile} (step-v-02b-parity-check.md)
- IF B (Validate As-Is): Display "Proceeding with validation..." then read fully and follow: {nextStepFile}
- IF C (Exit): Display format findings summary and exit validation
- IF Any other: help user respond, then redisplay menu

---

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:

- All ## Level 2 headers extracted successfully
- Canonical GDS core sections checked systematically
- Format classified correctly based on section count
- Findings reported to validation report
- Canonical/Variant GDDs proceed directly to next validation step
- Non-Standard GDDs pause and present options to user
- User can choose parity check, validate as-is, or exit

### ❌ SYSTEM FAILURE:

- Not extracting all headers before classification
- Incorrect format classification
- Not reporting findings to validation report
- Not pausing for non-standard GDDs
- Proceeding without user decision for non-standard formats

**Master Rule:** Format detection determines validation path. Non-standard GDDs require user choice before proceeding.
