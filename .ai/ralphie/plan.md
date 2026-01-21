# Plan: T007 - Integrate orchestration into CLI commands

## Goal
Wire together all compound engineering components into CLI for 80/20 workflow

## Task ID
T007

## Files
- `src/lib/spec-generator.ts` - Already has research + analysis integration (verify completeness)
- `src/commands/run-interactive.tsx` - Review integration already added (verify)
- `src/lib/headless-runner.ts` - Review integration already added (verify)
- `README.md` - Add 80/20 workflow documentation and Compound attribution
- `.ralphie/specs/active/compound-learnings.md` - Update task status

## Tests
- All existing tests (760 tests should pass)
- Manual verification of CLI flags and flows

## Exit Criteria
1. ✅ `generateSpec()` orchestrates: research → spec gen → analysis (verify already done in T002, T003)
2. ✅ `executeRun()` orchestrates: learnings search → inject into prompt → run (verify already done in T005)
3. ✅ `executeRun()` with `--review` flag: run reviewers → check P1 → iteration (verify already done in T006)
4. ✅ P1 findings block without `--force` flag (verify already done in T006)
5. ✅ Task status tracking across iterations for learnings capture (verify already done in T004)
6. ✅ README updated with 80/20 workflow and Compound attribution
7. ✅ All tests pass (760 passing)
8. ✅ Task marked as passed in spec

## Notes
Most of the integration work was already completed in previous tasks:
- T002: Research orchestration in spec-generator.ts
- T003: Analysis orchestration in spec-generator.ts
- T004: Learnings capture orchestration in headless-runner.ts
- T005: Learnings search orchestration in prompts.ts + headless-runner.ts + cli.tsx
- T006: Review orchestration in run-interactive.tsx + headless-runner.ts + cli.tsx

This task is primarily verification and documentation (README update with attribution).
