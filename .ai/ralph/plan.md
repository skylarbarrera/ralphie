# Current Task Plan

This file is overwritten at the start of each iteration.

**Purpose:** Define scope BEFORE implementation to prevent scope creep.

**Format:**
```markdown
## Goal
Clear one-sentence description of what this iteration will accomplish.

## Files
- file/path.ts - what will change
- test/file.test.ts - tests to write

## Tests
- Test description 1
- Test description 2
(or "none" if no tests needed)

## Exit Criteria
What defines "done" for this task? Be specific.
```

---

## Goal
Create the JSONL stream parser that parses newline-delimited JSON from Claude's stdout and emits typed events.

## Files
- src/lib/types.ts - shared TypeScript types for parser events and Claude messages
- src/lib/stream-parser.ts - main parser with EventEmitter for typed events
- tests/stream-parser.test.ts - unit tests for parser

## Tests
- Parse valid JSONL lines and emit correct events
- Handle system, assistant, user, result envelope types
- Extract tool_use and tool_result content blocks
- Correlate tool_result.tool_use_id with tool_use.id
- Emit init event on system message
- Emit tool_start/tool_end events for tool lifecycle
- Emit text event for assistant text content
- Emit result event on result envelope
- Safely ignore non-JSON lines (no crash)
- Handle malformed JSON gracefully

## Exit Criteria
- Parser correctly emits init, tool_start, tool_end, text, result events
- All tests pass with 80%+ coverage
- No TypeScript errors
- Changes committed
