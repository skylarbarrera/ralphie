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
Create state machine to track iteration state, phases, active tools, and statistics.

## Files
- src/lib/state-machine.ts - State machine implementation
- tests/state-machine.test.ts - Unit tests

## Tests
- Initial state is correct (idle phase, zero counters)
- Phase transitions work (idle → reading → editing → running → done)
- Tool tracking: start tool increments pending, end tool decrements and increments stats
- Tool coalescing: multiple reads tracked as group
- Elapsed time tracking per tool and per iteration
- Reset clears all state

## Exit Criteria
- State machine correctly tracks all phases and tool states
- Coalesces spammy tool sequences (20 reads → count)
- Tests pass with 80%+ coverage
- No TypeScript errors
- Changes committed
