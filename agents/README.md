# Ralphie Agent Prompt Library

This directory contains specialized agent prompts used by Ralphie for research, code review, and validation tasks. These prompts enable Ralphie to perform thorough analysis as part of its compound engineering approach.

## What Are Agents?

In Ralphie's context, **agents are specialized prompts**, not autonomous sub-processes. Ralphie orchestrates the workflow and calls `harness.run(agentPrompt)` to execute these prompts with the AI assistant (Claude, Codex, or OpenCode).

### Key Concepts

- **Agents are prompts**: Markdown files with detailed instructions
- **Ralphie orchestrates**: The CLI controls when and how agents are invoked
- **Harness executes**: The AI harness (Claude Code, etc.) runs the prompt
- **Results are parsed**: Ralphie reads the output and acts on it

## Agent Categories

### Research Agents (2)

**Purpose**: Gather information before spec generation or implementation

| Agent | Use Case | When to Use |
|-------|----------|-------------|
| **repo-research-analyst** | Analyze codebase structure, patterns, and conventions | Before spec generation, to understand existing patterns |
| **best-practices-researcher** | Research external docs, best practices, and examples | When working with new technologies or frameworks |

### Review Agents (5)

**Purpose**: Review code changes for quality, security, and performance

| Agent | Use Case | When to Use |
|-------|----------|-------------|
| **security-sentinel** | Security audit and vulnerability assessment | After implementation, before merging |
| **performance-oracle** | Performance analysis and optimization | When performance is critical, or during reviews |
| **architecture-strategist** | Architectural compliance and design review | For significant changes affecting system structure |
| **typescript-reviewer** | TypeScript-specific code quality review | For TypeScript projects |
| **python-reviewer** | Python-specific code quality review | For Python projects |

### Validation Agents (1)

**Purpose**: Validate specifications and plans before implementation

| Agent | Use Case | When to Use |
|-------|----------|-------------|
| **spec-flow-analyzer** | Analyze specs for gaps, edge cases, and missing requirements | After spec generation, before implementation |

## How Ralphie Uses Agents

Ralphie's orchestration model follows this pattern:

```
┌─────────────────────────────────────────────────────────┐
│                    Ralphie CLI                          │
│                  (Orchestrator)                         │
└─────────────────────────────────────────────────────────┘
                          │
                          ├─── ralphie spec "feature"
                          │    │
                          │    ├─ 1. Search learnings
                          │    ├─ 2. harness.run(repo-research-analyst)
                          │    ├─ 3. harness.run(best-practices-researcher)
                          │    ├─ 4. harness.run(spec-gen-prompt)
                          │    └─ 5. harness.run(spec-flow-analyzer)
                          │
                          ├─── ralphie run
                          │    │
                          │    ├─ 1. Search learnings
                          │    ├─ 2. Inject learnings into prompt
                          │    └─ 3. harness.run(iteration-prompt)
                          │
                          └─── ralphie run --review
                               │
                               ├─ 1. harness.run(iteration-prompt)
                               ├─ 2. Promise.all([
                               │      harness.run(security-sentinel),
                               │      harness.run(performance-oracle),
                               │      harness.run(architecture-strategist),
                               │      harness.run(typescript-reviewer)
                               │    ])
                               ├─ 3. Parse findings
                               ├─ 4. Block if P1 issues
                               └─ 5. Continue iteration if passing
```

## Usage Examples

### Example 1: Spec Generation with Research

```bash
# Ralphie orchestrates research before spec generation
ralphie spec "add user authentication"

# Behind the scenes:
# 1. Ralphie calls harness.run(repo-research-analyst prompt)
#    Output saved to .ralphie/research-context.md
# 2. Ralphie calls harness.run(best-practices-researcher prompt)
#    Findings added to research-context.md
# 3. Ralphie generates spec using research context
# 4. Ralphie calls harness.run(spec-flow-analyzer prompt)
#    Gaps identified, spec refined automatically
```

### Example 2: Code Review Before Merge

```bash
# Run multiple review agents in parallel
ralphie run --review

# Behind the scenes:
# 1. Ralphie detects project language (TypeScript)
# 2. Ralphie runs 4 reviewers in parallel:
#    - security-sentinel
#    - performance-oracle
#    - architecture-strategist
#    - typescript-reviewer
# 3. Ralphie aggregates findings by severity
# 4. If Critical/High findings, blocks without --force
# 5. Displays cost summary (tokens + estimated $)
```

### Example 3: Learnings-Informed Iteration

```bash
# Normal run with learnings injection
ralphie run

# Behind the scenes:
# 1. Ralphie searches .ralphie/learnings/ for relevant patterns
# 2. Ralphie searches ~/.ralphie/learnings/ for global patterns
# 3. Ralphie injects matching learnings into iteration prompt
# 4. AI assistant has context from past issues and solutions
```

## Agent Prompt Structure

Each agent prompt follows this structure:

```markdown
# Agent Name

## Overview
[What this agent does and why]

## Core Responsibilities
[Key tasks this agent performs]

## Methodology
[Step-by-step approach]

## Output Format
[Expected output structure]

## Ralphie-Specific Considerations
[How to use Ralphie's tools and learnings system]
```

## Tools Available to Agents

When Ralphie executes agent prompts through the harness, these tools are available:

- **Grep**: Search code with regex patterns
- **Glob**: Find files by pattern
- **Read**: Read file contents
- **WebFetch**: Fetch content from URLs
- **WebSearch**: Search the web
- **Bash**: Execute shell commands (use sparingly)

Agents should use these tools rather than assuming tool availability from the source repository.

## Customizing Agents

Projects can customize agents in two ways:

### 1. Override in Project

Create `.ralphie/agents/` in your project:

```bash
# Copy and modify agent
cp agents/typescript-reviewer.md .ralphie/agents/typescript-reviewer.md

# Edit to add project-specific guidelines
# Ralphie will use project version instead of global
```

### 2. Extend with Learnings

Document project-specific patterns in `.ralphie/learnings/`:

```yaml
---
problem: TypeScript strict mode violations
tags: [typescript, type-safety]
category: patterns
---

## Pattern
In this project, we use `unknown` instead of `any` for all third-party data.

## Why
Ensures runtime validation before use.

## Example
\`\`\`typescript
const data: unknown = await fetchExternal();
if (isExpectedShape(data)) {
  // TypeScript now knows the shape
  processData(data);
}
\`\`\`
```

Agents automatically incorporate learnings when Ralphie injects them into prompts.

## Cost Tracking

When using `--review` flag, Ralphie tracks:

- Input tokens per agent
- Output tokens per agent
- Estimated cost (based on harness pricing)
- Total duration

Example output:

```
Review Summary:
├─ security-sentinel:     1,234 in / 567 out | ~$0.02 | 3.2s
├─ performance-oracle:    2,345 in / 891 out | ~$0.04 | 4.1s
├─ architecture-strategist: 1,890 in / 723 out | ~$0.03 | 3.8s
└─ typescript-reviewer:   2,102 in / 654 out | ~$0.03 | 3.5s

Total Cost: ~$0.12 | Total Duration: 14.6s
```

## Philosophy: 80/20 Compound Engineering

These agents embody Ralphie's 80/20 philosophy:

### 80% - Planning & Research (Front-loaded)

- Research agents understand codebase before spec generation
- Spec-flow-analyzer catches gaps before implementation
- Comprehensive specs make iteration trivial

### 20% - Execution (Simplified)

- Simple iteration loop with learnings injection
- Minimal debugging due to thorough planning
- Failures become learnings for future iterations

### Compounding Effect

```
Cycle 1: Research → Spec → Implement → Review → Learn
         ↓
Cycle 2: Previous learnings inform research → Better spec → ...
         ↓
Cycle 3: More learnings → Even better spec → Fewer issues → ...
```

Each cycle compounds:
- Learnings accumulate in `.ralphie/learnings/`
- Patterns are documented and reused
- Specs get better with experience
- Iterations run smoother over time

## Source & Attribution

These agent prompts are adapted from the **EveryInc/compound-engineering-plugin**.

- **Original Repository**: https://github.com/EveryInc/compound-engineering-plugin
- **Adaptations**: See [SOURCE.md](./SOURCE.md) for detailed mapping and changes
- **Philosophy**: [Compound Engineering by Every](https://every.to/chain-of-thought/compound-engineering-how-every-codes-with-agents)

## CLI Integration Status

| Feature | Status | CLI Command |
|---------|--------|-------------|
| Research phase in spec gen | ⏳ Planned (T002) | `ralphie spec` |
| Spec validation | ⏳ Planned (T003) | `ralphie spec` |
| Multi-agent review | ⏳ Planned (T006) | `ralphie run --review` |
| Learnings search | ✅ Implemented (T005) | `ralphie run` |
| Cost tracking | ⏳ Planned (T006) | `ralphie run --review` |

See `.ralphie/specs/active/compound-learnings.md` for implementation roadmap.

## Future Enhancements

Potential additions:
- Language-specific reviewers (Go, Rust, etc.)
- Framework-specific reviewers (React, Vue, Rails, etc.)
- Domain-specific agents (API design, database schema, etc.)
- Testing strategy agents
- Documentation quality agents
- Dependency analysis agents

Contributions welcome! Follow the pattern in existing agents and update SOURCE.md.
