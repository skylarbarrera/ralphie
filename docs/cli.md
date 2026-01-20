# CLI Reference

Complete reference for all Ralphie commands and options.

## Commands

### `ralphie run`

Execute iteration loops against your spec.

```bash
ralphie run              # Run one iteration
ralphie run -n 5         # Run 5 iterations
ralphie run --all        # Run until spec complete (max 100)
ralphie run --greedy     # Complete multiple tasks per iteration
```

#### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-n, --iterations <n>` | Number of iterations to run | 1 |
| `-a, --all` | Run until spec complete (max 100 iterations) | false |
| `-g, --greedy` | Complete multiple tasks per iteration | false |
| `-p, --prompt <text>` | Custom prompt to send to the AI | - |
| `--prompt-file <path>` | Read prompt from file | - |
| `--cwd <path>` | Working directory | current |
| `--timeout-idle <sec>` | Kill after N seconds idle | 120 |
| `--save-jsonl <path>` | Save raw output to JSONL file | - |
| `--no-branch` | Skip feature branch creation | false |
| `--headless` | Output JSON events instead of UI | false |
| `--stuck-threshold <n>` | Iterations without progress before stuck | 3 |
| `--harness <name>` | AI harness to use: `claude`, `codex`, `opencode` | claude |
| `-b, --budget <points>` | Task selection budget (see Budget System) | 4 |

### `ralphie spec`

Generate a spec autonomously from a project description.

```bash
ralphie spec "Build a REST API"           # Autonomous spec generation
ralphie spec --headless "Blog platform"   # JSON output for automation
```

Creates spec in `specs/active/` using V2 format.

#### Options

| Option | Description |
|--------|-------------|
| `--headless` | Output JSON events, great for automation |
| `--timeout <seconds>` | Timeout for generation (default: 300) |
| `-m, --model <name>` | Claude model to use (sonnet, opus, haiku) |
| `--harness <name>` | AI harness to use: claude, codex, opencode (default: claude) |

### `ralphie init`

Initialize Ralphie in an existing project.

```bash
cd your-project
ralphie init
```

Creates:
- `specs/active/` - Directory for spec files
- `specs/completed/` - Archive for completed specs
- `.claude/ralphie.md` - Coding standards
- `STATE.txt` - Progress log

### `ralphie validate`

Check project structure and spec format.

```bash
ralphie validate
```

Validates:
- Required files exist
- Spec follows V2 conventions (task IDs, status, size)
- Project structure is correct

### `ralphie status`

Show progress of the active spec.

```bash
ralphie status
```

### `ralphie spec-list`

List active and completed specs.

```bash
ralphie spec-list
```

### `ralphie archive`

Move completed spec to `specs/completed/`.

```bash
ralphie archive
```

## Greedy Mode

By default, Ralphie follows classic Ralph Wiggum: **one task per iteration**, fresh context each time.

With `--greedy`, Ralphie completes **as many tasks as possible** before context fills up:

```bash
ralphie run --greedy -n 5      # Each iteration does multiple tasks
ralphie run --greedy --all     # Maximum throughput
```

### Tradeoffs

| Aspect | Default (one task) | Greedy (many tasks) |
|--------|-------------------|---------------------|
| Throughput | Slower (overhead per task) | Faster (overhead only at start) |
| Progress visibility | Frequent signals | Batched - wait longer, see more |
| Stuck detection | Precise (clean boundaries) | Less precise (may timeout mid-task) |
| Context | Fresh start each task | Accumulates |
| Error recovery | Clean restart on failure | Errors may cascade |

**Use greedy for:** Related tasks, scaffolding, bulk refactoring, maximum speed.

**Use default for:** Unrelated tasks, complex features, debugging, precise tracking.

## Budget System

The budget system controls how many tasks are selected per iteration based on task size.

### Task Sizes

Specs use the V2 format with task IDs and sizes:

```markdown
### T001: Setup database
- Status: pending
- Size: S

### T002: Implement API
- Status: pending
- Size: M
```

Size point values:
- **S (Small)**: 1 point - Simple tasks, quick fixes
- **M (Medium)**: 2 points - Standard features
- **L (Large)**: 4 points - Complex implementations

### Budget Selection

```bash
ralphie run --budget 2     # Select only S-sized tasks (1+1 = 2 points max)
ralphie run --budget 4     # S+M or single L task (default)
ralphie run --budget 8     # Multiple tasks (S+M+L, M+M+M+M, etc.)
```

The budget calculator selects pending tasks in order until the budget is exhausted.

### Budget + Greedy Interaction

| Mode | Behavior |
|------|----------|
| Default (`-b 4`) | Select tasks up to 4 points, complete **one** per iteration |
| Greedy (`--greedy -b 4`) | Select tasks up to 4 points, complete **all selected** per iteration |
| Greedy large (`--greedy -b 8`) | Select more tasks, complete all in one iteration |

```bash
# Complete one small task per iteration
ralphie run --budget 1 -n 5

# Complete multiple tasks per iteration (max 6 points worth)
ralphie run --greedy --budget 6 -n 3

# Maximum throughput - large budget, greedy mode
ralphie run --greedy --budget 10 --all
```

### Task Status Flow

```
pending → in_progress → passed|failed
```

When all tasks are `passed` or `failed`, the spec is complete and the runner exits with code 0.

## Headless Mode

For automation and CI/CD integration:

```bash
ralphie run --headless -n 10
```

Outputs JSON events to stdout:

```json
{"event":"started","spec":"my-feature.md","tasks":5,"timestamp":"2024-01-15T10:30:00Z"}
{"event":"iteration","n":1,"phase":"starting"}
{"event":"tool","type":"read","path":"src/index.ts"}
{"event":"tool","type":"write","path":"src/utils.ts"}
{"event":"commit","hash":"abc1234","message":"Add utility functions"}
{"event":"task_complete","id":"T001","title":"Set up project structure"}
{"event":"iteration_done","n":1,"duration_ms":45000}
{"event":"complete","tasks_done":5,"total_duration_ms":180000}
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All tasks complete |
| 1 | Stuck (no progress after threshold) |
| 2 | Max iterations reached |
| 3 | Fatal error |

### End-to-End Automation

```bash
# Generate spec and run to completion
ralphie spec --headless "my project" && ralphie run --headless --all
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `RALPH_HARNESS` | Default harness (claude, codex, opencode) |
| `ANTHROPIC_API_KEY` | API key for Claude harness |
| `OPENAI_API_KEY` | API key for Codex harness |

## Configuration File

Create `.ralphie/config.yml` for persistent settings:

```yaml
harness: codex
```

Configuration priority:
1. CLI flags
2. Environment variables
3. Config file
4. Defaults
