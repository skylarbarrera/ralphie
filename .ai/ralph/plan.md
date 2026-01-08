## Goal
Create usePulse React hook for pulsing animations in the terminal UI.

## Files
- src/hooks/usePulse.ts - new hook that toggles a boolean on an interval
- tests/usePulse.test.ts - unit tests for the hook

## Tests
- Returns pulse boolean that toggles on interval
- Default interval is configurable (e.g., 500ms)
- Cleans up interval on unmount
- Can be started/stopped via enabled option
- Immediate initial state (no delay before first pulse)

## Exit Criteria
- Hook works with default interval
- Hook accepts custom interval
- Hook accepts enabled flag to pause/resume
- Tests pass with 100% coverage
- Changes committed
