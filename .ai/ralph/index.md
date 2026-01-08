# Ralph Memory Index

Commit-anchored memory log. Each entry summarizes one completed task.

**Format:** One entry per commit, keyed by SHA (5-7 lines max)

**Rules:**
- Only append after successful commits
- Keep summaries concise
- List actual files changed, not planned files
- Include test count if tests were written
- "next:" hints at logical follow-up task

---

<!-- Entries append below this line -->

## ca9595d — Add JSONL stream parser for Claude output
- files: src/lib/types.ts, src/lib/stream-parser.ts, tests/stream-parser.test.ts
- tests: 25 passing (95% coverage)
- notes: EventEmitter-based parser handles all envelope types, correlates tool_use/tool_result
- next: Create state machine to track iteration state

## 39c2e45 — Add state machine for iteration tracking
- files: src/lib/state-machine.ts, tests/state-machine.test.ts
- tests: 41 passing (97% coverage)
- notes: Tracks phases, tool categories, coalesces tool groups, generates display summaries
- next: Create tool-categories.ts for configurable tool mapping

## 802598d — Add tool-categories module for configurable tool mapping
- files: src/lib/tool-categories.ts, tests/tool-categories.test.ts, src/lib/state-machine.ts
- tests: 30 passing (100% coverage)
- notes: Icons (◐✎⚡○✓✗), verbs, display helpers; refactored state-machine to use module
- next: Create JSONL logger for raw output tee to disk

## e14a41b — Add JSONL logger for raw output tee to disk
- files: src/lib/logger.ts, tests/logger.test.ts
- tests: 18 passing (100% coverage)
- notes: Creates ./runs/{ISO-timestamp}.jsonl files, auto-creates directory, handles objects and raw lines
- next: Create Ink components for terminal UI

## 3397c6f — Add IterationHeader Ink component
- files: src/components/IterationHeader.tsx, tests/IterationHeader.test.tsx
- tests: 13 passing
- notes: First UI component; displays `┌─ Iteration 1/10 ──── 0:42 elapsed`; formatElapsedTime helper
- next: Create TaskTitle.tsx component

## 95171c4 — Add TaskTitle Ink component
- files: src/components/TaskTitle.tsx, tests/TaskTitle.test.tsx
- tests: 16 passing
- notes: Displays `│ ▶ "First assistant text..."` with truncation support
- next: Create ToolItem.tsx component

## 8455922 — Add ToolItem Ink component
- files: src/components/ToolItem.tsx, tests/ToolItem.test.tsx
- tests: 18 passing
- notes: Displays single tool with spinner/checkmark/error icon, category verb, and duration
- next: Create ToolList.tsx component
