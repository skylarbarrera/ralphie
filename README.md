<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="ralphie-white.png">
    <source media="(prefers-color-scheme: light)" srcset="ralphie-black.png">
    <img src="ralphie-black.png" alt="Ralphie" width="200">
  </picture>
</p>

# Ralphie

**Autonomous AI coding loops.**

Based on the [Ralph Wiggum technique](https://github.com/ghuntley/how-to-ralph-wiggum): describe what you want → AI builds it task by task → each task gets committed → come back to working code.

```bash
ralphie spec "Todo app with auth"    # Creates spec
ralphie run --all                    # Builds until done
```

## Quick Start

**1. Install Ralphie**

```bash
npm install -g ralphie
```

**2. Set up your AI provider**

```bash
# Claude (default)
curl -fsSL https://anthropic.com/install-claude.sh | sh

# Or Codex
npm install -g @openai/codex && export OPENAI_API_KEY=sk-...

# Or OpenCode
npm install -g opencode-ai && opencode auth login
```

**3. Build something**

```bash
# Create a spec (autonomous)
ralphie spec "REST API with JWT auth"

# Or interactive (AI interviews you for requirements)
npx add-skill skylarbarrera/ralphie
/ralphie-spec "REST API with JWT auth"   # In Claude/Codex/OpenCode

# Run the loop
ralphie run --all
git log --oneline                        # See what was built
```

## How It Works

Each iteration:
1. Fresh context (no accumulated confusion)
2. Reads spec → picks next pending task
3. Implements, tests, commits
4. Exits → loop restarts clean

**The insight:** Progress lives in git, not the LLM's context. The AI can fail—next iteration starts fresh and sees only committed work.

**What makes Ralphie different:** Structured specs with task IDs, status tracking, size budgeting, and verify commands. The AI knows exactly what to build, how to check it worked, and when it's done. No ambiguity, no drift.

## The 80/20 Philosophy

Ralphie inverts traditional development workflow: **80% planning, 20% execution.**

Instead of spending most time debugging and iterating during implementation, Ralphie front-loads the work in spec generation—so execution becomes trivial.

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

### Compound Engineering Integration

Ralphie's compound engineering features are inspired by [EveryInc/compound-engineering-plugin](https://github.com/EveryInc/compound-engineering-plugin), which pioneered the concept of making "each unit of work make subsequent units easier."

**Core principle:** Turn failures into permanent upgrades. When a task fails then passes, Ralphie automatically documents the fix as a learning—complete with prevention rules and tests—so the same mistake never happens twice.

**Three pillars:**

1. **Deep Research Phase** (before spec generation)
   - Analyzes codebase patterns, conventions, and architecture
   - Researches framework best practices and common patterns
   - Ensures specs align with existing code

2. **Multi-Agent Review** (before iteration)
   - Security review (OWASP, injection, auth)
   - Performance review (complexity, N+1 queries, caching)
   - Architecture review (design patterns, boundaries)
   - Language-specific review (TypeScript/Python best practices)
   - Blocks on critical findings (P1) unless overridden with `--force`

3. **Learnings System** (after failures)
   - Captures root cause analysis when tasks fail then pass
   - Generates preventive tests and coding rules
   - Stores globally (`~/.ralphie/learnings/`) for reuse across projects
   - Injects relevant learnings into future iterations

Learn more: [Compound Engineering articles](https://blog.every.com) by Compound team

### 80/20 Workflow Example

```bash
# 80%: Thorough spec generation with research & analysis
ralphie spec "user authentication with JWT"
# → Research: scans codebase for auth patterns
# → Interview: asks clarifying questions
# → Analysis: identifies edge cases and gaps
# Result: Comprehensive spec that anticipates problems

# 20%: Execution with review & learnings
ralphie run --review --all
# → Pre-iteration: security + architecture review
# → Iteration: implements one task at a time
# → Post-iteration: captures learnings from failures
# Result: High-quality code with permanent upgrades

# View accumulated knowledge
ls .ralphie/learnings/
# → build-errors/
# → test-failures/
# → runtime-errors/
# → patterns/
```

## Commands

| Command | Description |
|---------|-------------|
| `ralphie spec "desc"` | Generate spec autonomously with research + analysis |
| `ralphie spec --skip-research` | Skip deep research phase |
| `ralphie spec --skip-analyze` | Skip SpecFlow analysis phase |
| `ralphie run` | Run one iteration |
| `ralphie run -n 5` | Run 5 iterations |
| `ralphie run --all` | Run until spec complete |
| `ralphie run --review` | Run multi-agent review before iteration |
| `ralphie run --force` | Override P1 blocking (use with `--review`) |
| `ralphie run --greedy` | Multiple tasks per iteration |
| `ralphie run --headless` | JSON output for CI/CD |
| `ralphie init` | Add to existing project |
| `ralphie validate` | Check spec format |
| `ralphie status` | Show progress of active spec |
| `ralphie spec-list` | List active and completed specs |
| `ralphie archive` | Move completed spec to archive |

Use `--harness codex` or `--harness opencode` to switch AI providers. See [CLI Reference](docs/cli.md) for all options.

## Spec Format

Ralphie works from structured specs in `.ralphie/specs/active/`:

```markdown
# My Project

Goal: Build a REST API with authentication

## Tasks

### T001: Set up Express with TypeScript
- Status: pending
- Size: M

**Deliverables:**
- Initialize npm project with TypeScript
- Configure Express server
- Add basic health check endpoint

**Verify:** `npm run build && npm test`

---

### T002: Create User model
- Status: pending
- Size: S

**Deliverables:**
- Define User interface
- Add bcrypt password hashing

**Verify:** `npm test`
```

Tasks transition from `pending` → `in_progress` → `passed`/`failed`. See [Spec Guide](docs/spec-guide.md) for best practices.

## Directory Structure

Ralphie uses a `.ralphie/` directory for project-specific resources and `~/.ralphie/` for global resources:

```
your-project/
├── .ralphie/
│   ├── specs/
│   │   ├── active/          # Current specs being worked on
│   │   ├── completed/       # Archived completed specs
│   │   └── templates/       # Spec templates
│   ├── learnings/           # Project-specific learnings
│   │   ├── build-errors/
│   │   ├── test-failures/
│   │   ├── runtime-errors/
│   │   └── patterns/
│   ├── llms.txt             # Architecture decisions
│   ├── state.txt            # Iteration progress tracking
│   └── settings.json        # Project configuration
│
~/.ralphie/                  # Global (shared across projects)
├── learnings/               # Global learnings library
│   ├── build-errors/
│   ├── test-failures/
│   ├── runtime-errors/
│   └── patterns/
└── settings.json            # Global defaults
```

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

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `command not found: ralphie` | `npm install -g ralphie` |
| `command not found: claude` | `export PATH="$HOME/.local/bin:$PATH"` |
| `Missing ANTHROPIC_API_KEY` | `export ANTHROPIC_API_KEY=sk-ant-...` (add to .zshrc) |
| `Missing OPENAI_API_KEY` | `export OPENAI_API_KEY=sk-...` (add to .zshrc) |
| Stuck on same task | Check task status. Run `ralphie validate` |
| No spec found | `ralphie spec "description"` to create one |

## Documentation

- [CLI Reference](docs/cli.md) — All commands and options
- [Spec Guide](docs/spec-guide.md) — Writing effective specs
- [Architecture](docs/architecture.md) — How the loop works
- [Harnesses](docs/harnesses.md) — Multi-AI provider support

## Requirements

- Node.js 18+
- Claude Code CLI, OpenAI Codex CLI, or OpenCode CLI
- Git

## License

MIT
