---
name: 'step-v-07-implementation-leakage-validation'
description: 'Implementation Leakage Check - Ensure the GDD does not include engine/code details that belong in architecture'

# File references (ONLY variables used in this step)
nextStepFile: './step-v-08-genre-compliance-validation.md'
gddFile: '{gdd_file_path}'
validationReportPath: '{validation_report_path}'
---

# Step V-7: Implementation Leakage Validation

## STEP GOAL:

Ensure mechanics, systems, and technical specifications in the GDD don't include engine/implementation details - they should specify WHAT the player experiences and WHAT the system must achieve, not HOW it's built. Those details belong in the architecture document.

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
- ✅ You bring analytical rigor and separation-of-concerns expertise
- ✅ This step runs autonomously - no user input needed

### Step-Specific Rules:

- 🎯 Focus ONLY on implementation / engine leakage detection
- 🚫 FORBIDDEN to validate other aspects in this step
- 💬 Approach: Systematic scanning for engine and implementation terms
- 🚪 This is a validation sequence step - auto-proceeds when complete

## EXECUTION PROTOCOLS:

- 🎯 Scan mechanics, systems, and tech specs for engine/implementation terms
- 💾 Distinguish platform/engine-as-constraint vs. engine-as-implementation
- 📖 Append findings to validation report
- 📖 Display "Proceeding to next check..." and load next step
- 🚫 FORBIDDEN to pause or request user input

## CONTEXT BOUNDARIES:

- Available context: GDD file, validation report
- Focus: Implementation leakage detection only
- Limits: Don't validate other aspects, don't pause for user input
- Dependencies: Steps 2-6 completed - initial validations done

## MANDATORY SEQUENCE

**CRITICAL:** Follow this sequence exactly. Do not skip, reorder, or improvise unless user explicitly requests a change.

### 1. Attempt Sub-Process Validation

**Try to use Task tool to spawn a subprocess:**

"Perform implementation leakage validation on this GDD:

**Scan for:**

1. Engine / framework internals (Rigidbody2D, GameObject, Actor class, UBlueprint, Node2D, AnimationTree, UnrealBuildTool, Mono, IL2CPP, etc.)
2. Scripting language and code patterns (C++, C#, GDScript, specific class names, specific methods like Update()/Tick()/_process())
3. Shader / rendering internals (HLSL, GLSL, specific shader types, specific render passes, URP/HDRP/Deferred specifics)
4. Networking library internals (Mirror, Photon, Netcode for GameObjects, specific RPC types, replication modes)
5. Data format internals (JSON schema, specific serializer, ScriptableObject, DataTable, UDataAsset) unless relevant to player-facing capability
6. Build / tooling specifics (specific addressables bundles, specific platform SDK calls)

**For each term found:**

- Is this a platform constraint? (e.g., 'must run on Unreal 5 for PS5 certification' - platform constraint is OK in Technical Specifications)
- Is this an engine capability mention? (e.g., 'uses the engine's nav-mesh system' - acceptable if abstracted)
- Or is this implementation detail? (e.g., 'NavAgent component moves along Nav Mesh with custom filter' - HOW, not WHAT)

Document violations with line numbers and explanation.

Return structured findings with leakage counts and examples."

### 2. Graceful Degradation (if Task tool unavailable)

If Task tool unavailable, perform analysis directly:

**Implementation leakage terms to scan for:**

**Unity-specific:**
GameObject, MonoBehaviour, ScriptableObject, Rigidbody, Rigidbody2D, Transform, Coroutine, Update, FixedUpdate, Addressables, URP, HDRP, NavMeshAgent, Animator component, Cinemachine internals, etc.

**Unreal-specific:**
UObject, Actor, Pawn, Character class, Blueprint, UBlueprint, Tick(), UMG, Gameplay Ability System internals, UE Niagara internals, UnrealBuildTool, etc.

**Godot-specific:**
Node, Node2D, Node3D, GDScript keywords, \_process, \_physics_process, AnimationPlayer node internals, etc.

**Generic engine internals:**
Game loop implementation, ECS specifics (EnTT, Unity DOTS, etc.), specific physics libraries (PhysX, Box2D, Havok) unless platform constraint

**Networking:**
Mirror, Photon, Netcode for GameObjects, specific RPC annotations, ReplicationMode, NetworkBehaviour - unless documenting a hard constraint

**Shaders / rendering:**
HLSL, GLSL, specific shader stage mentions, specific render passes, deferred vs forward (unless a hard constraint)

**Tooling:**
Specific CI / addressable bundle names, specific asset pipeline scripts

**For each term found:**

- Determine if it's a hard constraint (OK in Technical Specs) or implementation detail (leakage)
- Example: "Target engine: Unreal Engine 5.4 for PS5/XSX compatibility" - constraint, OK
- Example: "Combat uses Gameplay Ability System with custom AttributeSet classes" - leakage, belongs in architecture

**Count violations and note line numbers**

### 3. Tally Implementation Leakage

**By category:**

- Engine internals (Unity/Unreal/Godot/other) leakage: count
- Scripting / code pattern leakage: count
- Shader / rendering internals leakage: count
- Networking library leakage: count
- Data format internals leakage: count
- Tooling / build specifics leakage: count
- Other implementation details: count

**Total implementation leakage violations:** sum

### 4. Report Implementation Leakage Findings to Validation Report

Append to validation report:

```markdown
## Implementation Leakage Validation

### Leakage by Category

**Engine Internals:** {count} violations
{If violations, list examples with line numbers}

**Scripting / Code Patterns:** {count} violations
{If violations, list examples with line numbers}

**Shader / Rendering Internals:** {count} violations
{If violations, list examples with line numbers}

**Networking Library Internals:** {count} violations
{If violations, list examples with line numbers}

**Data Format Internals:** {count} violations
{If violations, list examples with line numbers}

**Tooling / Build Specifics:** {count} violations
{If violations, list examples with line numbers}

**Other Implementation Details:** {count} violations
{If violations, list examples with line numbers}

### Summary

**Total Implementation Leakage Violations:** {total}

**Severity:** [Critical if >5 violations, Warning if 2-5, Pass if <2]

**Recommendation:**
[If Critical] "Extensive engine/implementation leakage found. The GDD specifies HOW instead of WHAT. Move these details into the architecture document - the GDD should be engine-agnostic where possible."
[If Warning] "Some implementation leakage detected. Review violations and move implementation details to architecture."
[If Pass] "No significant implementation leakage found. The GDD properly specifies player experience and system behavior without engine internals."

**Note:** Target engine, platform, and hard constraints (e.g., "Must ship on PS5 using Unreal 5 for certification reasons") belong in Technical Specifications and are acceptable. The leakage check is about _how_ mechanics are built, not _on what_ they run.
```

### 5. Display Progress and Auto-Proceed

Display: "**Implementation Leakage Validation Complete**

Total Violations: {count} ({severity})

**Proceeding to next validation check...**"

Without delay, read fully and follow: {nextStepFile} (step-v-08-genre-compliance-validation.md)

---

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:

- Scanned mechanics, systems, and tech specs for all implementation term categories
- Distinguished platform constraints from implementation leakage
- Violations documented with line numbers and explanations
- Severity assessed correctly
- Findings reported to validation report
- Auto-proceeds to next validation step
- Subprocess attempted with graceful degradation

### ❌ SYSTEM FAILURE:

- Not scanning all implementation term categories
- Not distinguishing constraints from leakage
- Missing line numbers for violations
- Not reporting findings to validation report
- Not auto-proceeding

**Master Rule:** The GDD specifies WHAT, not HOW. Engine-specific implementation details belong in the architecture document, not the GDD.
