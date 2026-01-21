# Compound Learnings Integration

Goal: Integrate compound engineering concepts into Ralphie - emphasizing the 80/20 philosophy (80% planning/review, 20% execution) to make spec generation thorough enough that the simple iteration loop just works.

## Context

Inspired by [EveryInc/compound-engineering-plugin](https://github.com/EveryInc/compound-engineering-plugin) and their articles on compound engineering.

**Core philosophy:** "Each unit of work should make subsequent units easier." Better specs = better runs.

**The 80/20 inversion:** Traditional dev is 20% planning, 80% execution. Compound engineering inverts this—front-load the work so execution is trivial.

**Ralphie's approach:**
- Keep two spec gen paths: interview (user present) + autonomous (headless)
- Keep simple iteration loop (that's the point)
- Make spec gen so thorough that iterations rarely fail
- When they do fail, turn failures into upgrades

**Key files pattern from Compound:**
- **CLAUDE.md** - Coding preferences (we have `.claude/ralphie.md`)
- **llms.txt** - Architecture decisions (adding this)
- **Learnings** - Documented solutions that compound

## Tasks

### T001: Restructure to .ralphie/ folder
- Status: passed
- Size: M

**Deliverables:**
- Move `specs/` to `.ralphie/specs/`
- Move `STATE.txt` to `.ralphie/state.txt`
- Add `.ralphie/learnings/` directory structure
- Add `.ralphie/llms.txt` for architecture decisions
- Update all path references in codebase
- Update `ralphie init` to create new structure
- Create global `~/.ralphie/` on first run (learnings/, settings.json)
- Backward compat: detect old structure, point user to migration guide
- Create `MIGRATION.md` in repo with instructions for AI-assisted migration

**Verify:** `ralphie init` in fresh dir creates `.ralphie/specs/active/`, `.ralphie/learnings/`, `.ralphie/llms.txt`; also creates `~/.ralphie/` if missing

---

### T002: Enhance spec gen with deep research phase
- Status: passed
- Size: L
- Depends: T008 (agent prompts must exist)

**Deliverables:**
- Use research agent prompts from T008:
  - repo-research-analyst (patterns, conventions, existing code, commit history)
  - best-practices-researcher (framework docs, common patterns)
- Integrate Context7 MCP for external docs lookup (optional)
- Add `.ralphie/settings.json` for MCP configuration
- **Orchestration:** Ralphie runs `harness.run(researchPrompt)` BEFORE spec gen
- Research output saved to `.ralphie/research-context.md`, injected into spec gen prompt
- Support skipping via `--skip-research` flag
- Emphasize 80/20: research is most of the work

**Verify:** `ralphie spec "add auth"` shows research phase, output includes codebase patterns

---

### T003: Add SpecFlow analyzer for spec validation
- Status: passed
- Size: L
- Depends: T008 (agent prompts must exist)

**Deliverables:**
- Use spec-flow-analyzer prompt from T008 (with Ralphie conventions added)
- Checks for: missing verify commands, oversized tasks, edge case gaps, user flow gaps
- Complements existing `ralphie validate` (format) with completeness analysis
- **Orchestration:** Ralphie runs `harness.run(analyzerPrompt)` AFTER spec gen
- Analyzer reads spec, outputs gap report to `.ralphie/analysis.md`
- For autonomous: Ralphie runs `harness.run(refinePrompt)` to fix gaps
- For interactive (`/ralphie-spec`): Present gaps to user in interview
- Support `--skip-analyze` flag to bypass (default: analyze runs)

**Verify:** `ralphie spec "feature"` shows analysis phase, gaps identified if any

---

### T004: Implement learnings capture with auto-upgrades
- Status: passed
- Size: L

**Deliverables:**
- Create learnings storage in two locations:
  - `.ralphie/learnings/` - project-specific learnings
  - `~/.ralphie/learnings/` - global learnings (shared across projects)
- Categories: build-errors, test-failures, runtime-errors, patterns
- YAML frontmatter: problem, symptoms, root-cause, solution, prevention, tags
- **Orchestration:** Ralphie tracks task status across iterations
- When task goes failed → passed, Ralphie injects "document this fix" into next iteration prompt
- Iteration prompt includes instructions to write learning file
- **Turn failures into upgrades:**
  - Prompt tells AI to auto-generate test that would catch the bug
  - Prompt tells AI to suggest rule addition to `.claude/ralphie.md`
- Global vs local: Ralphie decides based on error type (build errors → global, project-specific → local)

**Verify:** After a task fails then passes, `.ralphie/learnings/` contains new learning file

---

### T005: Add learnings search to iteration loop
- Status: passed
- Size: M

**Deliverables:**
- **Orchestration:** Ralphie (Node.js) searches learnings BEFORE calling harness.run()
- Search based on: task title, deliverables keywords, error patterns
- Search order: project learnings first, then global learnings
- Simple keyword/tag matching on YAML frontmatter
- Ralphie injects relevant learnings into iteration prompt
- Learnings reduce repeated mistakes across iterations

**Verify:** Iteration prompt includes relevant learnings section when matches exist

---

### T006: Implement multi-agent review with cost tracking
- Status: pending
- Size: L
- Depends: T008 (agent prompts must exist)

**Deliverables:**
- Use review agent prompts from T008:
  - security-sentinel (OWASP, injection, auth)
  - performance-oracle (complexity, N+1, caching)
  - architecture-strategist (design patterns, boundaries)
  - typescript-reviewer (type safety, module extraction)
  - python-reviewer (type hints, pythonic patterns)
- Auto-detect language from codebase, select relevant reviewers
- **Orchestration:** Ralphie runs `Promise.all([harness.run(prompt1), harness.run(prompt2), ...])`
- Each reviewer outputs markdown findings (Compound's format)
- Ralphie parses severity from output (Critical/High → P1, Medium → P2, Low → P3)
- Ralphie displays cost summary (tokens from harness result + estimated $)
- Triggered via `ralphie run --review` flag

**Verify:** `ralphie run --review` in TypeScript project runs 4 reviewers in parallel with cost summary

---

### T007: Integrate orchestration into CLI commands
- Status: pending
- Size: M

**Deliverables:**
- Update `generateSpec()` to orchestrate: research → spec gen → analysis
- Update `executeRun()` to orchestrate: learnings search → inject into prompt → run
- Update `executeRun()` with `--review` flag: run reviewers → check P1 → iteration
- Block on P1 findings (require `--force` to override)
- Track task status across iterations for learnings capture trigger
- Update README:
  - Document 80/20 workflow
  - Credit [Compound Engineering](https://github.com/EveryInc/compound-engineering-plugin) for agent strategies
  - Link to their articles on compound engineering philosophy

**Verify:** `ralphie run --review` blocks if P1 issues found; `ralphie spec` shows research + analysis phases; README has Compound attribution

---

### T008: Create agent prompt library
- Status: passed
- Size: L

**Deliverables:**
- Create `agents/` directory in npm package (shipped globally)
- Adapt 8 prompts from Compound:
  - Research: repo-research-analyst, best-practices-researcher
  - Review: security-sentinel, performance-oracle, architecture-strategist
  - Review (language): typescript-reviewer, python-reviewer
  - Validation: spec-flow-analyzer (+ Ralphie-specific conventions added)
- Each prompt as standalone .md file with clear structure
- Include invocation instructions and expected output format
- Support custom agents via `.ralphie/agents/` in project (extends/overrides)
- Add `agents/SOURCE.md` documenting source and adaptations

**Verify:** `ls agents/` in package shows 8 agent .md files

---

### T009: Update /ralphie-spec skill for new flow
- Status: pending
- Size: M
- Depends: T002, T003 (research and analysis must be defined)

**Deliverables:**
- Update `skills/ralphie-spec/SKILL.md` to include:
  - Research phase before interview (use repo-research-analyst findings)
  - Analysis phase after spec draft (present gaps to user)
  - Flow: Research → Interview → Draft → Analyze → Review Gaps → Finalize
- Skill reads `.ralphie/research-context.md` if exists
- Skill runs analysis and presents gaps before user approval
- Keep skill self-contained (doesn't call harness, just prompts AI)

**Verify:** `/ralphie-spec "feature"` shows research findings and analysis gaps in interview

---

### T010: Agent update tracking from Compound source
- Status: passed
- Size: S

**Deliverables:**
- Create `agents/SOURCE.md` with:
  - Source repo URL and commit hash
  - Source mapping table (our agent → Compound file)
  - List of adaptations we made (what we changed and why)
  - Instructions for Claude/agent to check for updates and diff against upstream
- No script needed - agent follows instructions to fetch and compare

**Source mapping:**
| Our Agent | Compound Source |
|-----------|-----------------|
| repo-research-analyst | `agents/research/repo-research-analyst.md` |
| best-practices-researcher | `agents/research/best-practices-researcher.md` |
| security-sentinel | `agents/review/security-sentinel.md` |
| performance-oracle | `agents/review/performance-oracle.md` |
| architecture-strategist | `agents/review/architecture-strategist.md` |
| typescript-reviewer | `agents/review/kieran-typescript-reviewer.md` |
| python-reviewer | `agents/review/kieran-python-reviewer.md` |
| spec-flow-analyzer | `agents/workflow/spec-flow-analyzer.md` (+ Ralphie conventions) |

**Verify:** `agents/SOURCE.md` exists with mapping and update instructions

---

## Implementation Order

Due to dependencies, implement in this order:
1. **T001** - Foundation (creates .ralphie/ structure + MIGRATION.md)
2. **T008** - Agent prompts (creates agents/ - needed by T002, T003, T006)
3. **T004, T005** - Learnings system (T005 depends on T004)
4. **T002, T003, T006** - Research, Analysis, Review (use agents from T008)
5. **T007** - Integration (wires everything together)
6. **T009** - Update /ralphie-spec skill (depends on T002, T003)
7. **T010** - Agent tracking documentation (can be last)

## Acceptance Criteria

- WHEN `ralphie init` runs, THEN `.ralphie/` structure with llms.txt is created AND `~/.ralphie/` global dir exists
- WHEN `ralphie spec` runs, THEN research + analysis phases run automatically
- WHEN iteration runs, THEN relevant learnings are injected into prompt
- WHEN task fails then passes, THEN AI documents learning automatically
- WHEN `ralphie run --review` runs, THEN relevant review agents run with cost tracking
- WHEN P1 issue found, THEN `ralphie run --review` blocks without `--force`
- WHEN `/ralphie-spec` runs, THEN research findings and analysis gaps are shown
- WHEN checking for agent updates, THEN `agents/SOURCE.md` provides instructions
- WHEN old `specs/` structure detected, THEN user is pointed to MIGRATION.md

## Notes

### Orchestration Model

**Key principle:** Ralphie (Node.js) orchestrates, AI follows prompts.

```
ralphie spec "feature"
  ├─ harness.run(researchPrompt)     → .ralphie/research-context.md
  ├─ harness.run(specGenPrompt)      → .ralphie/specs/active/feature.md
  └─ harness.run(analyzerPrompt)     → .ralphie/analysis.md (+ auto-refine)

ralphie run --review
  ├─ Promise.all([                   → parallel review
  │    harness.run(securityPrompt),
  │    harness.run(perfPrompt),
  │    harness.run(archPrompt),
  │    harness.run(langPrompt)
  │  ])
  ├─ aggregate findings, check P1s
  └─ harness.run(iterationPrompt)    → AI does one task

ralphie run (normal)
  ├─ searchLearnings(taskKeywords)   → find relevant learnings
  ├─ injectIntoPrompt(learnings)     → add to iteration prompt
  ├─ harness.run(iterationPrompt)    → AI does one task
  └─ if task failed→passed:
       nextIterationPrompt += "document this fix as learning"
```

"Agents" are prompts. Ralphie calls `harness.run(prompt)` for each. The AI doesn't spawn sub-agents.

### The 80/20 Philosophy

The goal is to make spec gen so thorough that `ralphie run` rarely hits issues:

```
┌─────────────────────────────────────────────────┐
│                 80% OF WORK                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐         │
│  │Research │→ │Spec Gen │→ │Analysis │         │
│  └─────────┘  └─────────┘  └─────────┘         │
│       ↓            ↓            ↓              │
│  Codebase     Interview/    Edge cases         │
│  patterns     Autonomous    & gaps             │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│                 20% OF WORK                     │
│           ┌─────────────────┐                  │
│           │  ralphie run    │                  │
│           │  (iterations)   │                  │
│           └─────────────────┘                  │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│               COMPOUND LOOP                     │
│  Failures → Learnings → Tests/Rules → Better   │
└─────────────────────────────────────────────────┘
```

### Two Paths Preserved

| Path | When | Flow |
|------|------|------|
| Interactive (`/ralphie-spec`) | User present | Research → Interview → Draft → Size Review → Analyze → Approve |
| Autonomous (`ralphie spec`) | Headless/CI | Research → Generate → Analyze → Auto-refine → Done |

### llms.txt Format

High-level architecture decisions that rarely change:

```
# Architecture Decisions

## Database
- PostgreSQL for primary data
- Redis for caching

## Auth
- JWT tokens, 24h expiry
- Refresh tokens in httpOnly cookies

## API
- REST, not GraphQL
- Versioned: /api/v1/
```

### Cost Tracking

Review agents track usage per agent run:

| Metric | Claude | Codex | OpenCode |
|--------|--------|-------|----------|
| Input tokens | ✓ | ✓ | ✓ |
| Output tokens | ✓ | ✓ | ✓ |
| Cost (USD) | ✓ (from SDK) | Calculate from tokens | Calculate from tokens |
| Duration | ✓ | ✓ | ✓ |

**Implementation:**
- Claude harness returns `costUsd` directly from Anthropic SDK
- For Codex/OpenCode: Calculate cost from token counts using current API pricing
- Display: `tokens: 1,234 in / 567 out | cost: ~$0.02`
- Store pricing in `.ralphie/settings.json` for user override

### Agent Inventory

**Research Agents (2):**
| Agent | Source | Purpose |
|-------|--------|---------|
| repo-research-analyst | Adapted from Compound | Codebase patterns, conventions, commit history |
| best-practices-researcher | Adapted from Compound | Framework docs via Context7, common patterns |

**Review Agents (5):**
| Agent | Source | Purpose |
|-------|--------|---------|
| security-sentinel | Adapted from Compound | OWASP, injection, auth review |
| performance-oracle | Adapted from Compound | Complexity, N+1, caching |
| architecture-strategist | Adapted from Compound | Design patterns, boundaries |
| typescript-reviewer | Adapted from Compound | Type safety, module extraction |
| python-reviewer | Adapted from Compound | Type hints, pythonic patterns |

**Validation Agents (1):**
| Agent | Source | Purpose |
|-------|--------|---------|
| spec-flow-analyzer | Adapted from Compound + Ralphie conventions | Edge cases, gaps, user flows, spec format |

### Context7 MCP Integration

External documentation lookup for research phase. **Works with all harnesses** - Claude, Codex, and OpenCode all support MCP.

**Pricing:**
- **Free tier:** No API key required, low rate limits
- **With API key:** Higher limits (free key from [context7.com/dashboard](https://context7.com/dashboard))

**Coverage:** 100+ frameworks (React, Next.js, Rails, Django, etc.)

**Tools Provided:**
1. `resolve-library-id` - Match library name to Context7 ID (e.g., "next.js" → "/vercel/next.js")
2. `query-docs` - Get documentation for a specific library ID

**Harness Configuration:**

| Harness | Config Location | Transport |
|---------|-----------------|-----------|
| Claude | `~/.claude/mcp.json` or `claude mcp add` | stdio or HTTP |
| Codex | `~/.codex/config.toml` | stdio or HTTP |
| OpenCode | opencode config | stdio or HTTP |

**Ralphie Configuration:** Optional in `.ralphie/settings.json`

```json
{
  "mcp": {
    "context7": {
      "enabled": true,
      "apiKey": "ctx7sk_..."
    }
  }
}
```

When enabled, Ralphie will check if Context7 is configured in the current harness and use it during the research phase for external docs lookup.

### Global vs Local Resources

When using Ralphie in external projects (e.g., `cd ~/dev/jetlag-sim && ralphie init`):

| Resource | Location | Scope |
|----------|----------|-------|
| Agent prompts | `<npm-package>/agents/` | Global (shipped with Ralphie) |
| Learnings | `.ralphie/learnings/` | Project-local |
| Learnings | `~/.ralphie/learnings/` | Global (shared across projects) |
| Settings | `.ralphie/settings.json` | Project-local (overrides) |
| Settings | `~/.ralphie/settings.json` | Global defaults |
| Specs | `.ralphie/specs/` | Project-local |
| llms.txt | `.ralphie/llms.txt` | Project-local |

**Learnings search order:**
1. Project learnings (`.ralphie/learnings/`)
2. Global learnings (`~/.ralphie/learnings/`)

**Settings merge order:**
1. Global defaults (`~/.ralphie/settings.json`)
2. Project overrides (`.ralphie/settings.json`)

**Agent prompts:**
- Shipped with npm package (not copied to projects)
- Updates come with `npm update ralphie`
- Custom agents can be added to `.ralphie/agents/` to extend/override

### Migration Path

Existing projects with `specs/` structure:
1. Ralphie detects old structure on any command
2. Prints: "Old structure detected. See MIGRATION.md for upgrade instructions."
3. User asks their AI agent: "Follow MIGRATION.md to upgrade this project"
4. AI moves files to `.ralphie/`, creates llms.txt template

No `ralphie migrate` command - keep CLI simple, let AI handle migration.
