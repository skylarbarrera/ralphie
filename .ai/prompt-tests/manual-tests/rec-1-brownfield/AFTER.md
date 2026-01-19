# AFTER: Brownfield Test with Real Starter Codebase

**Test Date:** 2026-01-16
**Prompt:** "Add JWT authentication to the existing REST API with login, logout, and protected routes"
**Directory:** `/tmp/test-brownfield-after/` with starter Express API

## Starter Codebase Contents

```
src/
├── index.ts          # Express app with /api/users, /api/products, /health
├── routes/
│   ├── users.ts      # CRUD for users
│   └── products.ts   # CRUD for products
package.json          # Express, TypeScript, Vitest
tsconfig.json
README.md
```

## Execution Results

- Duration: ~4 minutes
- Validation: PASSED (0 violations)
- Task Count Detected: 3
- Review: FAILED (3 attempts, 1 concern each)

## Generated SPEC Analysis

### Major Improvements vs BEFORE

| Aspect | BEFORE (empty dir) | AFTER (starter codebase) |
|--------|-------------------|-------------------------|
| Recognized existing code | No (built from scratch) | Yes (references users.ts, products.ts) |
| Task count | 5 (security checklist) | 3 (though 12+ sub-checkboxes) |
| Follows existing patterns | N/A | Yes (ESM .js imports, vitest) |
| Appropriate scope | Built complete app | Adds auth to existing |
| File structure | All new | Extends src/auth/ alongside existing |

### What Went Well

1. **Analyzed existing codebase** - Noted ESM imports, vitest setup, existing routes
2. **Correct integration points** - Shows where to wire auth in index.ts
3. **Preserves existing routes** - Protects /api/users and /api/products
4. **Keeps health public** - Correctly notes /health stays unauthenticated
5. **4 clear phases** - Infrastructure → Protection → Logout → Tests
6. **Detailed verify sections** - Real curl commands with expected outputs
7. **Acceptance criteria** - Clear success definition

### Remaining Issues

1. **Still has code blocks in tasks** -
   - TypeScript interfaces inline
   - npm install commands as tasks
   - Full code examples in deliverables

2. **Task structure mixed** - Uses `- [ ]` but also has sub-bullets with code

3. **Review kept failing** - Same pattern as BEFORE

4. **Detection counted 3 tasks** - But there are actually 12+ checkboxes across phases

### Root Cause of Review Failure

The reviewer likely flagged code blocks outside Verify sections. Both BEFORE and AFTER have this issue - it's a prompt/skill problem, not a codebase context problem.

## Quality Assessment

| Aspect | BEFORE | AFTER | Delta |
|--------|--------|-------|-------|
| Usefulness | 8/10 | 9/10 | +1 |
| Format Compliance | 3/10 | 4/10 | +1 |
| Brownfield Appropriate | 2/10 | 8/10 | +6 |
| Verification | 7/10 | 8/10 | +1 |
| Follows Existing Patterns | 0/10 | 7/10 | +7 |

**Overall: +16 points improvement**

## Key Findings

### Recommendation 1 VALIDATED

Having a real starter codebase dramatically improves brownfield spec quality:
- LLM correctly extends existing code rather than rebuilding
- Follows existing patterns (ESM, vitest, file structure)
- Scopes appropriately to the ask

### New Insight

The code-in-tasks problem persists regardless of codebase context. This is a **prompt engineering problem**, not a context problem.

## Conclusion

**Recommendation 1 is validated.** Brownfield tests need real starter codebases.

However, format compliance issues remain. Next tests should focus on:
- Recommendation 4: Strengthen format enforcement in prompts
- Recommendation 5: Add iterative self-correction

The review failure is consistent across both tests, suggesting the reviewer is correctly catching code blocks - but the generator isn't fixing them.
