# Architecture

How Ralphie works under the hood.

## The Loop

```
┌─────────────────────────────────────────────────┐
│  You: /ralphie-spec "my idea"                   │
│       ↓                                         │
│  AI interviews → generates spec in specs/active │
│       ↓                                         │
│  You: ralphie run --all                         │
│       ↓                                         │
│  ┌──────────────────────────────────────────┐   │
│  │  Loop:                                   │   │
│  │    1. Read spec from specs/active/       │   │
│  │    2. Pick next pending task             │   │
│  │    3. Implement + test                   │   │
│  │    4. Update status to passed/failed     │   │
│  │    5. Commit                             │   │
│  │    6. Exit (fresh restart)               │   │
│  └──────────────────────────────────────────┘   │
│       ↓                                         │
│  Done: working code in git history              │
└─────────────────────────────────────────────────┘
```

## Why It Works

**Progress lives in git, not the LLM's context.**

Each iteration starts fresh—no accumulated confusion. The AI can fail, hallucinate, or get stuck. Doesn't matter. Next iteration reads committed state and continues.

This is the [Ralph Wiggum technique](https://github.com/ghuntley/how-to-ralph-wiggum): iteration beats perfection.

## Project Structure

After `ralphie init`:

```
your-project/
├── specs/
│   ├── active/          # Current specs
│   │   └── my-feature.md
│   └── completed/       # Archived specs
├── STATE.txt            # Progress log
└── .claude/
    └── ralphie.md       # Coding standards
```

| File | Purpose |
|------|---------|
| `specs/active/*.md` | Tasks with IDs (T001, T002). Status transitions tracked. |
| `specs/completed/` | Archived specs after completion. |
| `STATE.txt` | What's done, what failed, context for next iteration. |

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
