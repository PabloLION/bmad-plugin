---
name: 'step-e-01b-legacy-conversion'
description: 'Legacy GDD Conversion Assessment - Analyze legacy/external GDD and propose conversion strategy'

# File references (ONLY variables used in this step)
nextStepFile: './step-e-02-review.md'
gddFile: '{gdd_file_path}'
gddPurpose: '../data/gdd-purpose.md'
---

# Step E-1B: Legacy GDD Conversion Assessment

## STEP GOAL:

Analyze a legacy or external-tool GDD against the canonical gds-create-gdd schema, identify gaps, propose a conversion strategy, and let the user choose how to proceed.

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
- ✅ You bring BMAD GDD standards expertise and conversion guidance
- ✅ User brings game design knowledge and edit requirements

### Step-Specific Rules:

- 🎯 Focus ONLY on conversion assessment and proposal
- 🚫 FORBIDDEN to perform conversion yet (that comes in the edit step)
- 💬 Approach: Analytical gap analysis with clear recommendations
- 🚪 This is a branch step - user chooses conversion path

## EXECUTION PROTOCOLS:

- 🎯 Analyze legacy GDD against canonical gds-create-gdd schema
- 💾 Identify gaps and estimate conversion effort
- 📖 Present conversion options with effort estimates
- 🚫 FORBIDDEN to proceed without user selection

## CONTEXT BOUNDARIES:

- Available context: Legacy GDD, user's edit requirements, gdd-purpose standards
- Focus: Conversion assessment only (not actual conversion)
- Limits: Don't convert yet, don't validate yet
- Dependencies: Step e-01 detected legacy format and routed here

## MANDATORY SEQUENCE

**CRITICAL:** Follow this sequence exactly. Do not skip, reorder, or improvise unless user explicitly requests a change.

### 1. Attempt Sub-Process Assessment

**Try to use Task tool with sub-agent:**

"Perform legacy GDD conversion assessment:

**Load the GDD and gdd-purpose.md**

**For each canonical gds-create-gdd section, analyze:**

1. Does the GDD have this section? (Executive Summary, Goals and Context, Core Gameplay, Game Mechanics, Progression and Balance, Technical Specifications, Development Epics)
2. If present: Is it complete and well-structured?
3. If missing: What content exists that could migrate to this section?
4. Effort to create/complete: Minimal / Moderate / Significant

**Identify:**

- Core sections present: {count}/7
- Content gaps in each section
- Overall conversion effort: Quick / Moderate / Substantial
- Recommended approach: Full restructuring vs targeted improvements

Return conversion assessment with gap analysis and effort estimate."

**Graceful degradation (if no Task tool):**

- Manually check GDD for each canonical section
- Note what's present and what's missing
- Estimate conversion effort
- Identify best conversion approach

### 2. Build Gap Analysis

**For each canonical gds-create-gdd core section:**

**Executive Summary (core concept, target audience, USPs):**

- Present: [Yes/No/Partial]
- Gap: [what's missing or incomplete]
- Effort to Complete: [Minimal/Moderate/Significant]

**Goals and Context (project goals, background, rationale):**

- Present: [Yes/No/Partial]
- Gap: [what's missing or incomplete]
- Effort to Complete: [Minimal/Moderate/Significant]

**Core Gameplay (pillars, core loop, win/loss conditions):**

- Present: [Yes/No/Partial]
- Gap: [what's missing or incomplete]
- Effort to Complete: [Minimal/Moderate/Significant]

**Game Mechanics (primary mechanics, controls):**

- Present: [Yes/No/Partial]
- Gap: [what's missing or incomplete]
- Effort to Complete: [Minimal/Moderate/Significant]

**Progression and Balance (progression, difficulty curve, economy):**

- Present: [Yes/No/Partial]
- Gap: [what's missing or incomplete]
- Effort to Complete: [Minimal/Moderate/Significant]

**Technical Specifications (performance targets, platform specs):**

- Present: [Yes/No/Partial]
- Gap: [what's missing or incomplete]
- Effort to Complete: [Minimal/Moderate/Significant]

**Development Epics (high-level delivery breakdown):**

- Present: [Yes/No/Partial]
- Gap: [what's missing or incomplete]
- Effort to Complete: [Minimal/Moderate/Significant]

**Overall Assessment:**

- Sections Present: {count}/7
- Total Conversion Effort: [Quick/Moderate/Substantial]
- Recommended: [Full restructuring / Targeted improvements]

### 3. Present Conversion Assessment

Display:

"**Legacy GDD Conversion Assessment**

**Current GDD Structure:**

- Core sections present: {count}/7
  {List which sections are present/missing}

**Gap Analysis:**

{Present gap analysis table showing each section's status and effort}

**Overall Conversion Effort:** {effort level}

**Your Edit Goals:**
{Reiterate user's stated edit requirements}

**Recommendation:**
{Based on effort and user goals, recommend best approach}

**How would you like to proceed?**"

### 4. Present MENU OPTIONS

**[R] Restructure to Canonical GDS Schema** - Full conversion to gds-create-gdd structure, then apply your edits
**[I] Targeted Improvements** - Apply your edits to existing structure without restructuring
**[E] Edit & Restructure** - Do both: convert format AND apply your edits
**[X] Exit** - Review assessment and decide

#### EXECUTION RULES:

- ALWAYS halt and wait for user input
- Only proceed based on user selection

#### Menu Handling Logic:

- IF R (Restructure): Note conversion mode, then load next step
- IF I (Targeted): Note targeted mode, then load next step
- IF E (Edit & Restructure): Note both mode, then load next step
- IF X (Exit): Display summary, exit

### 5. Document Conversion Strategy

Store conversion decision for next step:

- **Conversion mode:** [Full restructuring / Targeted improvements / Both]
- **Edit requirements:** [user's requirements from step e-01]
- **Gap analysis:** [summary of gaps identified]

Display: "**Conversion Strategy Documented**

Mode: {conversion mode}
Edit goals: {summary}

**Proceeding to deep review...**"

Read fully and follow: {nextStepFile} (step-e-02-review.md)

---

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:

- All 7 canonical core sections analyzed for gaps
- Effort estimates provided for each section
- Overall conversion effort assessed correctly
- Clear recommendation provided based on effort and user goals
- User chooses conversion strategy (restructure/targeted/both)
- Conversion strategy documented for next step

### ❌ SYSTEM FAILURE:

- Not analyzing all 7 core sections
- Missing effort estimates
- Not providing clear recommendation
- Auto-proceeding without user selection
- Not documenting conversion strategy

**Master Rule:** Legacy GDDs need conversion assessment so users understand the work involved and can choose the best approach.
