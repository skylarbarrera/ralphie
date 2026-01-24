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
# Create a spec
ralphie spec "REST API with JWT auth"

# Run the loop
ralphie run --all
git log --oneline                        # See what was built
```

**What happens next?** Ralphie generates a structured spec with research and analysis, then executes task-by-task with fresh context each iteration. Progress lives in git commits—the AI can fail, the loop restarts clean.

## How It Works

Each iteration:
1. Fresh context (no accumulated confusion)
2. Reads spec → picks next pending task
3. Implements, tests, commits
4. Exits → loop restarts clean

**The insight:** Progress lives in git, not the LLM's context. The AI can fail—next iteration starts fresh and sees only committed work.

**What makes Ralphie different:** Structured specs with task IDs, status tracking, size budgeting, and verify commands. The AI knows exactly what to build, how to check it worked, and when it's done. No ambiguity, no drift.

## Key Features

**Compound Engineering** - Each failure makes the system better:
- **Research phase**: Fetches framework-specific best practices from [skills.sh](https://skills.sh) (React, Next.js, Expo, etc.) and web research
- **Dynamic tool selection**: Discovers best-in-class libraries for your stack (not hardcoded recommendations)
- **Multi-agent review**: Security, performance, architecture checks before implementation
- **Learnings system**: Captures failure→fix transitions as reusable knowledge
- **Quality enforcement**: >80% test coverage mandatory, typed interfaces required, security by default
- **Debug logs**: Full audit trail in `.ralphie/logs/` viewable with `ralphie logs`

**Senior Engineer Output** - Code quality built-in:
- Research recommends current best tools (Zod, bcrypt, expo-auth-session)
- Specs include explicit quality requirements (tests, security, architecture)
- Test validator blocks task completion without >80% coverage
- Clean, maintainable code with proper separation of concerns
- See [Code Quality Standards](docs/code-quality-standards.md) for details

Inspired by [EveryInc/compound-engineering-plugin](https://github.com/EveryInc/compound-engineering-plugin). See [Architecture docs](docs/architecture.md) for details.

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
| `ralphie logs` | View iteration logs (with --tail, --filter) |
| `ralphie archive` | Move completed spec to archive |

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

## Project Structure

After `ralphie init`, you'll have:
- `.ralphie/specs/active/` - Generated specs with task tracking
- `.ralphie/logs/` - Timestamped logs (research, spec generation, iterations)
- `.ralphie/learnings/` - Captured failure→fix knowledge
- `.ralphie/state.txt` - Iteration progress log

See [Architecture docs](docs/architecture.md) for complete structure and file formats.

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

- [CLI Reference](docs/cli.md) - All commands, flags, harness options
- [Spec Guide](docs/spec-guide.md) - Writing effective specs
- [Architecture](docs/architecture.md) - How the loop works, compound engineering details
- [Code Quality Standards](docs/code-quality-standards.md) - Senior engineer code quality expectations
- [Comparison](docs/comparison.md) - How Ralphie compares to other tools

## Requirements

- Node.js 18+
- Claude Code CLI, OpenAI Codex CLI, or OpenCode CLI
- Git

## License

MIT
