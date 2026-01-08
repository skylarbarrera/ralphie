# Ralph Runner - Product Requirements Document

Build a TypeScript CLI that wraps `claude` to provide Claude Code-style terminal output with real-time progress updates.

## Project Goals
- Replace `afk-ralph.sh` with a polished TypeScript CLI
- Parse Claude's stream-json JSONL output in real-time
- Display clean, stateful progress updates like interactive Claude Code
- Use Ink (React for CLIs) for rich terminal UI

## Technical Requirements
- TypeScript with tsx runner
- Ink 4.x for terminal UI
- ink-spinner for animated spinners
- commander for CLI arg parsing
- No external runtime dependencies beyond Node.js 18+

## Dependencies
```json
{
  "dependencies": {
    "ink": "^4.4.1",
    "ink-spinner": "^5.0.0",
    "react": "^18.2.0",
    "commander": "^11.1.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0"
  }
}
```

## Features

### Core - JSONL Stream Parser
- [x] Create `src/lib/stream-parser.ts` - Parse newline-delimited JSON from claude stdout
- [x] Handle envelope types: `system`, `assistant`, `user`, `result`
- [x] Extract content blocks from `message.content[]`: `tool_use`, `tool_result`, `text`
- [x] Correlate `tool_result.tool_use_id` with `tool_use.id`
- [x] Emit typed events: `init`, `tool_start`, `tool_end`, `text`, `result`
- [x] Safely ignore non-JSON lines (try/catch per line)

### Core - State Machine
- [x] Create `src/lib/state-machine.ts` - Track iteration state
- [x] Track: currentIteration, totalIterations, phase, activeTool, pendingTools, stats
- [x] Phases: `idle`, `reading`, `editing`, `running`, `done`
- [x] Coalesce spammy tool sequences (20 reads → "Reading 20 files...")
- [x] Compute elapsed time per tool and per iteration

### Core - Tool Categories
- [x] Create `src/lib/tool-categories.ts` - Configurable tool mapping
- [x] Categories: read (Read, Grep, Glob), write (Edit, Write), command (Bash), meta (TodoWrite, Task)
- [x] Icons: ◐ read, ✎ write, ⚡ command, ○ meta, ✓ done, ✗ error

### Core - JSONL Logger
- [x] Create `src/lib/logger.ts` - Tee raw JSONL to disk
- [x] Write to `./runs/{ISO-timestamp}.jsonl`
- [x] Create runs directory if needed

### Ink Components
- [x] Create `src/components/IterationHeader.tsx` - `┌─ Iteration 1/10 ──── 0:42 elapsed`
- [x] Create `src/components/TaskTitle.tsx` - `▶ "First assistant text chunk..."`
- [x] Create `src/components/ToolItem.tsx` - Single tool with spinner/checkmark + duration
- [x] Create `src/components/ToolList.tsx` - Coalesced list, shows active + completed tools
- [x] Create `src/components/StatusBar.tsx` - Bottom status with phase

### React Hook
- [x] Create `src/hooks/useClaudeStream.ts` - Custom hook for claude process
- [x] Spawn claude with `--dangerously-skip-permissions --output-format stream-json -p`
- [x] Parse JSONL stream, update state
- [x] Handle idle timeout (kill process if no stdout for N seconds)
- [x] Return: `{ tools, activeTool, phase, taskText, stats, error }`

### Main App
- [x] Create `src/App.tsx` - Main Ink component
- [x] Compose: IterationHeader, TaskTitle, ToolList, StatusBar
- [x] Handle iteration loop (run N iterations)
- [x] Display final summary after all iterations

### CLI Entry Point
- [x] Create `src/cli.tsx` - Entry with commander
- [x] Options: `-n/--iterations`, `-p/--prompt`, `--prompt-file`, `--cwd`, `--timeout-idle`, `--save-jsonl`, `--quiet`, `--title`
- [x] Default prompt: the Ralph loop instructions
- [x] Render Ink App, handle graceful shutdown (Ctrl+C)

### Build & Config
- [x] Update `package.json` - Add deps and script: `"ralph": "tsx src/cli.tsx"`
- [x] Update `tsconfig.json` - Add `"jsx": "react-jsx"`, `"module": "ESNext"`

### Testing
- [x] Test stream-parser with sample JSONL
- [x] Test state-machine transitions
- [x] Run actual claude iteration and verify output

## CLI Interface

```bash
npm run ralph -- -n 5

# Or with options:
npm run ralph -- \
  -n 10 \
  --prompt-file ./my-prompt.txt \
  --cwd /path/to/repo \
  --timeout-idle 120 \
  --save-jsonl ./debug.jsonl \
  --quiet
```

## Display Example

```
┌─ Iteration 1/10 ──────────────────── 0:42 elapsed
│
│ ▶ "Implementing JWT authentication for the API..."
│
│ ◐ Reading (PRD.md, progress.txt, index.md)
│ ✓ Read 3 files (0.8s)
│
│ ✎ Editing (src/auth.ts, src/middleware.ts)
│ ✓ Edited 2 files (1.2s)
│
│ ⚡ Running (npm test)
│ ✓ Command completed (4.1s)
│
│ ✓ Committed: a1b2c3d - feat(auth): add JWT authentication
│
└─ Done (2m14s) ─────────────────────────────────────
```

## Edge Cases
- Missing `result` event: Kill after idle timeout, mark as failed
- Non-JSON lines: Silently ignore
- Partial messages: Ignore incomplete chunks
- Task detection: Show first text chunk trimmed, or use `--title`

## Success Criteria
- Clean, Claude Code-like terminal output
- Real-time progress updates as tools execute
- Coalesced tool displays (not spammy)
- Works reliably for 10+ iteration loops
- JSONL logging works for debugging
