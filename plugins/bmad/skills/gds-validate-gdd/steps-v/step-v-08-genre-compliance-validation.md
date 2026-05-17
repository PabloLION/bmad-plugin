---
name: 'step-v-08-genre-compliance-validation'
description: 'Genre Compliance Validation - Validate genre-specific conventions are documented in high-complexity genres'

# File references (ONLY variables used in this step)
nextStepFile: './step-v-09-game-type-validation.md'
gddFile: '{gdd_file_path}'
gddFrontmatter: '{gdd_frontmatter}'
validationReportPath: '{validation_report_path}'
genreComplexityData: '../data/genre-complexity.csv'
---

# Step V-8: Genre Compliance Validation

## STEP GOAL:

Validate genre-specific conventions are present for high-complexity genres (Action/Platformer, RPG, Roguelike, Shooter, MOBA, Fighting, etc.), ensuring genre expectations and required systems are properly documented.

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
- ✅ You bring genre expertise and game-design knowledge
- ✅ This step runs autonomously - no user input needed

### Step-Specific Rules:

- 🎯 Focus ONLY on genre-specific compliance
- 🚫 FORBIDDEN to validate other aspects in this step
- 💬 Approach: Conditional validation based on genre complexity
- 🚪 This is a validation sequence step - auto-proceeds when complete

## EXECUTION PROTOCOLS:

- 🎯 Check classification.gameType / genre from GDD frontmatter
- 💬 If low complexity genre: Skip detailed checks
- 🎯 If high complexity: Validate required genre-specific sections
- 💾 Append compliance findings to validation report
- 📖 Display "Proceeding to next check..." and load next step
- 🚫 FORBIDDEN to pause or request user input

## CONTEXT BOUNDARIES:

- Available context: GDD file with frontmatter classification, validation report
- Focus: Genre compliance only (conditional on genre complexity)
- Limits: Don't validate other aspects, conditional execution
- Dependencies: Steps 2-7 completed - format and requirements validation done

## MANDATORY SEQUENCE

**CRITICAL:** Follow this sequence exactly. Do not skip, reorder, or improvise unless user explicitly requests a change.

### 1. Load Genre Complexity Data

Load and read the complete file at:
`{genreComplexityData}` (../data/genre-complexity.csv)

This CSV contains:

- Genre classifications and complexity levels (high/medium/low)
- Required special sections for each genre
- Key concerns and requirements for complex genres

Internalize this data - it drives which genres require special sections.

### 2. Extract Genre Classification

From GDD frontmatter, extract:

- `classification.gameType` - what game type/genre is this?
- If not present, inspect the GDD content for genre signals (combat mechanics, stats, procedural generation, etc.) and match against the `signals` column in `genre-complexity.csv`

**If no genre classification found and signals are ambiguous:**
Treat as "general" (low complexity) and proceed.

### 3. Determine Genre Complexity

**From genre-complexity.csv:**

**Low complexity genres (skip detailed checks):**

- general
- idle-incremental
- sandbox
- party-game
- text-based

**Medium complexity genres (targeted checks):**

- strategy, horror, metroidvania, adventure, puzzle, racing, sports, card-game, tower-defense, visual-novel, rhythm, turn-based-tactics

**High complexity genres (require special sections):**

- action-platformer, rpg, roguelike, shooter, moba, fighting, survival, simulation

### 4. For High/Medium-Complexity Genres: Validate Required Special Sections

**Attempt subprocess validation:**

"Perform genre compliance validation for {genre}:

Based on {genre} requirements from genre-complexity.csv, check the GDD for:

**Action-Platformer:**

- Movement feel table (jump height, air time, coyote time, input buffer)
- Combat specs (hitbox/hurtbox conventions, damage tables)
- Level gating rules
- Difficulty curve via geometry / enemy placement

**RPG:**

- Stat system (what stats, how they interact, caps)
- Leveling curve (XP required per level, stat gains)
- Inventory rules (slot system, stacking, weight)
- Quest state machine (active/completed/failed/branching)
- Save model (save points, autosaves, slot rules)

**Roguelike:**

- Run structure (length, gates, boss cadence)
- Meta-progression vs in-run progression distinction
- Seed determinism rules
- Balance bands (per-run scaling)

**Shooter:**

- Weapon feel table (TTK, recoil, spread, magazine)
- Netcode model (if multiplayer)
- Hitreg model (client-authoritative vs server-authoritative)
- Map flow and choke points
- Spawn logic

**MOBA:**

- Hero kit matrix (roles, abilities, counters)
- Map/lane pacing
- Matchmaking / MMR model
- Tick rate / latency tolerance

**Fighting:**

- Frame data tables (startup / active / recovery)
- Netcode model (rollback expected for competitive)
- Input spec (buffer, negative edge, motion tolerance)
- Training mode contents

**Survival:**

- Resource economy (scarcity curves)
- Crafting tree
- Threat pacing (day/night, seasonal, AI escalation)
- Persistence model (save scope, base durability)

**Simulation:**

- Systems interaction map
- Balance for long sessions
- Emergence boundaries (what is and isn't allowed)
- End-state or open-ended definition

**Medium-complexity genres:**

- Check for the `special_sections` from CSV for that genre

For each required section:

- Is it present in GDD?
- Is it adequately documented?
- Note any gaps

Return compliance matrix with presence/adequacy assessment."

**Graceful degradation (if no Task tool):**

- Manually check for required sections based on genre and the genre-complexity.csv `special_sections` column
- List present sections and missing sections
- Assess adequacy of documentation

### 5. For Low-Complexity Genres: Skip Detailed Checks

Append to validation report:

```markdown
## Genre Compliance Validation

**Genre:** {genre}
**Complexity:** Low (general/standard)
**Assessment:** N/A - No special genre compliance requirements

**Note:** This GDD is for a low-complexity genre without heavy genre-conventions checks.
```

Display: "**Genre Compliance Validation Skipped**

Genre: {genre} (low complexity)

**Proceeding to next validation check...**"

Without delay, read fully and follow: {nextStepFile}

### 6. Report Compliance Findings (Medium/High-Complexity Genres)

Append to validation report:

```markdown
## Genre Compliance Validation

**Genre:** {genre}
**Complexity:** {Medium/High}

### Required Special Sections

**{Section 1 Name}:** [Present/Missing/Adequate]
{If missing or inadequate: Note specific gaps}

**{Section 2 Name}:** [Present/Missing/Adequate]
{If missing or inadequate: Note specific gaps}

[Continue for all required sections from CSV for this genre]

### Compliance Matrix

| Requirement | Status | Notes |
|-------------|--------|-------|
| {Requirement 1} | [Met/Partial/Missing] | {Notes} |
| {Requirement 2} | [Met/Partial/Missing] | {Notes} |
[... continue for all requirements]

### Summary

**Required Sections Present:** {count}/{total}
**Compliance Gaps:** {count}

**Severity:** [Critical if missing genre-critical sections (e.g., RPG without stat system, Fighting without frame data), Warning if incomplete, Pass if complete]

**Recommendation:**
[If Critical] "GDD is missing genre-critical sections for {genre}. These conventions aren't optional - players and downstream phases expect them."
[If Warning] "Some genre-specific sections are incomplete. Strengthen documentation for full compliance with genre expectations."
[If Pass] "All required genre sections are present and adequately documented."
```

### 7. Display Progress and Auto-Proceed

Display: "**Genre Compliance Validation Complete**

Genre: {genre} ({complexity})
Compliance Status: {status}

**Proceeding to next validation check...**"

Without delay, read fully and follow: {nextStepFile} (step-v-09-game-type-validation.md)

---

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:

- Genre classification extracted correctly (from frontmatter or inferred from signals)
- Complexity assessed appropriately
- Low complexity genres: Skipped with clear "N/A" documentation
- Medium/high complexity genres: All required sections checked
- Compliance matrix built with status for each requirement
- Severity assessed correctly
- Findings reported to validation report
- Auto-proceeds to next validation step
- Subprocess attempted with graceful degradation

### ❌ SYSTEM FAILURE:

- Not checking genre classification before proceeding
- Performing detailed checks on low complexity genres
- For high complexity: missing required section checks
- Not building compliance matrix
- Not reporting findings to validation report
- Not auto-proceeding

**Master Rule:** Genre compliance is conditional. High-complexity genres carry conventions that must be documented - missing them surfaces as emergencies during production.
