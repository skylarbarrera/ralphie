# Competitive Comparison

How Ralphie compares to other spec-driven and autonomous AI coding tools.

## Tool Categories

### 1. Pure AI Coding Agents (IDE/CLI)

| Tool | Approach | Differentiator |
|------|----------|----------------|
| **Cursor** | IDE with AI agents | Baseline standard, 8+ models |
| **Claude Code** | Terminal-first agent | Deep reasoning, memory across sessions |
| **Codex CLI** | Cloud sandbox agent | Produces PRs, runs in isolation |
| **Devin** | Sandboxed "AI engineer" | Good at migrations, repetitive tasks ($20/mo) |
| **Aider** | Model-agnostic CLI | Interactive chat-based, human in loop |

### 2. Spec-Driven Development (SDD) Tools

| Tool | Approach | Differentiator |
|------|----------|----------------|
| **GitHub Spec Kit** | Spec workflow, human-driven | Works with 15+ agents, no autonomous loops |
| **Kiro (AWS)** | IDE with first-class specs | Spec as source of truth |
| **OpenSpec** | Spec alignment framework | Human-AI agreement before coding |

### 3. Ralph Loop Implementations

| Tool | Approach | Differentiator |
|------|----------|----------------|
| **ghuntley Ralph** | Bash loop + specs + IMPLEMENTATION_PLAN | Full workflow, battle-tested |
| **Anthropic Plugin** | Stop hook in Claude Code | Loop only, no specs |
| **Vercel ralph-loop-agent** | AI SDK integration | Verification-based loops |

## Verified Feature Matrix

| Feature | Ralphie | ghuntley Ralph | Anthropic Plugin | Spec Kit |
|---------|---------|----------------|------------------|----------|
| **Spec generation** | Interview-based | Manual write | None | Manual |
| **Spec format** | V2 specs in `specs/active/` with task IDs | Multiple `specs/*.md` + IMPLEMENTATION_PLAN.md | None | Constitution + specs + plans |
| **Autonomous loop** | Yes | Yes (bash) | Yes (Stop hook) | No (human invokes each step) |
| **Plan/Build modes** | Single mode | Separate PROMPT_plan/build | No | Separate phases |
| **Multi-harness** | Claude + Codex | Claude only | Claude only | 15+ agents |
| **SDK-based** | Yes (`claude-agent-sdk`) | No (CLI + stream-json) | N/A (plugin) | N/A |
| **Greedy mode** | Yes (multiple tasks/iter) | No (one task/iter) | No | N/A |
| **TUI monitoring** | Yes | No | No | No |
| **Headless/CI** | Yes (JSON output) | Yes (stream-json) | No | No |

## Detailed Comparisons

### Ralphie vs ghuntley Ralph

**ghuntley is more sophisticated:**
- Separate planning and building modes with different prompts
- Multiple spec files per topic (`specs/*.md`)
- Disposable `IMPLEMENTATION_PLAN.md` (can regenerate)
- Explicit "one task per iteration" discipline
- Subagent spawning guidance in prompts
- Battle-tested (months of production use, YC hackathons)

**Ralphie is simpler/more accessible:**
- V2 spec format with task IDs and status tracking
- Interview generates spec for you (`ralphie spec "idea"` or `/ralphie-spec` skill)
- No bash scripting required
- Visual TUI for monitoring progress
- Greedy mode for faster completion
- Multi-AI support out of box (Claude + Codex)
- SDK-based (no CLI parsing)

### Ralphie vs Anthropic Ralph Plugin

| Aspect | Ralphie | Anthropic Plugin |
|--------|---------|------------------|
| **Specs** | Interview-generated V2 specs | None (bring your own prompt) |
| **Installation** | `npm install -g ralphie` | `/plugin install ralph-wiggum` |
| **Loop control** | `--all`, `-n 5`, `--greedy` | `--max-iterations`, `--completion-promise` |
| **Monitoring** | TUI with progress | None (runs in session) |
| **CI/CD** | Headless mode with JSON | Not supported |

### Ralphie vs Spec Kit

| Aspect | Ralphie | Spec Kit |
|--------|---------|----------|
| **Autonomy** | Fully autonomous loop | Human invokes each step |
| **Spec creation** | AI interview | Manual or AI-assisted |
| **Workflow** | spec → run → done | constitution → specify → clarify → plan → tasks → implement |
| **Complexity** | Simple (2 commands) | Structured (7 phases) |
| **Best for** | Solo devs, quick projects | Teams, complex requirements |

## Technical Comparison

### Output/Streaming Approach

| Tool | Method | Pros | Cons |
|------|--------|------|------|
| **Ralphie** | `@anthropic-ai/claude-agent-sdk` | Type-safe, native async, no subprocess | SDK dependency |
| **ghuntley** | CLI + `--output-format stream-json` | No SDK needed, works with any Claude | String parsing, subprocess management |
| **Aider** | Direct API calls | Model-agnostic | Custom implementation per provider |

### Loop Mechanism

| Tool | Mechanism | State Persistence |
|------|-----------|-------------------|
| **Ralphie** | SDK query loop, check task status | Git commits + spec file |
| **ghuntley** | Bash `while :; do claude; done` | Git commits + IMPLEMENTATION_PLAN.md |
| **Anthropic Plugin** | Stop hook intercepts exit | Files + git history |
| **Vercel** | `while(true)` + `verifyCompletion()` | Custom verification |

## Positioning

### Target Audiences

| Tool | Best For |
|------|----------|
| **Ralphie** | Devs who want guided spec creation + fire-and-forget execution |
| **ghuntley Ralph** | Power users who write detailed specs manually |
| **Anthropic Plugin** | Claude Code users who want basic looping |
| **Spec Kit** | Teams wanting structured spec workflow (no autonomy) |
| **Aider** | Devs who prefer interactive chat-based coding |

### Ralphie's Niche

> "Don't know how to write specs? Don't want to mess with bash scripts? Just run `ralphie spec 'my idea'`, answer questions, then `ralphie run --all`."

**Key differentiators:**
1. **Interview-based spec generation** - Unique among Ralph implementations
2. **Polished UX** - TUI, progress monitoring, not a bash script
3. **Multi-harness** - Switch between Claude and Codex
4. **SDK-based** - Modern approach, no CLI parsing
5. **Greedy mode** - Multiple tasks per iteration for speed

## Sources

- [ghuntley/how-to-ralph-wiggum](https://github.com/ghuntley/how-to-ralph-wiggum)
- [anthropics/claude-code/plugins/ralph-wiggum](https://github.com/anthropics/claude-code/tree/main/plugins/ralph-wiggum)
- [github/spec-kit](https://github.com/github/spec-kit)
- [vercel-labs/ralph-loop-agent](https://github.com/vercel-labs/ralph-loop-agent)
- [Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec)
- [Kiro](https://kiro.dev/blog/kiro-and-the-future-of-software-development/)
- [Aider](https://github.com/Aider-AI/aider)
