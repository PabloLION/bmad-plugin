---
name: 'step-06-build-expert'
description: 'Generate Expert agent YAML with sidecar from plan'

# File References
nextStepFile: './step-08-celebrate.md'
agentPlan: '{bmb_creations_output_folder}/agent-plan-{agent_name}.md'
agentBuildOutput: '{bmb_creations_output_folder}/{agent-name}/'
agentYamlOutput: '{bmb_creations_output_folder}/{agent-name}/{agent-name}.agent.yaml'

# Template and Architecture
expertTemplate: ../templates/expert-agent-template/expert-agent.template.md
expertArch: ../data/expert-agent-architecture.md
agentCompilation: ../data/agent-compilation.md
criticalActions: ../data/critical-actions.md

# Task References
advancedElicitationTask: '{project-root}/_bmad/core/workflows/advanced-elicitation/workflow.xml'
partyModeWorkflow: '{project-root}/_bmad/core/workflows/party-mode/workflow.md'
---

# STEP GOAL

Assemble the agent plan content into a complete Expert agent YAML file with agent memory structure. Expert agents require persistent memory storage, managed by Claude Code's native agent-memory system at `.claude/agent-memory/{agent-name}/`.

## MANDATORY EXECUTION RULES

1. **EXPERT AGENT = MEMORY REQUIRED**: Every Expert agent MUST use Claude Code's agent-memory system at `.claude/agent-memory/{agent-name}/`
2. **CRITICAL_ACTIONS FORMAT**: All critical_actions MUST use `.claude/agent-memory/{agent-name}/` for writable files and `${CLAUDE_PLUGIN_ROOT}/data/{agent-name}/` for plugin data
3. **TEMPLATE COMPLIANCE**: Follow expert-agent-template.md structure exactly
4. **YAML VALIDATION**: Ensure valid YAML syntax with proper indentation (2-space)
5. **EXISTING CHECK**: If agentYamlOutput exists, ask user before overwriting
6. **NO DRIFT**: Use ONLY content from agentPlan - no additions or interpretations

## EXECUTION PROTOCOLS

### Phase 1: Load Architecture and Templates
1. Read `expertTemplate` - defines YAML structure for Expert agents
2. Read `expertArch` - architecture requirements for Expert-level agents
3. Read `agentCompilation` - assembly rules for YAML generation
4. Read `criticalActions` - validation requirements for critical_actions

### Phase 2: Load Agent Plan
1. Read `agentPlan` containing all collected content from Steps 1-5
2. Verify plan contains:
   - Agent type: "expert"
   - Sidecar folder name
   - Persona content
   - Commands structure
   - Critical actions (if applicable)

### Phase 3: Assemble Expert YAML
Using expertTemplate as structure:

```yaml
name: '{agent-name}'
description: '{short-description}'

author:
  name: '{author}'
  created: '{date}'

persona: |
  {multi-line persona content from plan}

system-context: |
  {expanded context from plan}

capabilities:
  - {capability from plan}
  - {capability from plan}
  # ... all capabilities

critical-actions:
  - name: '{action-name}'
    description: '{what it does}'
    invocation: '{when/how to invoke}'
    implementation: |
      {multi-line implementation}
    output: '{expected-output}'
    memory-folder: '.claude/agent-memory/{agent-name}/'
    memory-files:
      - '.claude/agent-memory/{agent-name}/MEMORY.md'
      - '${CLAUDE_PLUGIN_ROOT}/data/{agent-name}/instructions.md'
  # ... all critical actions referencing memory structure

commands:
  - name: '{command-name}'
    description: '{what command does}'
    steps:
      - {step 1}
      - {step 2}
    # ... all commands from plan

configuration:
  temperature: {temperature}
  max-tokens: {max-tokens}
  response-format: {format}
  # ... other configuration from plan

metadata:
  memory-folder: '.claude/agent-memory/{agent-name}/'
  agent-type: 'expert'
  memory-type: 'persistent'
```

### Phase 4: Create Agent Memory Structure

1. **Agent memory is managed natively by Claude Code** at `.claude/agent-memory/{agent-name}/`
   - Claude Code creates and manages this folder automatically when `memory: project` is set
   - No manual folder creation needed at install time

2. **Create Plugin Data Folder** for stable read-only files:
   - Path: `${CLAUDE_PLUGIN_ROOT}/data/{agent-name}/`
   - Add `instructions.md` and any other read-only knowledge files here

3. **Add README to plugin data folder**:
   ```markdown
   # {agent-name} Plugin Data

   This folder contains stable read-only data for the **{agent-name}** Expert agent.
   It ships with the plugin and is not modified at runtime.

   ## Purpose
   {purpose from critical_actions}

   ## Files
   - instructions.md: Protocols, domain boundaries, startup behavior
   - {additional files}

   ## Agent Memory
   The agent stores session state and learned patterns at:
   `.claude/agent-memory/{agent-name}/MEMORY.md`
   ```

### Phase 5: Write Agent YAML

1. Create `agentBuildOutput` directory: `mkdir -p {agentBuildOutput}`
2. Write YAML to `agentYamlOutput`
3. Confirm write success
4. Display file location to user

### Phase 6: Present MENU OPTIONS

Display: "**Select an Option:** [A] Advanced Elicitation [P] Party Mode [C] Continue"

#### Menu Handling Logic:

- IF A: Execute {advancedElicitationTask}, and when finished redisplay the menu
- IF P: Execute {partyModeWorkflow}, and when finished redisplay the menu
- IF C: Write agent YAML to {agentBuildOutput}/{agent-name}/{agent-name}.agent.yaml (or appropriate output path), update frontmatter, then only then load, read entire file, then execute {nextStepFile}
- IF Any other comments or queries: help user respond then [Redisplay Menu Options](#phase-6-present-menu-options)

#### EXECUTION RULES:

- ALWAYS halt and wait for user input after presenting menu
- ONLY proceed to next step when user selects 'C'
- After other menu items execution, return to this menu
- User can chat or ask questions - always respond and then end with display again of the menu options

## CONTEXT BOUNDARIES

- **USE ONLY**: Content from agentPlan, expertTemplate, expertArch, agentCompilation, criticalActions
- **DO NOT ADD**: New capabilities, commands, or actions not in plan
- **DO NOT INTERPRET**: Use exact language from plan
- **DO NOT SKIP**: Any field in expertTemplate structure
- **CRITICAL**: Expert agents MUST have sidecar-folder metadata

## CRITICAL STEP COMPLETION NOTE

ONLY WHEN [C continue option] is selected and [complete YAML generated and written to output], will you then load and read fully `{nextStepFile}` to execute and celebrate completion.

This step produces TWO artifacts:
1. **Agent YAML**: Complete expert agent definition at `{agentYamlOutput}`
2. **Plugin Data Folder**: Read-only files at `${CLAUDE_PLUGIN_ROOT}/data/{agent-name}/` (ships with plugin)

Agent memory at `.claude/agent-memory/{agent-name}/` is managed by Claude Code natively — no manual creation needed.

## SUCCESS METRICS

✅ Agent YAML file created at expected location
✅ Valid YAML syntax (no parse errors)
✅ All template fields populated
✅ Plugin data folder created at `${CLAUDE_PLUGIN_ROOT}/data/{agent-name}/`
✅ Plugin data folder contains instructions.md and other read-only files
✅ critical_actions use `.claude/agent-memory/{agent-name}/` for writable paths
✅ critical_actions use `${CLAUDE_PLUGIN_ROOT}/data/{agent-name}/` for plugin data
✅ metadata.memory-folder populated
✅ metadata.agent-type = "expert"
✅ User validation choice received (one-at-a-time or YOLO)

## FAILURE MODES

❌ Missing required template fields
❌ Invalid YAML syntax
❌ Plugin data folder creation failed
❌ critical_actions missing memory path references
❌ agentPlan missing expert-specific content (agent name for memory paths)
❌ File write permission errors
