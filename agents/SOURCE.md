# Agent Prompts Source Documentation

## Source Repository

All agent prompts in this directory are adapted from the **EveryInc/compound-engineering-plugin** repository.

- **Repository**: https://github.com/EveryInc/compound-engineering-plugin
- **Source Commit**: `cb2485ff481cb6d556163003d339ce16d4dcffdb` (main branch, January 2026)
- **License**: Check repository for current license
- **Credit**: Created by [Every](https://every.to/) as part of their compound engineering methodology

## Source Mapping Table

| Ralphie Agent | Compound Source File | Category |
|---------------|---------------------|----------|
| `repo-research-analyst.md` | `plugins/compound-engineering/agents/research/repo-research-analyst.md` | Research |
| `best-practices-researcher.md` | `plugins/compound-engineering/agents/research/best-practices-researcher.md` | Research |
| `security-sentinel.md` | `plugins/compound-engineering/agents/review/security-sentinel.md` | Review |
| `performance-oracle.md` | `plugins/compound-engineering/agents/review/performance-oracle.md` | Review |
| `architecture-strategist.md` | `plugins/compound-engineering/agents/review/architecture-strategist.md` | Review |
| `typescript-reviewer.md` | `plugins/compound-engineering/agents/review/kieran-typescript-reviewer.md` | Review (Language) |
| `python-reviewer.md` | `plugins/compound-engineering/agents/review/kieran-python-reviewer.md` | Review (Language) |
| `spec-flow-analyzer.md` | `plugins/compound-engineering/agents/workflow/spec-flow-analyzer.md` | Workflow |

## Adaptations Made

These prompts have been adapted from Compound Engineering's original agents to fit Ralphie's context and tool ecosystem. Here's what we changed:

### 1. Tool References

**Original → Ralphie**:
- `ast-grep` → `Grep` tool (Ralphie's code search)
- `rg` (ripgrep) → `Grep` tool
- `find` commands → `Glob` tool (Ralphie's file search)
- Generic file access → `Read` tool (Ralphie's file reader)
- Context7 MCP → `WebFetch` and `WebSearch` tools
- SKILL.md system → `.ralphie/learnings/` system

### 2. Context & Structure

**Changes Made**:
- Added Ralphie-specific sections to each agent:
  - References to `.ralphie/learnings/` for documented patterns
  - References to `.ralphie/llms.txt` for architecture decisions
  - References to `.ralphie/specs/` for spec format conventions
- Expanded prompts from concise overviews to comprehensive guides
- Added detailed examples and code snippets for clarity
- Structured output formats for consistency

### 3. Framework Agnosticism

**Original → Ralphie**:
- Rails-specific examples → Language-agnostic examples
- Framework assumptions → General best practices
- Maintained specific reviewers (TypeScript, Python) as-is

### 4. Output Formats

**Changes Made**:
- Standardized markdown output formats across all agents
- Added severity classifications (Critical/High/Medium/Low)
- Included actionable remediation steps
- Added "Ralphie-Specific Considerations" sections

### 5. Orchestration Model

**Changes Made**:
- Clarified that agents are prompts, not autonomous sub-agents
- Agents are invoked by Ralphie via `harness.run(agentPrompt)`
- No agent spawns other agents (Ralphie orchestrates)
- Aligned with Ralphie's orchestration philosophy from spec

## Checking for Updates

To check if the source agents have been updated and diff against upstream:

### Manual Process (For AI Assistants)

1. **Fetch Current Versions**:
   ```bash
   # Use WebFetch to get raw content from GitHub
   https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/agents/[category]/[agent-name].md
   ```

2. **Compare with Ralphie Versions**:
   - Read local agent file from `agents/[agent-name].md`
   - Compare core concepts and methodology
   - Note any new sections or capabilities

3. **Identify Changes**:
   - New scanning techniques or analysis methods
   - Updated best practices or standards
   - Additional output formats or deliverables
   - Tool or framework updates

4. **Evaluate Applicability**:
   - Does this change improve Ralphie's agents?
   - Are new tools/features available in Ralphie?
   - Do changes conflict with Ralphie's architecture?

5. **Apply Updates**:
   - Adapt new content to Ralphie's tool ecosystem
   - Maintain Ralphie-specific sections
   - Update this SOURCE.md with changes
   - Test updated agents

### Example Check Command

When an AI assistant is asked to check for updates:

```markdown
Task: Check for updates to Ralphie agents from upstream

1. For each agent in SOURCE.md mapping table:
   - Fetch current version from GitHub (use WebFetch with raw URL)
   - Read current Ralphie version (use Read tool)
   - Compare core content (ignore tool-specific differences)
   - Note significant changes or new capabilities

2. Create update report:
   - Agent name
   - Changes found
   - Recommendation (apply / skip / needs discussion)
   - Adaptation notes if applying

3. If updates found, create plan to apply them
```

## Philosophy Alignment

### Compound Engineering Core Principles (Preserved)

1. **80/20 Inversion**: Front-load work in planning/review so execution is trivial
2. **Compounding**: Each cycle makes subsequent cycles easier
3. **Systematic Analysis**: Thorough, structured approaches to code quality
4. **Specificity**: Concrete, actionable guidance over vague suggestions

### Ralphie's Adaptations

1. **Orchestration Model**: Ralphie orchestrates; agents are prompts, not sub-processes
2. **Learning System**: Integrate with `.ralphie/learnings/` for compounding knowledge
3. **Tool Ecosystem**: Adapt to Ralphie's available tools (Grep, Glob, Read, WebFetch, WebSearch)
4. **Simplicity**: Maintain Ralphie's simple iteration loop while enabling thoroughness

## Attribution

These agent prompts are inspired by and adapted from the **Compound Engineering Plugin** by Every, Inc.

Original work: https://github.com/EveryInc/compound-engineering-plugin

Read more about compound engineering philosophy:
- [Compound Engineering: How Every Codes With Agents](https://every.to/chain-of-thought/compound-engineering-how-every-codes-with-agents)

## Maintenance Notes

**Last Updated**: January 21, 2026
**Source Commit Tracked**: main branch
**Ralphie Version**: v1.x with agent support (T008)

**Update Frequency**: Check quarterly or when:
- Compound Engineering plugin has major updates
- Ralphie adds new tools that could enhance agents
- User feedback suggests improvements
- New agent types are added upstream

## Contributing Improvements

If you improve these agents:
1. Document changes in this file under "Adaptations Made"
2. Consider whether improvements could benefit upstream Compound repo
3. Update agent version/date in individual agent files
4. Test agents with Ralphie's orchestration system
