---
name: 'step-v-09-game-type-validation'
description: 'Game-Type Compliance Validation - Validate the GDD game-type field matches content and genre-specific sections are present'

# File references (ONLY variables used in this step)
nextStepFile: './step-v-10-smart-validation.md'
gddFile: '{gdd_file_path}'
gddFrontmatter: '{gdd_frontmatter}'
validationReportPath: '{validation_report_path}'
gameTypesData: '{module_root}/workflows/2-design/gds-create-gdd/game-types.csv'
---

# Step V-9: Game-Type Compliance Validation

## STEP GOAL:

Validate that the GDD's declared game-type matches its actual content, and that any game-type-specific sections expected by the gds-create-gdd schema are present.

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
- ✅ You bring game-type expertise and schema knowledge
- ✅ This step runs autonomously - no user input needed

### Step-Specific Rules:

- 🎯 Focus ONLY on game-type compliance
- 🚫 FORBIDDEN to validate other aspects in this step
- 💬 Approach: Validate declared game-type matches content, required game-type sections present
- 🚪 This is a validation sequence step - auto-proceeds when complete

## EXECUTION PROTOCOLS:

- 🎯 Check classification.gameType from GDD frontmatter
- 🎯 Validate declared game-type is a known id in game-types.csv
- 🎯 Validate that actual GDD content matches the declared game-type (cross-check against CSV signals)
- 🎯 Validate game-type-specific sections are present
- 💾 Append compliance findings to validation report
- 📖 Display "Proceeding to next check..." and load next step
- 🚫 FORBIDDEN to pause or request user input

## CONTEXT BOUNDARIES:

- Available context: GDD file with frontmatter classification, validation report
- Focus: Game-type compliance only
- Limits: Don't validate other aspects, don't pause for user input
- Dependencies: Steps 2-8 completed - genre and requirements validation done

## MANDATORY SEQUENCE

**CRITICAL:** Follow this sequence exactly. Do not skip, reorder, or improvise unless user explicitly requests a change.

### 1. Load Game Types Data

Load and read the complete file at:
`{gameTypesData}` ({module_root}/workflows/2-design/gds-create-gdd/game-types.csv)

This CSV is the canonical game-type taxonomy used by `gds-create-gdd`. It contains:

- `id` - the canonical game-type identifier (e.g., `rpg`, `action-platformer`, `roguelike`)
- `name` - human-readable name
- `description` - one-line description
- `genre_tags` - comma-separated genre tags / signals
- `fragment_file` - the game-type-specific section fragment that gds-create-gdd injects

Internalize this data - it drives what counts as a valid game-type and what content signals map to each type.

### 2. Extract Game-Type Classification

From GDD frontmatter, extract:

- `classification.gameType` - what game-type is declared?

**Common game types (from game-types.csv):**
action-platformer, rpg, puzzle, strategy, shooter, adventure, simulation, roguelike, moba, fighting, racing, sports, survival, horror, idle-incremental, card-game, tower-defense, metroidvania, visual-novel, rhythm, turn-based-tactics, sandbox, text-based, party-game

**If no gameType classification found:**
Note "Unclassified" and proceed to infer from content in the next step.

### 3. Validate Declared Game-Type Is Known

**Check:**

- Is the declared gameType an `id` in game-types.csv? (Yes/No)
- If not, is it a recognizable alias for a known id? (e.g., "fps" → shooter)

**If unknown game-type:**
Flag as "Unknown game-type" - GDD should use a canonical id from game-types.csv, or propose an extension.

### 4. Cross-Check Declared Game-Type Against Content

**For the declared game-type:**

- Load its `genre_tags` from game-types.csv
- Scan the GDD for these tags / signals
- Measure match strength: Strong / Moderate / Weak / None

**Also scan for signals from OTHER game-types:**

- Which other game-types' signals appear in the GDD?
- If another game-type shows stronger signals than the declared one, flag a mismatch

### 5. Validate Game-Type-Specific Sections

**Based on the declared game-type, check for the expected game-type-specific content:**

The gds-create-gdd schema injects `{{GAME_TYPE_SPECIFIC_SECTIONS}}` based on the selected game-type. Each fragment (named per game-types.csv `fragment_file`) contributes a specific block. Verify the GDD contains content appropriate to that fragment:

- **action-platformer:** Movement feel values, combat specifics
- **rpg:** Stat system details, leveling/progression curve, inventory rules
- **puzzle:** Solution-space rules, hint system, difficulty ramp
- **strategy:** Unit taxonomy, economy tempo, AI design
- **shooter:** Weapon feel table, netcode model (if multiplayer), hitreg model
- **adventure:** Narrative structure, puzzle fairness, pacing
- **simulation:** Systems map, balance for long sessions
- **roguelike:** Run structure, meta-progression rules, seed determinism
- **moba:** Hero kit matrix, map/lane pacing, matchmaking
- **fighting:** Frame data tables, netcode, input spec
- **racing:** Vehicle handling, track design, AI driver
- **sports:** Rule modeling, physics spec, career mode
- **survival:** Resource economy, crafting tree, threat pacing
- **horror:** Atmosphere design, scare pacing, resource scarcity
- **idle-incremental:** Progression pacing, prestige model
- **card-game:** Card-pool balance, economy, draw rules
- **tower-defense:** Wave pacing, tower taxonomy, economy per wave
- **metroidvania:** Gating graph, map design, upgrade pacing
- **visual-novel:** Branching structure, flag system, save model
- **rhythm:** Timing windows, latency calibration, chart pipeline
- **turn-based-tactics:** Grid rules, action economy, enemy AI
- **sandbox:** Creative tools, performance at scale, UGC pipeline
- **text-based:** Parser vs choice, world state, save model
- **party-game:** Minigame roster, local MP model, round pacing

### 6. Attempt Sub-Process Validation

"Perform game-type compliance validation for {gameType}:

**Validate declared game-type is known:**

- Present in game-types.csv? {yes/no}

**Cross-check declared game-type against content signals:**

- Content signals match declared type: {Strong/Moderate/Weak/None}
- Signals from other game-types detected: {list}
- Mismatch detected: {yes/no}

**Check that required game-type-specific sections are present:**
{List required sections for this game-type}
For each: Is it present in GDD? Is it adequately documented?

Build compliance table showing:

- Declared game-type validity
- Content-signal match strength
- Required sections: [Present/Missing/Incomplete]

Return compliance table with findings."

**Graceful degradation (if no Task tool):**

- Manually check declared game-type against game-types.csv
- Manually scan for content signals
- Manually check GDD for required game-type-specific sections
- Build compliance table

### 7. Build Compliance Table

**Game-type declaration:**

- Declared type: {value}
- Valid per game-types.csv: {yes/no}

**Content alignment:**

- Match strength to declared type: {Strong/Moderate/Weak/None}
- Other game-types with stronger signals: {list}

**Required sections check:**

- For each required section: Present / Missing / Incomplete
- Count: Required sections present vs total required

**Total compliance score:**

- Required: {present}/{total}
- Declaration valid: {yes/no}
- Content aligned: {yes/no}

### 8. Report Game-Type Compliance Findings to Validation Report

Append to validation report:

```markdown
## Game-Type Compliance Validation

**Declared Game-Type:** {gameType}
**Valid per game-types.csv:** [Yes/No]
**Content Alignment:** [Strong/Moderate/Weak/None]

### Required Game-Type-Specific Sections

**{Section 1}:** [Present/Missing/Incomplete]
{If missing or incomplete: Note specific gaps}

**{Section 2}:** [Present/Missing/Incomplete]
{If missing or incomplete: Note specific gaps}

[Continue for all required sections]

### Content-Signal Analysis

**Signals matching declared type:** {list/count}
**Signals suggesting other game-types:** {list with types}

### Compliance Summary

**Game-Type Declaration:** {Valid/Invalid/Missing}
**Content Alignment:** {Strong/Moderate/Weak/None}
**Required Sections Present:** {present}/{total}
**Compliance Score:** {percentage}%

**Severity:** [Critical if game-type is invalid/missing OR content mismatch is Weak/None OR required sections missing, Warning if incomplete, Pass if complete]

**Recommendation:**
[If Critical] "GDD's game-type declaration or game-type-specific sections have significant issues. Either update the gameType to match the actual content, or add the missing game-type-specific sections from gds-create-gdd."
[If Warning] "Some game-type-specific sections are incomplete. Strengthen documentation."
[If Pass] "Game-type is correctly declared and required sections are present."
```

### 9. Display Progress and Auto-Proceed

Display: "**Game-Type Compliance Validation Complete**

Game-Type: {gameType}
Compliance: {score}%

**Proceeding to next validation check...**"

Without delay, read fully and follow: {nextStepFile} (step-v-10-smart-validation.md)

---

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:

- Game-type extracted correctly (or flagged missing)
- Declared game-type validated against game-types.csv
- Content cross-checked against declared game-type
- Required game-type-specific sections validated
- Compliance table built with status
- Severity assessed correctly
- Findings reported to validation report
- Auto-proceeds to next validation step
- Subprocess attempted with graceful degradation

### ❌ SYSTEM FAILURE:

- Not checking game-type before proceeding
- Not loading game-types.csv
- Missing content-signal cross-check
- Missing required section checks
- Not building compliance table
- Not reporting findings to validation report
- Not auto-proceeding

**Master Rule:** The declared game-type must match the actual GDD content, and each game-type carries its own required sections. Mismatches or missing sections surface as integration problems later.
