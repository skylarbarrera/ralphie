# V2 Runner Wiring

Goal: Wire the V2 spec system (parser, budget calculator, locator) into the actual runner so `ralphie run` uses task IDs, Status fields, budgets, and Verify commands.

## Context

The V2 spec infrastructure exists:
- `spec-parser-v2.ts` parses T001/Status/Size/Verify ✓
- `budget-calculator.ts` calculates task selection ✓
- `spec-locator.ts` finds `specs/active/` ✓
- `normalizeSpec()` handles format variations ✓
- Prompts reference V2 format (task IDs, Status fields) ✓

But **NOT connected to the runner**:
- `--budget` flag is parsed but never used by `resolvePrompt()`
- `headless-runner.ts` uses V1 `isSpecComplete()` (checkbox-based)
- No dynamic prompt generation with selected tasks

**Design decisions:**
- Greedy mode + budget: Select tasks up to budget, complete as many as possible
- Standard mode + budget: Select tasks up to budget, complete ONE per iteration
- No backward compat needed: V1 specs error with migration message
- Completion = all tasks `passed` OR `failed` (failed stops retrying)

## Tasks

### T001: Add normalizeSpec function to parser
- Status: passed
- Size: S

**Deliverables:**
- `normalizeSpec(content)` function that normalizes format variations
- Handles `- Status:pending` → `- Status: pending` (spacing)
- Parser calls normalizeSpec before parsing

**Verify:** `npm test -- spec-parser-v2`

---

### T002: Update prompts for V2 format
- Status: passed
- Size: M

**Deliverables:**
- Prompts reference `specs/active/` not `SPEC.md`
- Prompts mention task IDs (T001, T002)
- Prompts instruct to update `Status: pending` → `Status: passed`

**Verify:** `npm test -- cli`

---

### T003: Create dynamic prompt generator
- Status: passed
- Size: L

**Deliverables:**
- Create `generateTaskContext(specPath, budget)` function in `src/lib/prompt-generator.ts`
- Uses `parseSpecV2()` to read spec
- Uses `calculateBudget()` to select tasks
- Returns formatted task list: `"Selected tasks (4 points): T001(S): Title, T003(M): Title"`
- Include Verify commands for each task
- Handle errors gracefully: return empty string if spec parsing fails

**Error handling:**
- `parseSpecV2()` throws → log warning, return empty task context
- `calculateBudget()` returns 0 tasks → return `"Warning: No tasks fit in budget {n}"`
- specPath undefined → return empty task context

**Verify:** `npm test tests/lib/prompt-generator.test.ts`

---

### T004: Add V2 isSpecComplete to spec-parser-v2
- Status: passed
- Size: S

**Deliverables:**
- Add `isSpecCompleteV2(specPath)` to `spec-parser-v2.ts`
- Returns true when all tasks are `Status: passed` OR `Status: failed`
- Returns false if any task is `Status: pending` or `Status: in_progress`
- Add `getProgressV2(specPath)` returning `{ completed, total, percentage }`

**Verify:** `npm test -- spec-parser-v2`

---

### T005: Wire spec locator into runner
- Status: passed
- Size: S

**Deliverables:**
- `validateProject()` uses `locateActiveSpec()`
- Clear error message if V1 `SPEC.md` found
- Clear error message if no spec found

**Verify:** `ralphie run --help` shows no errors

---

### T006: Integrate prompt generator into resolvePrompt
- Status: passed
- Size: M

**Deliverables:**
- Modify `resolvePrompt(options, specPath?)` signature in `cli.tsx`
- Call `generateTaskContext(specPath, options.budget)` when specPath provided
- Append task context to base prompt
- Pass `validation.specPath` at call sites (executeRun line ~187, executeHeadlessRun line ~225)
- Handle budget=undefined → default to 4
- Handle specPath=undefined → return base prompt (backward compat)

**Verify:** `npm test -- cli` and manual test `ralphie run --budget 2`

---

### T007: Update headless-runner for V2 completion
- Status: passed
- Size: M

**Deliverables:**
- Replace import: `isSpecComplete` from `spec-parser.js` → `isSpecCompleteV2` from `spec-parser-v2.js`
- Update completion check at line ~272
- Stuck detection uses V2 progress check
- `--all` mode terminates when all tasks passed/failed

**Verify:** `npm test -- headless-runner`

---

### T008: Add unit tests for prompt generator
- Status: passed
- Size: M

**Deliverables:**
- Test: `generateTaskContext()` with valid spec returns task list
- Test: `generateTaskContext()` with budget=2 selects only S tasks
- Test: `generateTaskContext()` with invalid spec returns empty string
- Test: `generateTaskContext()` with no pending tasks returns completion message
- Test: `resolvePrompt()` with specPath includes task context

**Verify:** `npm test tests/lib/prompt-generator.test.ts tests/cli.test.tsx`

---

### T009: Add integration test for full V2 flow
- Status: passed
- Size: M

**Deliverables:**
- Test creates V2 spec in specs/active/
- Test runs `ralphie run --headless` (mocked harness)
- Test verifies prompt includes selected task IDs
- Test verifies completion detected via Status fields

**Verify:** `npm test tests/commands/run.test.ts`

---

### T010: Update documentation
- Status: passed
- Size: S

**Deliverables:**
- Update `docs/cli.md` with `--budget` flag explanation
- Document greedy + budget interaction
- Add budget workflow example

**Verify:** `grep "budget" docs/cli.md` shows documentation

---

## Acceptance Criteria

- WHEN `ralphie run` executes, THEN it reads spec from `specs/active/`
- WHEN `--budget 2` is specified, THEN only S-sized tasks appear in prompt
- WHEN `--budget 8` is specified, THEN multiple tasks (S+M+L) appear in prompt
- WHEN no budget specified, THEN default budget 4 is used
- WHEN `--greedy --budget 6` is used, THEN prompt mentions completing multiple tasks
- WHEN task Status changes to passed/failed, THEN runner detects progress
- WHEN all tasks are passed or failed, THEN runner stops with success
- WHEN V1 `SPEC.md` exists at root, THEN runner errors with migration message
- WHEN spec parsing fails, THEN graceful fallback to base prompt

## Notes

### Size Point Summary
- S tasks: T001✓, T004, T005✓, T010 (4 points, 2 done)
- M tasks: T002✓, T006, T007, T008, T009 (10 points, 1 done)
- L tasks: T003 (4 points)
- **Remaining: 14 points (~4 iterations at budget 4)**

### File Changes

| File | Tasks |
|------|-------|
| `src/lib/prompt-generator.ts` | T003 (new file) |
| `src/lib/spec-parser-v2.ts` | T004 |
| `src/cli.tsx` | T006 |
| `src/lib/headless-runner.ts` | T007 |
| `tests/lib/prompt-generator.test.ts` | T008 (new file) |
| `tests/cli.test.tsx` | T008 |
| `tests/commands/run.test.ts` | T009 |
| `docs/cli.md` | T010 |

### Implementation Order
1. T004 (S) - Add isSpecCompleteV2 (foundation)
2. T003 (L) - Create prompt generator (core logic)
3. T006 (M) - Wire into resolvePrompt (integration)
4. T007 (M) - Update headless-runner (completion detection)
5. T008 (M) - Unit tests
6. T009 (M) - Integration tests
7. T010 (S) - Documentation
