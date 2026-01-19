# Plan: T005 - Update IterationRunner task retrieval

## Goal
Update task retrieval to use V2 function in IterationRunner component

## Task ID
T005

## Files to Create/Modify
- None - work already completed in T001-T003

## Tests
- Type checking: `npm run type-check`

## Exit Criteria
- Replace getTaskForIteration with getTaskForIterationV2
- Handle null spec case (when legacy format or no spec)
- Update type from SpecStructure | null to SpecV2 | null
- Ensure currentTask?.taskNumber, currentTask?.phaseName, currentTask?.taskText still work
- Type check passes
