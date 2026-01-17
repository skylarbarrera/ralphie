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
ralphie spec "Todo app with auth"   # AI interviews you, creates SPEC.md
ralphie run --all                   # Builds until done
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
ralphie spec "REST API with JWT auth"    # Creates SPEC.md
ralphie run --all                         # Builds it
git log --oneline                         # See what was built
```

## How It Works

Each iteration:
1. Fresh context (no accumulated confusion)
2. Reads SPEC.md → picks next unchecked task
3. Implements, tests, commits
4. Exits → loop restarts clean

**The insight:** Progress lives in git, not the LLM's context. The AI can fail—next iteration starts fresh and sees only committed work.

## Commands

| Command | Description |
|---------|-------------|
| `ralphie spec "desc"` | Generate SPEC via AI interview |
| `ralphie run` | Run one iteration |
| `ralphie run -n 5` | Run 5 iterations |
| `ralphie run --all` | Run until SPEC complete |
| `ralphie run --greedy` | Multiple tasks per iteration |
| `ralphie run --headless` | JSON output for CI/CD |
| `ralphie init` | Add to existing project |
| `ralphie validate` | Check SPEC format |

Use `--harness codex` or `--harness opencode` to switch AI providers. See [CLI Reference](docs/cli.md) for all options.

## SPEC Format

Ralphie works from a `SPEC.md` checklist:

```markdown
# My Project

- [ ] Set up Express with TypeScript
- [ ] Create User model with bcrypt
- [ ] Add /auth/login endpoint
- [ ] Add /auth/register endpoint
- [ ] Write tests
```

Tasks get checked off as completed. See [SPEC Guide](docs/spec-guide.md) for best practices.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `command not found: ralphie` | `npm install -g ralphie` |
| `command not found: claude` | `export PATH="$HOME/.local/bin:$PATH"` |
| Stuck on same task | Check `- [ ]` format. Run `ralphie validate` |

## Documentation

- [CLI Reference](docs/cli.md) — All commands and options
- [SPEC Guide](docs/spec-guide.md) — Writing effective SPECs
- [Architecture](docs/architecture.md) — How the loop works
- [Harnesses](docs/harnesses.md) — Multi-AI provider support

## Requirements

- Node.js 18+
- Claude Code CLI, OpenAI Codex CLI, or OpenCode CLI
- Git

## License

MIT
