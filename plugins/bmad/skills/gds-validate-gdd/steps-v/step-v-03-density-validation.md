---
name: 'step-v-03-density-validation'
description: 'Information Density Check - Scan for anti-patterns that violate information density principles in the GDD'

# File references (ONLY variables used in this step)
nextStepFile: './step-v-04-brief-coverage-validation.md'
gddFile: '{gdd_file_path}'
validationReportPath: '{validation_report_path}'
---

# Step V-3: Information Density Validation

## STEP GOAL:

Validate the GDD meets BMAD information-density standards by scanning for conversational filler, marketing/pitch-deck language, and redundant expressions that violate conciseness principles.

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
- ✅ You bring analytical rigor and attention to detail
- ✅ This step runs autonomously - no user input needed

### Step-Specific Rules:

- 🎯 Focus ONLY on information density anti-patterns
- 🚫 FORBIDDEN to validate other aspects in this step
- 💬 Approach: Systematic scanning and categorization
- 🚪 This is a validation sequence step - auto-proceeds when complete

## EXECUTION PROTOCOLS:

- 🎯 Scan GDD for density anti-patterns systematically
- 💾 Append density findings to validation report
- 📖 Display "Proceeding to next check..." and load next step
- 🚫 FORBIDDEN to pause or request user input

## CONTEXT BOUNDARIES:

- Available context: GDD file, validation report with format findings
- Focus: Information density validation only
- Limits: Don't validate other aspects, don't pause for user input
- Dependencies: Step 2 completed - format classification done

## MANDATORY SEQUENCE

**CRITICAL:** Follow this sequence exactly. Do not skip, reorder, or improvise unless user explicitly requests a change.

### 1. Attempt Sub-Process Validation

**Try to use Task tool to spawn a subprocess:**

"Perform information density validation on this GDD:

1. Load the GDD file
2. Scan for the following anti-patterns:
   - Conversational filler phrases (examples: 'The player will be able to...', 'It is important to note that...', 'In order to')
   - Marketing / pitch-deck language (examples: 'engaging gameplay', 'immersive experience', 'unique blend', 'revolutionary', 'next-generation')
   - Subjective design claims without values (examples: 'fun', 'satisfying', 'deep', 'rich', 'meaningful' - used without concrete backing)
   - Wordy phrases (examples: 'Due to the fact that', 'In the event of', 'For the purpose of')
   - Redundant phrases (examples: 'Future plans', 'Absolutely essential', 'Past history')
3. Count violations by category with line numbers
4. Classify severity: Critical (>10 violations), Warning (5-10), Pass (<5)

Return structured findings with counts and examples."

### 2. Graceful Degradation (if Task tool unavailable)

If Task tool unavailable, perform analysis directly:

**Scan for conversational filler patterns:**

- "The player will be able to..."
- "It is important to note that..."
- "In order to"
- "For the purpose of"
- "With regard to"
- Count occurrences and note line numbers

**Scan for marketing / pitch-deck language:**

- "engaging gameplay"
- "immersive experience"
- "unique blend of"
- "revolutionary"
- "next-generation"
- "AAA-quality"
- "unlike anything before"
- Count occurrences and note line numbers

**Scan for subjective design claims without backing:**

- "fun", "satisfying", "deep", "rich", "meaningful", "organic", "emergent" - when used as a claim without concrete mechanics/values attached
- Note line numbers (these are WARNINGS, not automatic critical - context matters)

**Scan for wordy phrases:**

- "Due to the fact that" (use "because")
- "In the event of" (use "if")
- "At this point in time" (use "now")
- "In a manner that" (use "how")
- Count occurrences and note line numbers

**Scan for redundant phrases:**

- "Future plans" (just "plans")
- "Past history" (just "history")
- "Absolutely essential" (just "essential")
- "Completely finish" (just "finish")
- Count occurrences and note line numbers

### 3. Classify Severity

**Calculate total violations:**

- Conversational filler count
- Marketing / pitch-deck count
- Subjective claims without backing
- Wordy phrases count
- Redundant phrases count
- Total = sum of all categories

**Determine severity:**

- **Critical:** Total > 10 violations
- **Warning:** Total 5-10 violations
- **Pass:** Total < 5 violations

### 4. Report Density Findings to Validation Report

Append to validation report:

```markdown
## Information Density Validation

**Anti-Pattern Violations:**

**Conversational Filler:** {count} occurrences
[If count > 0, list examples with line numbers]

**Marketing / Pitch-Deck Language:** {count} occurrences
[If count > 0, list examples with line numbers]

**Subjective Claims Without Backing:** {count} occurrences
[If count > 0, list examples with line numbers - note: context-dependent]

**Wordy Phrases:** {count} occurrences
[If count > 0, list examples with line numbers]

**Redundant Phrases:** {count} occurrences
[If count > 0, list examples with line numbers]

**Total Violations:** {total}

**Severity Assessment:** [Critical/Warning/Pass]

**Recommendation:**
[If Critical] "GDD requires significant revision to improve information density. Every sentence should carry design weight - strip marketing language and subjective claims that aren't backed by concrete mechanics."
[If Warning] "GDD would benefit from reducing pitch-deck language and eliminating filler phrases. Favor concrete values over subjective claims."
[If Pass] "GDD demonstrates good information density with minimal violations."
```

### 5. Display Progress and Auto-Proceed

Display: "**Information Density Validation Complete**

Severity: {Critical/Warning/Pass}

**Proceeding to next validation check...**"

Without delay, read fully and follow: {nextStepFile} (step-v-04-brief-coverage-validation.md)

---

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:

- GDD scanned for all anti-pattern categories (including pitch-deck language)
- Violations counted with line numbers
- Severity classified correctly
- Findings reported to validation report
- Auto-proceeds to next validation step
- Subprocess attempted with graceful degradation

### ❌ SYSTEM FAILURE:

- Not scanning all anti-pattern categories
- Missing severity classification
- Not reporting findings to validation report
- Pausing for user input (should auto-proceed)
- Not attempting subprocess architecture

**Master Rule:** Information density validation runs autonomously. Scan, classify, report, auto-proceed. Game design docs are especially prone to pitch-deck bloat - catch it here.
