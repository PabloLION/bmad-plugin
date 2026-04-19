---
name: 'step-v-10-smart-validation'
description: 'SMART Design-Goals Validation - Validate design goals meet SMART quality criteria'

# File references (ONLY variables used in this step)
nextStepFile: './step-v-11-holistic-quality-validation.md'
gddFile: '{gdd_file_path}'
validationReportPath: '{validation_report_path}'
---

# Step V-10: SMART Design-Goals Validation

## STEP GOAL:

Validate that design goals (success metrics, retention hooks, completion targets, win-condition definitions) meet SMART quality criteria (Specific, Measurable, Attainable, Relevant, Traceable), ensuring goals are testable rather than aspirational.

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
- ✅ You bring design-engineering expertise and quality assessment
- ✅ This step runs autonomously - no user input needed

### Step-Specific Rules:

- 🎯 Focus ONLY on design-goal quality using the SMART framework
- 🚫 FORBIDDEN to validate other aspects in this step
- 💬 Approach: Score each design goal on SMART criteria (1-5 scale)
- 🚪 This is a validation sequence step - auto-proceeds when complete

## EXECUTION PROTOCOLS:

- 🎯 Extract all design goals from GDD (Success Metrics, design pillars outcomes, retention hooks, win conditions)
- 🎯 Score each on SMART criteria (Specific, Measurable, Attainable, Relevant, Traceable)
- 💾 Flag goals with score < 3 in any category
- 📖 Append scoring table and suggestions to validation report
- 📖 Display "Proceeding to next check..." and load next step
- 🚫 FORBIDDEN to pause or request user input

## CONTEXT BOUNDARIES:

- Available context: GDD file, validation report
- Focus: Design-goal quality assessment only using SMART framework
- Limits: Don't re-validate mechanics or other aspects, don't pause for user input
- Dependencies: Steps 2-9 completed - comprehensive validation checks done

## MANDATORY SEQUENCE

**CRITICAL:** Follow this sequence exactly. Do not skip, reorder, or improvise unless user explicitly requests a change.

### 1. Extract All Design Goals

From the GDD, extract all design goals:

- Success Metrics entries (Technical Metrics + Gameplay Metrics)
- Retention hooks or engagement targets
- Completion-rate targets
- Win-condition definitions tied to measurable outcomes
- Any explicit design goals from Goals and Context

Identify each goal with a stable handle (DG-001, DG-002, etc. if none exist) and count total.

### 2. Attempt Sub-Process Validation

**Try to use Task tool to spawn a subprocess:**

"Perform SMART validation on these design goals:

{List all design goals}

**For each design goal, score on SMART criteria (1-5 scale):**

**Specific (1-5):**

- 5: Clear, unambiguous target (e.g., 'Act 1 completion rate ≥ 60%')
- 3: Somewhat clear but could be more specific
- 1: Vague or aspirational (e.g., 'players enjoy the game')

**Measurable (1-5):**

- 5: Concrete metric with measurement method (telemetry, playtest, profiler)
- 3: Partially measurable (metric named but method unclear)
- 1: Not measurable, subjective

**Attainable (1-5):**

- 5: Realistic for team, genre, and target platform
- 3: Probably achievable but uncertain
- 1: Unrealistic (e.g., 'retention equal to live-service AAA')

**Relevant (1-5):**

- 5: Clearly ties to a pillar or the core fantasy
- 3: Somewhat relevant but link unclear
- 1: Not relevant, doesn't align with pillars

**Traceable (1-5):**

- 5: Clearly traces to a pillar, player experience goal, or business objective
- 3: Partially traceable
- 1: Orphan goal, no clear source

**For each goal with score < 3 in any category:**

- Provide specific improvement suggestions

Return scoring table with all goal scores and improvement suggestions for low-scoring entries."

**Graceful degradation (if no Task tool):**

- Manually score each design goal on SMART criteria
- Note goals with low scores
- Provide improvement suggestions

### 3. Build Scoring Table

For each design goal:

- Goal handle
- Specific score (1-5)
- Measurable score (1-5)
- Attainable score (1-5)
- Relevant score (1-5)
- Traceable score (1-5)
- Average score
- Flag if any category < 3

**Calculate overall design-goal quality:**

- Percentage of goals with all scores ≥ 3
- Percentage of goals with all scores ≥ 4
- Average score across all goals and categories

### 4. Report SMART Findings to Validation Report

Append to validation report:

```markdown
## SMART Design-Goals Validation

**Total Design Goals:** {count}

### Scoring Summary

**All scores ≥ 3:** {percentage}% ({count}/{total})
**All scores ≥ 4:** {percentage}% ({count}/{total})
**Overall Average Score:** {average}/5.0

### Scoring Table

| Goal # | Specific | Measurable | Attainable | Relevant | Traceable | Average | Flag |
|--------|----------|------------|------------|----------|-----------|---------|------|
| DG-001 | {s1} | {m1} | {a1} | {r1} | {t1} | {avg1} | {X if any <3} |
| DG-002 | {s2} | {m2} | {a2} | {r2} | {t2} | {avg2} | {X if any <3} |
[Continue for all goals]

**Legend:** 1=Poor, 3=Acceptable, 5=Excellent
**Flag:** X = Score < 3 in one or more categories

### Improvement Suggestions

**Low-Scoring Goals:**

**DG-{number}:** {specific suggestion for improvement}
[For each goal with score < 3 in any category]

### Overall Assessment

**Severity:** [Critical if >30% flagged goals, Warning if 10-30%, Pass if <10%]

**Recommendation:**
[If Critical] "Many design goals are aspirational rather than testable. A goal without numbers and a measurement method is a wish. Revise flagged goals using the SMART framework."
[If Warning] "Some design goals would benefit from SMART refinement. Focus on flagged goals above."
[If Pass] "Design goals demonstrate good SMART quality overall."
```

### 5. Display Progress and Auto-Proceed

Display: "**SMART Design-Goals Validation Complete**

Design-Goal Quality: {percentage}% with acceptable scores ({severity})

**Proceeding to next validation check...**"

Without delay, read fully and follow: {nextStepFile} (step-v-11-holistic-quality-validation.md)

---

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:

- All design goals extracted from GDD
- Each goal scored on all 5 SMART criteria (1-5 scale)
- Goals with scores < 3 flagged for improvement
- Improvement suggestions provided for low-scoring goals
- Scoring table built with all scores
- Overall quality assessment calculated
- Findings reported to validation report
- Auto-proceeds to next validation step
- Subprocess attempted with graceful degradation

### ❌ SYSTEM FAILURE:

- Not scoring all design goals on all SMART criteria
- Missing improvement suggestions for low-scoring goals
- Not building scoring table
- Not calculating overall quality metrics
- Not reporting findings to validation report
- Not auto-proceeding

**Master Rule:** Design goals should be testable, not aspirational. The SMART framework provides an objective quality measure for design intent.
