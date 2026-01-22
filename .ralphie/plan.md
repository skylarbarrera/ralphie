# Plan: T006 - Add performance awareness to implementation

**Goal:** Add performance guidance to iteration prompt to avoid common performance issues

**Task ID:** T006

**Files to modify:**
- `src/lib/prompts.ts` - Add performance section to both prompts

**Tests:**
- Verify performance section exists in prompts
- Check performance-oracle agent exists and is integrated
- Verify guidance covers N+1 queries, data structures, memory usage, indexes

**Exit criteria:**
- Iteration prompt includes performance guidelines
- Performance guidance is practical and non-premature
- Task status updated to `passed`
- Changes committed
