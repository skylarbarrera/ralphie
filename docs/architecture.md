# Architecture

How Ralphie works under the hood.

## The 80/20 Workflow

Ralphie inverts traditional development: **80% planning, 20% execution.**

```
┌─────────────────────────────────────────────────────────────┐
│                    80% PLANNING PHASE                        │
├─────────────────────────────────────────────────────────────┤
│  You: ralphie spec "my idea"                                │
│       ↓                                                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  1. RESEARCH PHASE (2 parallel agents, ~60s each)   │    │
│  │     • repo-research-analyst: scans codebase         │    │
│  │       - Architecture patterns & conventions         │    │
│  │       - Existing code structure                     │    │
│  │       - Tech stack & dependencies                   │    │
│  │     • best-practices-researcher: external research  │    │
│  │       - Framework best practices                    │    │
│  │       - Common patterns & anti-patterns             │    │
│  │       - Security & performance considerations       │    │
│  │     → Output: .ralphie/research-context.md          │    │
│  └─────────────────────────────────────────────────────┘    │
│       ↓                                                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  2. SPEC GENERATION                                  │    │
│  │     • Injects research findings into prompt          │    │
│  │     • AI generates structured spec with task IDs     │    │
│  │     → Output: .ralphie/specs/active/{name}.md        │    │
│  └─────────────────────────────────────────────────────┘    │
│       ↓                                                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  3. SPECFLOW ANALYSIS                                │    │
│  │     • Identifies edge cases & gaps                   │    │
│  │     • Suggests improvements                          │    │
│  │     • Can auto-update spec                           │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    20% EXECUTION PHASE                       │
├─────────────────────────────────────────────────────────────┤
│  You: ralphie run --all                                     │
│       ↓                                                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  ITERATION LOOP:                                     │    │
│  │    1. Read spec from .ralphie/specs/active/          │    │
│  │    2. Pick next pending task                         │    │
│  │    3. Implement + test                               │    │
│  │    4. Update status to passed/failed                 │    │
│  │    5. Commit                                         │    │
│  │    6. Exit (fresh restart)                           │    │
│  └─────────────────────────────────────────────────────┘    │
│       ↓                                                      │
│  Done: working code in git history                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    COMPOUND LEARNING                         │
├─────────────────────────────────────────────────────────────┤
│  On failure → pass transition:                              │
│    • Captures root cause analysis                           │
│    • Generates preventive tests & rules                     │
│    • Stores in .ralphie/learnings/ (local)                  │
│    • Or ~/.ralphie/learnings/ (global)                      │
│                                                              │
│  Each failure makes future runs better.                     │
└─────────────────────────────────────────────────────────────┘
```

## Why It Works

**Progress lives in git, not the LLM's context.**

Each iteration starts fresh—no accumulated confusion. The AI can fail, hallucinate, or get stuck. Doesn't matter. Next iteration reads committed state and continues.

This is the [Ralph Wiggum technique](https://github.com/ghuntley/how-to-ralph-wiggum): iteration beats perfection.

## Research Phase Details

The research phase runs two specialized agents in sequence (~90s timeout each):

### repo-research-analyst
Scans the target codebase for:
- Project structure and organization
- Architectural patterns and conventions
- Tech stack and dependencies
- Contribution guidelines and coding standards
- Existing implementation patterns

### best-practices-researcher
Researches external best practices:
- Framework documentation and guides
- Community standards and patterns
- Security considerations
- Performance best practices
- Common pitfalls to avoid

Both agents are instructed to work quickly (60s recommended) with output captured even on timeout. Results are combined into `.ralphie/research-context.md` and injected into the spec generation prompt.

**Skip research when:**
- Working on a small, well-understood project
- The feature is simple and self-contained
- You've already researched manually
- Speed is more important than thoroughness

```bash
ralphie spec --skip-research "simple fix"
```

## Project Structure

After `ralphie init`:

```
your-project/
├── .ralphie/
│   ├── specs/
│   │   ├── active/          # Current specs being worked on
│   │   │   └── my-feature.md
│   │   ├── completed/       # Archived completed specs
│   │   └── templates/       # Spec templates
│   ├── learnings/           # Project-specific learnings
│   │   ├── build-errors/
│   │   ├── test-failures/
│   │   ├── runtime-errors/
│   │   └── patterns/
│   ├── research-context.md  # Latest research findings
│   ├── llms.txt             # Architecture decisions
│   ├── state.txt            # Iteration progress
│   └── settings.json        # Project configuration
└── .claude/
    └── CLAUDE.md            # Coding standards (if using Claude)
```

| File | Purpose |
|------|---------|
| `.ralphie/specs/active/*.md` | Tasks with IDs (T001, T002). Status transitions tracked. |
| `.ralphie/specs/completed/` | Archived specs after completion. |
| `.ralphie/research-context.md` | Research findings from last spec generation. |
| `.ralphie/state.txt` | What's done, what failed, context for next iteration. |
| `.ralphie/learnings/` | Captured failure fixes for compound learning. |

### Global Resources

Ralphie also uses `~/.ralphie/` for shared learnings across all projects:

```
~/.ralphie/
├── learnings/               # Global learnings library
│   ├── build-errors/
│   ├── test-failures/
│   ├── runtime-errors/
│   └── patterns/
└── settings.json            # Global defaults
```

### File Formats

**Learnings format** (YAML frontmatter):
```yaml
---
problem: "npm install fails with EACCES error"
symptoms: ["Permission denied", "EACCES", "npm ERR!"]
root-cause: "Global npm packages installed with sudo"
solution: "Use nvm or configure npm prefix"
prevention: "Never use sudo with npm"
tags: [npm, permissions, build-error]
---

# Detailed explanation and steps...
```

**llms.txt format** (architecture decisions):
```
# Architecture Decisions

## Database
- PostgreSQL for primary data
- Redis for caching

## Auth
- JWT tokens, 24h expiry
- Refresh tokens in httpOnly cookies
```

## Stuck Detection

If no tasks complete after N iterations (default: 3), Ralphie exits with code 1.

```bash
ralphie run --stuck-threshold 5   # More patience
ralphie run --stuck-threshold 1   # Fail fast
```

## Modes

| Mode | Flag | Use Case |
|------|------|----------|
| Interactive | (default) | Watch progress in TUI |
| Headless | `--headless` | CI/CD, automation |
| Greedy | `--greedy` | Multiple tasks per iteration |

See [cli.md](cli.md) for details.
