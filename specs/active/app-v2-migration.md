# App.tsx V2 Migration

Goal: Migrate the interactive UI (App.tsx and IterationRunner) from V1 spec-parser to V2 spec system so `ralphie run` (non-headless) works with task IDs, Status fields, and the V2 format.

## Context

The headless runner is already V2-ready (from v2-runner-wiring spec). But the interactive UI still uses V1:

**Current V1 imports in App.tsx:**
```typescript
import { loadSpecFromDir, getTaskForIteration, isSpecComplete, type SpecStructure } from './lib/spec-parser.js';
```

**V2 equivalents exist:**
- `loadSpecFromDir()` → `parseSpecV2(specPath)` + `locateActiveSpec(cwd)`
- `getTaskForIteration(spec, n)` → needs new function (V2 tracks by task ID, not iteration)
- `isSpecComplete(specPath)` → `isSpecCompleteV2(specPath)`
- `SpecStructure` → `SpecV2`

**Key difference:** V1 maps iteration number → task. V2 uses task IDs and status. Need to create a bridge function that gets the Nth pending/in_progress task.

**Design decisions:**
- Create `getTaskForIterationV2(spec, iteration)` that returns the Nth pending task
- This maintains backwards compatibility with IterationRunner's iteration-based model
- Fall back gracefully if legacy format detected (log warning, but still run)

## Tasks

### T001: Create getTaskForIterationV2 function
- Status: passed
- Size: M

**Deliverables:**
- Add `getTaskForIterationV2(spec: SpecV2, iteration: number)` to `spec-parser-v2.ts`
- Returns `{ taskNumber: string, phaseName: string | null, taskText: string }` matching V1 return type
- `taskNumber` = task ID (e.g., "T001")
- `phaseName` = null (V2 doesn't have phases, reserved for future)
- `taskText` = task title + deliverables summary
- Returns first pending/in_progress task, ignoring iteration number (V2 tasks are ordered)
- Returns null if no pending tasks

**Verify:** `npm test -- spec-parser-v2`

---

### T002: Add spec-parser-v2 unit tests for getTaskForIterationV2
- Status: passed
- Size: S

**Deliverables:**
- Test: Returns first pending task when iteration=1
- Test: Returns first pending task when iteration=2 (same result, V2 ignores iteration)
- Test: Returns null when all tasks are passed/failed
- Test: Returns in_progress task if one exists
- Test: taskText includes title and first deliverable

**Verify:** `npm test tests/spec-parser-v2.test.ts`

---

### T003: Update App.tsx imports
- Status: passed
- Size: S

**Deliverables:**
- Change import from `spec-parser.js` to `spec-parser-v2.js`
- Import: `parseSpecV2`, `getTaskForIterationV2`, `isSpecCompleteV2`, `type SpecV2`, `type ParseResult`
- Add import for `locateActiveSpec` from `spec-locator.js`
- Remove old imports: `loadSpecFromDir`, `getTaskForIteration`, `isSpecComplete`, `SpecStructure`

**Verify:** `npm run type-check`

---

### T004: Update IterationRunner spec loading
- Status: passed
- Size: M

**Deliverables:**
- Replace `loadSpecFromDir(targetDir)` with `locateActiveSpec(cwd)` + `parseSpecV2()`
- Store `ParseResult` (which can be `SpecV2 | LegacySpecWarning`)
- Handle `LegacySpecWarning`: log warning, set spec to null (runs without task context)
- Update `useEffect` to use `locateActiveSpec` for spec path resolution
- Update completion check from `isSpecComplete(specPath)` to `isSpecCompleteV2(specPath)`

**Verify:** `npm run type-check`

---

### T005: Update IterationRunner task retrieval
- Status: pending
- Size: M

**Deliverables:**
- Replace `getTaskForIteration(spec, currentIteration)` with `getTaskForIterationV2(spec, currentIteration)`
- Handle null spec case (when legacy format or no spec)
- Update type from `SpecStructure | null` to `SpecV2 | null`
- Ensure `currentTask?.taskNumber`, `currentTask?.phaseName`, `currentTask?.taskText` still work

**Verify:** `npm run type-check`

---

### T006: Handle legacy spec gracefully
- Status: pending
- Size: S

**Deliverables:**
- When `parseSpecV2()` returns `LegacySpecWarning`, log warning to console
- Continue running without task context (prompt-only mode)
- Don't crash the interactive UI
- Show warning in status bar or header: "Legacy SPEC format - upgrade recommended"

**Verify:** Manual test with V1 spec

---

### T007: Add integration tests for IterationRunner V2
- Status: pending
- Size: M

**Deliverables:**
- Test: IterationRunner loads V2 spec from specs/active/
- Test: Task info displays correct task ID (T001, T002, etc.)
- Test: Completion detected when all tasks passed/failed
- Test: Legacy spec shows warning but doesn't crash
- Mock harness stream to avoid real Claude calls

**Verify:** `npm test tests/App.test.tsx` (or new test file)

---

### T008: Manual E2E testing
- Status: pending
- Size: S

**Deliverables:**
- Create test V2 spec in specs/active/test-migration.md
- Run `ralphie run` (interactive mode)
- Verify task ID shows in UI header
- Verify completion is detected when task status changes
- Clean up test spec after

**Verify:** Manual verification, delete test spec

---

## Acceptance Criteria

- WHEN `ralphie run` starts (interactive), THEN it reads spec from `specs/active/`
- WHEN running with V2 spec, THEN task ID (T001) shows in iteration header
- WHEN task Status changes to passed, THEN runner detects progress
- WHEN all tasks are passed/failed, THEN runner completes
- WHEN legacy V1 spec exists, THEN warning is shown but UI doesn't crash
- WHEN no spec exists, THEN runs with prompt-only (no task context)
- Type check passes: `npm run type-check`
- All tests pass: `npm test`

## Notes

### Size Point Summary
- S tasks: T002, T003, T006, T008 (4 points)
- M tasks: T001, T004, T005, T007 (8 points)
- **Total: 12 points (~3 iterations at budget 4)**

### File Changes

| File | Tasks |
|------|-------|
| `src/lib/spec-parser-v2.ts` | T001 |
| `tests/spec-parser-v2.test.ts` | T002 |
| `src/App.tsx` | T003, T004, T005, T006 |
| `tests/App.test.tsx` | T007 (new or existing) |

### Implementation Order
1. T001 (M) - Create getTaskForIterationV2 (foundation)
2. T002 (S) - Unit tests for new function
3. T003 (S) - Update imports (prep work)
4. T004 (M) - Update spec loading
5. T005 (M) - Update task retrieval
6. T006 (S) - Handle legacy gracefully
7. T007 (M) - Integration tests
8. T008 (S) - Manual E2E testing

### Dependencies
- Depends on completed v2-runner-wiring spec
- Uses existing `spec-parser-v2.ts`, `spec-locator.ts`
- Uses existing `prompt-generator.ts` (from v2-runner-wiring)
