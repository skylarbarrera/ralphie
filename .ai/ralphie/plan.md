# Plan: T005 - Add learnings search to iteration loop

## Goal
Add learnings search functionality that finds and injects relevant learnings into the iteration prompt before AI execution.

## Task ID
T005

## Files to Create/Modify
- **Create:**
  - `src/lib/learnings-search.ts` - Core search functionality
  - `tests/lib/learnings-search.test.ts` - Unit tests for search

- **Modify:**
  - `src/lib/prompts.ts` - Add learnings injection to iteration prompt
  - `src/lib/headless-runner.ts` - Inject learnings before harness.run()
  - `src/commands/run-interactive.tsx` - Inject learnings before Ink render

## Tests
- Unit tests for learnings search:
  - `searchLearnings()` finds matches by keywords
  - Search order: project learnings first, then global learnings
  - Tag matching on YAML frontmatter
  - Empty results when no matches
  - Deduplication of global/local learnings
- Integration tests:
  - Learnings injected into prompt with correct format
  - Both project and global learnings included
  - Handles missing learnings directories gracefully

## Exit Criteria
1. ✅ `searchLearnings()` function searches both locations in correct order
2. ✅ YAML frontmatter parsing extracts tags, problem, solution
3. ✅ Keyword matching on task title/deliverables
4. ✅ Relevant learnings formatted and injected into iteration prompt
5. ✅ All tests pass (`npm test`)
6. ✅ Type check passes (`npm run type-check`)
7. ✅ Verify command passes: Manual test shows learnings in prompt when matches exist

## Implementation Notes

### Learnings File Format (from spec)
```yaml
---
problem: Description of the problem encountered
symptoms: What the error looked like
root-cause: Why it happened
solution: How it was fixed
prevention: How to avoid in future
tags: [build-errors, typescript, webpack]
---

Additional notes...
```

### Search Strategy
1. Extract keywords from: task title, task deliverables
2. Search project learnings (`.ralphie/learnings/**/*.md`)
3. Search global learnings (`~/.ralphie/learnings/**/*.md`)
4. Match on: tags, problem field, root-cause field
5. Return matched learnings with metadata

### Injection Format
Add to iteration prompt before the task details:
```
## Relevant Learnings

The following learnings from past iterations may help with this task:

### [Learning Title from filename]
- **Problem:** [problem field]
- **Solution:** [solution field]
- **Prevention:** [prevention field]
- **Tags:** [tags array]

[Repeat for each relevant learning]
```
