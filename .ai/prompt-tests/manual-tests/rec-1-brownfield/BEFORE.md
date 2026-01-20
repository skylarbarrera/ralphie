# BEFORE: Brownfield Test with Empty Directory

**Test Date:** 2026-01-16
**Prompt:** "Add JWT authentication to the existing REST API with login, logout, and protected routes"
**Directory:** Empty `/tmp/test-brownfield-before/`

## Execution Results

- Duration: ~3.5 minutes
- Validation: PASSED (0 violations)
- Task Count Detected: 5
- Review: FAILED (3 attempts, 1 concern each)

## Generated SPEC Analysis

### What Went Well

1. **Recognized no codebase exists** - Added "No existing codebase found" notice
2. **Comprehensive coverage** - 7 implementation phases, security checklist, API docs
3. **Good verification sections** - Each phase has curl commands and expected output
4. **Appropriate scope** - Listed "Out of Scope" items clearly
5. **Technical decisions documented** - Table with choices and rationale

### Issues Found

1. **Format mismatch** - Uses `### Phase X: Name` instead of `- [ ] Task` checkboxes
   - The 5 detected tasks are from Security Checklist, not main tasks
   - Main implementation phases have no checkboxes

2. **Code blocks everywhere** -
   - Request/Response JSON examples
   - File structure diagram
   - Bash verification commands
   - These are useful but violate "no code outside Verify" rule

3. **Too detailed for SPEC** -
   - Includes step-by-step implementation instructions
   - Specifies exact dependencies to install
   - Prescribes file paths and code structure
   - This is more like a technical design doc than a SPEC

4. **Review kept failing** - LLM reviewer saw concerns but couldn't resolve them
   - Likely due to format violations

### Root Cause

The LLM treated "existing REST API" prompt against empty directory as "build from scratch" request. Without context, it:
- Created a complete technical design document
- Included implementation details that belong in a plan, not spec
- Didn't follow the `- [ ]` task format

## Quality Assessment

| Aspect | Score | Notes |
|--------|-------|-------|
| Usefulness | 8/10 | Very thorough, actually implementable |
| Format Compliance | 3/10 | Wrong structure, too detailed |
| Brownfield Appropriate | 2/10 | Became greenfield due to no context |
| Verification | 7/10 | Good curl examples, clear expectations |

## Conclusion

The SPEC is technically excellent but:
1. Doesn't follow expected format
2. Became greenfield because no API existed to extend
3. Too much implementation detail

**Hypothesis:** With a real starter codebase, the LLM will:
- Analyze existing patterns
- Add auth TO existing routes, not rebuild everything
- Generate fewer, more focused tasks
