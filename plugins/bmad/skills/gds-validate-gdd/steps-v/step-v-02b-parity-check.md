---
name: 'step-v-02b-parity-check'
description: 'Document Parity Check - Analyze a non-standard GDD and identify gaps against the canonical gds-create-gdd schema'

# File references (ONLY variables used in this step)
nextStepFile: './step-v-03-density-validation.md'
gddFile: '{gdd_file_path}'
validationReportPath: '{validation_report_path}'
---

# Step V-2B: Document Parity Check

## STEP GOAL:

Analyze a non-standard GDD and identify gaps to achieve canonical gds-create-gdd parity, presenting the user with options for how to proceed.

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
- ✅ You bring BMAD GDD standards expertise and gap analysis
- ✅ User brings game design knowledge and GDD context

### Step-Specific Rules:

- 🎯 Focus ONLY on analyzing gaps and estimating parity effort
- 🚫 FORBIDDEN to perform other validation checks in this step
- 💬 Approach: Systematic gap analysis with clear recommendations
- 🚪 This is an optional branch step - user chooses next action

## EXECUTION PROTOCOLS:

- 🎯 Analyze each canonical GDS core section for gaps
- 💾 Append parity analysis to validation report
- 📖 Present options and await user decision
- 🚫 FORBIDDEN to proceed without user selection

## CONTEXT BOUNDARIES:

- Available context: Non-standard GDD from step 2, validation report in progress
- Focus: Parity analysis only - what's missing, what's needed
- Limits: Don't perform other validation checks, don't auto-proceed
- Dependencies: Step 2 classified GDD as non-standard and user chose parity check

## MANDATORY SEQUENCE

**CRITICAL:** Follow this sequence exactly. Do not skip, reorder, or improvise unless user explicitly requests a change.

### 1. Analyze Each Canonical GDS Core Section

For each of the 7 canonical GDS core sections, analyze:

**Executive Summary:**

- Does the GDD have a core concept / vision?
- Is target audience identified?
- Are USPs (unique selling points) listed?
- Gap: [What's missing or incomplete]

**Goals and Context:**

- Are project goals defined?
- Is background / rationale clear?
- Gap: [What's missing or incomplete]

**Core Gameplay:**

- Are game pillars defined?
- Is the core gameplay loop documented?
- Are win/loss conditions clear?
- Gap: [What's missing or incomplete]

**Game Mechanics:**

- Are primary mechanics listed?
- Are controls and input documented?
- Gap: [What's missing or incomplete]

**Progression and Balance:**

- Is player progression defined?
- Is the difficulty curve described?
- Is the economy / resource system specified?
- Gap: [What's missing or incomplete]

**Technical Specifications:**

- Are performance targets specified?
- Are platform requirements documented?
- Are asset budgets / constraints noted?
- Gap: [What's missing or incomplete]

**Development Epics:**

- Are high-level epics identified?
- Is epic scope clear?
- Gap: [What's missing or incomplete]

### 2. Estimate Effort to Reach Parity

For each missing or incomplete section, estimate:

**Effort Level:**

- Minimal - Section exists but needs minor enhancements
- Moderate - Section missing but content exists elsewhere in GDD
- Significant - Section missing, requires new content creation

**Total Parity Effort:**

- Based on individual section estimates
- Classify overall: Quick / Moderate / Substantial effort

### 3. Report Parity Analysis to Validation Report

Append to validation report:

```markdown
## Parity Analysis (Non-Standard GDD)

### Section-by-Section Gap Analysis

**Executive Summary:**

- Status: [Present/Missing/Incomplete]
- Gap: [specific gap description]
- Effort to Complete: [Minimal/Moderate/Significant]

**Goals and Context:**

- Status: [Present/Missing/Incomplete]
- Gap: [specific gap description]
- Effort to Complete: [Minimal/Moderate/Significant]

**Core Gameplay:**

- Status: [Present/Missing/Incomplete]
- Gap: [specific gap description]
- Effort to Complete: [Minimal/Moderate/Significant]

**Game Mechanics:**

- Status: [Present/Missing/Incomplete]
- Gap: [specific gap description]
- Effort to Complete: [Minimal/Moderate/Significant]

**Progression and Balance:**

- Status: [Present/Missing/Incomplete]
- Gap: [specific gap description]
- Effort to Complete: [Minimal/Moderate/Significant]

**Technical Specifications:**

- Status: [Present/Missing/Incomplete]
- Gap: [specific gap description]
- Effort to Complete: [Minimal/Moderate/Significant]

**Development Epics:**

- Status: [Present/Missing/Incomplete]
- Gap: [specific gap description]
- Effort to Complete: [Minimal/Moderate/Significant]

### Overall Parity Assessment

**Overall Effort to Reach Canonical GDS Schema:** [Quick/Moderate/Substantial]
**Recommendation:** [Brief recommendation based on analysis]
```

### 4. Present Parity Analysis and Options

Display:

"**Parity Analysis Complete**

Your GDD is missing {count} of 7 canonical GDS core sections. The overall effort to reach canonical parity is: **{effort level}**

**Quick Summary:**
[2-3 sentence summary of key gaps]

**Recommendation:**
{recommendation from analysis}

**How would you like to proceed?**"

### 5. Present MENU OPTIONS

**[C] Continue Validation** - Proceed with validation using current structure
**[E] Exit & Review** - Exit validation and review parity report
**[S] Save & Exit** - Save parity report and exit

#### EXECUTION RULES:

- ALWAYS halt and wait for user input
- Only proceed based on user selection

#### Menu Handling Logic:

- IF C (Continue): Display "Proceeding with validation..." then read fully and follow: {nextStepFile}
- IF E (Exit): Display parity summary and exit validation
- IF S (Save): Confirm saved, display summary, exit
- IF Any other: help user respond, then redisplay menu

---

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:

- All 7 canonical GDS sections analyzed for gaps
- Effort estimates provided for each gap
- Overall parity effort assessed correctly
- Parity analysis reported to validation report
- Clear summary presented to user
- User can choose to continue validation, exit, or save report

### ❌ SYSTEM FAILURE:

- Not analyzing all 7 sections systematically
- Missing effort estimates
- Not reporting parity analysis to validation report
- Auto-proceeding without user decision
- Unclear recommendations

**Master Rule:** Parity check informs user of gaps and effort, but user decides whether to proceed with validation or address gaps first.
