## Goal
Create useClaudeStream React hook to spawn claude process and parse JSONL stream.

## Files
- src/hooks/useClaudeStream.ts - Custom hook for claude process management
- tests/useClaudeStream.test.tsx - Unit tests for the hook

## Tests
- Returns initial state with empty values and idle phase
- Updates state when tool_start event received
- Updates state when tool_end event received
- Updates taskText from first text event
- Handles result event and sets phase to done
- Handles idle timeout and kills process
- Cleans up process on unmount
- Handles process errors gracefully

## Exit Criteria
- Hook spawns claude with correct flags
- Parses JSONL stream using existing StreamParser
- Updates StateMachine and returns reactive state
- Idle timeout kills process after N seconds of no output
- Tests pass with 80%+ coverage
- Changes committed
