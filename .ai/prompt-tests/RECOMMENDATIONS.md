# Spec Generation Improvement Recommendations

Based on testing 6 diverse prompts (greenfield and brownfield) with before/after prompt changes.

## Key Findings from Initial Tests

- **0/6 tests passed** with both old and new prompts
- Average scores: 59.7 (old) vs 56.8 (new)
- Main issues: code blocks in deliverables, wrong task counts, missing structure

## Top Recommendations

### 1. Fix Brownfield Test Cases (Critical)

**Problem:** Brownfield tests run against empty `/tmp/test-*` directories. The LLM is asked to "add auth to existing API" when there's no API to analyze.

**Impact:** Brownfield tests scored 30-50 points and had 0 detected tasks because the LLM couldn't follow the format without context.

**Solution:** Create minimal starter codebases for brownfield tests:
- `brownfield-api/` - Express/Fastify app with 2-3 routes
- `brownfield-js/` - JavaScript project ready for TypeScript conversion

**Expected Outcome:** Brownfield scores should improve 20-30 points with real context.

---

### 2. Relax Task Count Constraints

**Problem:** Scoring penalizes task counts outside 3-8 range. Some features legitimately need 12-15 tasks.

**Impact:** -10 points for every test, even well-structured ones.

**Solution:**
- Remove hard task count penalty
- OR widen to 3-20 range
- Focus on task QUALITY (batching related work) not quantity

**Expected Outcome:** Scores improve 5-10 points without changing actual spec quality.

---

### 3. Fix Code Block Detection

**Problem:** Current test may count ALL code blocks, but we only care about code *in task deliverables*. Code in `**Verify:**` sections is expected.

**Impact:** False negatives - specs with proper verify sections get penalized.

**Solution:** Only count code blocks that appear:
- Between `- [ ]` task start and `**Verify:**`
- Not inside Verify sections

**Expected Outcome:** More accurate scoring, fewer false violations.

---

### 4. Strengthen Format Enforcement in Autonomous Prompt

**Problem:** Despite detailed instructions, LLM doesn't follow the SPEC format consistently.

**Impact:** Missing `## Goal`, missing `- [ ]` checkboxes, missing phases.

**Solution:** Add explicit format template in the autonomous prompt with:
- Copy-paste ready structure
- BAD vs GOOD examples inline
- Self-check step: "Count your tasks. Is it 3-15? If not, batch them."

**Expected Outcome:** Better structure compliance, fewer missing section violations.

---

### 5. Add Iterative Self-Correction

**Problem:** LLM generates spec once and doesn't verify it meets requirements.

**Impact:** Format issues persist because there's no feedback loop.

**Solution:** Add to autonomous prompt:
```
After writing SPEC.md, read it back and check:
1. Does it have ## Goal? If not, add it.
2. Does each task have **Verify:**? If not, add verification.
3. Are there code blocks outside Verify? If so, convert to plain text descriptions.
Fix any issues before proceeding.
```

**Expected Outcome:** Self-correction catches format issues before completion.

---

## Testing Plan

For each recommendation:
1. Run baseline prompt, document BEFORE observations
2. Apply the change
3. Re-run same prompt, document AFTER observations
4. Compare qualitatively (not just scores)

### Test Prompts

| ID | Type | Prompt |
|----|------|--------|
| G1 | Greenfield | "Build a CLI tool that organizes files by type with undo support" |
| B1 | Brownfield | "Add JWT authentication to the existing REST API" |

Each recommendation tested against both G1 and B1.
