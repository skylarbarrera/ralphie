# Spec Generation Prompt Improvements

## Summary

Strengthened the spec generation prompts with explicit workflows, self-verification, and completion markers for autonomous verification.

## Changes Made

### 1. create-spec/SKILL.md (290 → 460 lines)

| Area | Before | After |
|------|--------|-------|
| Mode Detection | Brittle string check | Explicit detection table with multiple triggers |
| Codebase Exploration | High-level list | Explicit bash/Glob/Grep commands to run |
| Inference | Vague "infer from description" | Detailed signal-to-inference mapping |
| Self-Verification | None | Mandatory checklist before LLM review |
| LLM Review Prompt | Basic 5-point check | Categorized violations (A/B/C) with severity |
| Completion Marker | None | `SPEC_COMPLETE` for caller detection |
| Scope Control | None | Explicit "do NOT add" list |

**Key Additions:**

1. **Explicit Codebase Exploration Steps**
   ```bash
   ls -la package.json pyproject.toml go.mod Cargo.toml 2>/dev/null
   find . -type d -name node_modules -prune -o ...
   Glob("src/**/*.ts")
   Grep("app\\.(get|post|put|delete)", path="src/")
   ```

2. **Self-Verification Checklist**
   - Structure Check (headers, sections, checkboxes)
   - Content Check (no code snippets, no file:line refs)
   - Quality Check (batched tasks, verify sections)

3. **Categorized LLM Review**
   - Category A: Forbidden Content (immediate FAIL)
   - Category B: Structure Issues (FAIL if >2)
   - Category C: Quality Issues (WARN only)

4. **SPEC_COMPLETE Marker**
   ```
   SPEC_COMPLETE

   SPEC.md created with X tasks across Y phases.
   Self-verification: PASSED
   LLM review: PASSED
   ```

### 2. spec-generator.ts (163 → 255 lines)

| Area | Before | After |
|------|--------|-------|
| Autonomous Prompt | 5-line instruction | 70-line detailed workflow |
| Completion Detection | None | Checks for `SPEC_COMPLETE` and `REVIEW: PASS` |
| Success Criteria | Just harness.success | success && taskCount > 0 |
| JSON Events | Basic | Includes `hasCompletionMarker` field |

**Key Additions:**

1. **buildAutonomousPrompt()** - Detailed 6-step workflow
   - Step 1: Codebase Exploration (MANDATORY)
   - Step 2: Infer Requirements
   - Step 3: Generate SPEC.md
   - Step 4: Self-Verify
   - Step 5: LLM Review
   - Step 6: Finalize with marker

2. **Output Buffer Parsing**
   ```typescript
   const hasCompletionMarker = outputBuffer.includes('SPEC_COMPLETE');
   const reviewPassed = hasCompletionMarker || outputBuffer.includes('REVIEW: PASS');
   ```

3. **Better Error Messages**
   - "SPEC.md was not created. The skill may have failed to generate it."
   - Warning when completion marker not detected

### 3. Tests (14 → 17 tests)

New tests added:
- `detects SPEC_COMPLETE marker in output`
- `detects REVIEW: PASS marker in output`
- `returns failure when taskCount is 0`

## Impact Analysis

| Metric | Before | After | Impact |
|--------|--------|-------|--------|
| Mode detection reliability | Low | High | Multiple trigger phrases |
| Codebase exploration | Often skipped | Explicit commands | Mandatory |
| Self-verification | None | 3-category checklist | Catches issues pre-review |
| Review quality | Basic | Severity-categorized | More accurate |
| Completion detection | None | Marker-based | Verifiable |
| Error handling | Basic | Detailed messages | Debuggable |

## Verification

```
✓ Type check passes
✓ All 537 tests pass
✓ spec-generator tests: 17 passing
```

## Files Changed

```
modified:   skills/create-spec/SKILL.md (+170 lines)
modified:   src/lib/spec-generator.ts (+92 lines)
modified:   tests/lib/spec-generator.test.ts (+60 lines)
```

## Recommendation

**COMMIT** - These improvements significantly strengthen autonomous spec generation with:
- Explicit exploration steps (not vague instructions)
- Self-verification before external review
- Completion markers for programmatic verification
- Better error messages and debugging
