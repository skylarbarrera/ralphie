## Goal
Add ActivityItem type and activity log tracking to support rolling activity feed display.

## Files
- src/lib/types.ts - add ActivityItem type
- src/lib/state-machine.ts - add activityLog, lastCommit to IterationState, output to CompletedTool, addActivityItem helper
- tests/state-machine.test.ts - add tests for activity log updates

## Tests
- ActivityItem type is exported correctly
- activityLog starts empty in IterationState
- handleText adds thought to activity log
- handleToolStart adds tool_start to activity log
- handleToolEnd adds tool_complete to activity log
- Activity log capped at 50 items
- lastCommit starts null in IterationState

## Exit Criteria
- ActivityItem type defined with thought, tool_start, tool_complete, commit variants
- CompletedTool has output?: string field
- IterationState has activityLog: ActivityItem[] and lastCommit fields
- addActivityItem helper caps at 50 items
- handleText, handleToolStart, handleToolEnd add items to activity log
- All existing tests still pass
- New tests pass
