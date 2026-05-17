---
name: 'step-v-05-measurability-validation'
description: 'Measurability Validation - Validate design goals, mechanics, and technical specs are measurable and testable'

# File references (ONLY variables used in this step)
nextStepFile: './step-v-06-traceability-validation.md'
gddFile: '{gdd_file_path}'
validationReportPath: '{validation_report_path}'
---

# Step V-5: Measurability Validation

## STEP GOAL:

Validate that all design goals, mechanics specifications, and technical targets in the GDD are measurable and testable - concrete numbers over subjective claims.

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
- ✅ You bring analytical rigor and game-design engineering expertise
- ✅ This step runs autonomously - no user input needed

### Step-Specific Rules:

- 🎯 Focus ONLY on measurability of design goals, mechanics, and tech specs
- 🚫 FORBIDDEN to validate other aspects in this step
- 💬 Approach: Systematic item-by-item analysis
- 🚪 This is a validation sequence step - auto-proceeds when complete

## EXECUTION PROTOCOLS:

- 🎯 Extract design goals, mechanics, and technical specs from GDD
- 💾 Validate each for concrete numbers and testability
- 📖 Append findings to validation report
- 📖 Display "Proceeding to next check..." and load next step
- 🚫 FORBIDDEN to pause or request user input

## CONTEXT BOUNDARIES:

- Available context: GDD file, validation report
- Focus: Measurability of design goals, mechanics, and tech specs
- Limits: Don't validate other aspects, don't pause for user input
- Dependencies: Steps 2-4 completed - initial validation checks done

## MANDATORY SEQUENCE

**CRITICAL:** Follow this sequence exactly. Do not skip, reorder, or improvise unless user explicitly requests a change.

### 1. Attempt Sub-Process Validation

**Try to use Task tool to spawn a subprocess:**

"Perform measurability validation on this GDD:

**Design Goals / Success Metrics:**

1. Extract all entries from Success Metrics / design goals sections
2. Check each for:
   - Concrete target values (retention %, completion rate, session length, FPS)
   - Measurement method (telemetry, playtest, automated profiler)
   - No subjective terms (fun, satisfying, immersive) without backing values
3. Document violations with line numbers

**Mechanics & Systems:**

1. Extract all mechanics from Core Gameplay and Game Mechanics sections
2. Check each for:
   - Concrete values (damages, timings, costs, ranges, cooldowns)
   - Feel parameters (jump height, coyote time, input buffer frames, etc.) when relevant to genre
   - No subjective adjectives (easy, fun, responsive) without metrics
   - No vague quantifiers (many, several, various)
3. Document violations with line numbers

**Technical Specifications:**

1. Extract all tech specs from Technical Specifications section
2. Check each for:
   - Target FPS / frame-time per platform
   - Memory budget per platform
   - Load time budgets
   - Resolution targets
   - Measurement method (profiler, automation, QA)
3. Document violations with line numbers

Return structured findings with violation counts and examples."

### 2. Graceful Degradation (if Task tool unavailable)

If Task tool unavailable, perform analysis directly:

**Design Goals Analysis:**

Extract all design goals / success metrics and check each for:

**Concrete targets:**

- Does it include a target value? (e.g., "75% completion rate for Act 1", not "players should finish the story")
- Is measurement method noted? (telemetry event, playtest observation, automated test)

**No subjective terms without backing:**

- Scan for: fun, engaging, immersive, satisfying, rewarding (without accompanying metrics)
- Note line numbers

**Mechanics Analysis:**

Extract all mechanics / systems and check each for:

**Concrete values:**

- Does the mechanic include numbers where it should? (damage, speed, cooldown, cost)
- Are feel parameters documented when genre demands (jump arc, coyote time, input buffer, hit windows)?

**No subjective adjectives:**

- Scan for: easy, fast, simple, intuitive, responsive, fluid, tight (without metrics)
- Note line numbers

**No vague quantifiers:**

- Scan for: multiple, several, some, many, few, various, number of
- Note line numbers

**Technical Specifications Analysis:**

Extract all tech specs and check each for:

**Specific metrics:**

- Is there a target FPS per platform?
- Is memory budget quantified per platform?
- Are load times budgeted?
- Is the measurement method or tooling noted?

### 3. Tally Violations

**Design Goal Violations:**

- Missing target values: count
- Missing measurement method: count
- Subjective without backing: count
- Total design-goal violations: sum

**Mechanics Violations:**

- Missing concrete values: count
- Subjective adjectives: count
- Vague quantifiers: count
- Missing feel parameters (where genre demands): count
- Total mechanics violations: sum

**Technical Spec Violations:**

- Missing FPS targets: count
- Missing memory budget: count
- Missing load-time targets: count
- Missing measurement method: count
- Total tech-spec violations: sum

**Total violations:** sum of all three categories

### 4. Report Measurability Findings to Validation Report

Append to validation report:

```markdown
## Measurability Validation

### Design Goals / Success Metrics

**Total Goals Analyzed:** {count}

**Missing Target Values:** {count}
[If violations exist, list examples with line numbers]

**Missing Measurement Methods:** {count}
[If missing, list examples with line numbers]

**Subjective Without Backing:** {count}
[If found, list examples with line numbers]

**Design Goal Violations Total:** {total}

### Mechanics & Systems

**Total Mechanics Analyzed:** {count}

**Missing Concrete Values:** {count}
[If missing, list examples with line numbers]

**Subjective Adjectives:** {count}
[If found, list examples with line numbers]

**Vague Quantifiers:** {count}
[If found, list examples with line numbers]

**Missing Feel Parameters (genre-required):** {count}
[If missing, list examples with line numbers]

**Mechanics Violations Total:** {total}

### Technical Specifications

**Total Specs Analyzed:** {count}

**Missing FPS Targets:** {count}
[If missing, list examples with line numbers]

**Missing Memory Budget:** {count}
[If missing, list examples with line numbers]

**Missing Load-Time Targets:** {count}
[If missing, list examples with line numbers]

**Missing Measurement Methods:** {count}
[If missing, list examples with line numbers]

**Tech Spec Violations Total:** {total}

### Overall Assessment

**Total Items:** {goals + mechanics + specs}
**Total Violations:** {sum of all violation totals}

**Severity:** [Critical if >10 violations, Warning if 5-10, Pass if <5]

**Recommendation:**
[If Critical] "Many design goals, mechanics, and tech specs lack concrete values. A GDD without numbers is a wishlist - revise so each item is testable."
[If Warning] "Some items need refinement for measurability. Focus on violating items above - especially any feel parameters or tech targets without numbers."
[If Pass] "GDD demonstrates good measurability with minimal issues."
```

### 5. Display Progress and Auto-Proceed

Display: "**Measurability Validation Complete**

Total Violations: {count} ({severity})

**Proceeding to next validation check...**"

Without delay, read fully and follow: {nextStepFile} (step-v-06-traceability-validation.md)

---

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:

- All design goals extracted and analyzed for measurability
- All mechanics extracted and analyzed for concrete values
- All tech specs extracted and analyzed for targets
- Violations documented with line numbers
- Severity assessed correctly
- Findings reported to validation report
- Auto-proceeds to next validation step
- Subprocess attempted with graceful degradation

### ❌ SYSTEM FAILURE:

- Not analyzing all three categories (goals, mechanics, tech specs)
- Missing line numbers for violations
- Not reporting findings to validation report
- Not assessing severity
- Not auto-proceeding

**Master Rule:** Design intent needs numbers to become design commitment. Validate every goal, mechanic, and tech spec for measurability, document violations, auto-proceed.
