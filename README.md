<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="ralphie-white.png">
    <source media="(prefers-color-scheme: light)" srcset="ralphie-black.png">
    <img src="ralphie-black.png" alt="Ralphie" width="200">
  </picture>
</p>

# Ralphie

**Let AI code while you sleep.**

Ralphie runs AI in a loop until your project is done. Based on the [Ralph Wiggum technique](https://github.com/ghuntley/how-to-ralph-wiggum): describe what you want → AI builds it task by task → each task gets committed → come back to working code.

```bash
/ralphie-spec "Todo app with auth"   # AI interviews you, creates spec
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

**3. Install Ralphie skills** (in your AI tool)

```bash
npx add-skill skillet/ralph
```

**4. Build something**

```bash
# Option A: Interactive (user present) - run in Claude/Codex/OpenCode:
/ralphie-spec "REST API with JWT auth"

# Option B: Autonomous (unattended) - run from CLI:
ralphie spec "REST API with JWT auth"

# Then run the loop:
ralphie run --all                            # Builds it
git log --oneline                            # See what was built
```

## How It Works

Each iteration:
1. Fresh context (no accumulated confusion)
2. Reads spec → picks next pending task
3. Implements, tests, commits
4. Exits → loop restarts clean

**The insight:** Progress lives in git, not the LLM's context. The AI can fail—next iteration starts fresh and sees only committed work.

## Commands

### CLI Commands

| Command | Description |
|---------|-------------|
| `ralphie spec "desc"` | Generate spec autonomously (no user interaction) |
| `ralphie run` | Run one iteration |
| `ralphie run -n 5` | Run 5 iterations |
| `ralphie run --all` | Run until spec complete |
| `ralphie run --greedy` | Multiple tasks per iteration |
| `ralphie run --headless` | JSON output for CI/CD |
| `ralphie init` | Add to existing project |
| `ralphie validate` | Check spec format |
| `ralphie status` | Show progress of active spec |
| `ralphie spec-list` | List active and completed specs |
| `ralphie archive` | Move completed spec to archive |

Use `--harness codex` or `--harness opencode` to switch AI providers. See [CLI Reference](docs/cli.md) for all options.

### Skills (installed via `npx add-skill`)

| Skill | Description |
|-------|-------------|
| `/ralphie-spec` | Generate spec through user interview (requires user) |
| `/review-spec` | Validate spec format and content |
| `/ralphie-iterate` | Execute one iteration (used by `ralphie run`) |
| `/verify` | Pre-commit verification |

Install all skills: `npx add-skill skillet/ralph`

## Spec Format

Ralphie works from structured specs in `specs/active/`:

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


## Troubleshooting

| Problem | Solution |
|---------|----------|
| `command not found: ralphie` | `npm install -g ralphie` |
| `command not found: claude` | `export PATH="$HOME/.local/bin:$PATH"` |
| `Missing ANTHROPIC_API_KEY` | `export ANTHROPIC_API_KEY=sk-ant-...` (add to .zshrc) |
| `Missing OPENAI_API_KEY` | `export OPENAI_API_KEY=sk-...` (add to .zshrc) |
| Stuck on same task | Check task status. Run `ralphie validate` |
| No spec found | `/ralphie-spec` (with user) or `ralphie spec` (autonomous) |

## Documentation

- [CLI Reference](docs/cli.md) — All commands and options
- [Spec Guide](docs/spec-guide.md) — Writing effective specs
- [Skills](skills/SKILLS.md) — Installing and using Ralphie skills
- [Architecture](docs/architecture.md) — How the loop works
- [Harnesses](docs/harnesses.md) — Multi-AI provider support

## Requirements

- Node.js 18+
- Claude Code CLI, OpenAI Codex CLI, or OpenCode CLI
- Git

## License

MIT
