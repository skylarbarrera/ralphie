# Implementation Plan: T002

## Goal
Update research agents to recommend best-in-class tools and libraries with rationale

## Task ID
T002

## Files to Create/Modify
- `agents/repo-research-analyst.md` - Add "Identify improvement opportunities" section
- `agents/best-practices-researcher.md` - Add "Recommend best tools for this problem" section
- Tests to verify research output includes tool recommendations

## Context from Audit
The T001 audit revealed that Ralphie produces good code but doesn't consistently recommend best-in-class libraries. Key findings:
- Manual JSON.parse instead of Zod
- Type assertions instead of runtime validation
- Missing recommendations for validation libraries (Zod, io-ts)

## Implementation Approach

### 1. Update `repo-research-analyst.md`
Add new section after "Codebase Pattern Search":
- **Section: "Identify Improvement Opportunities"**
  - Document current tech stack and library choices
  - Note when better alternatives exist (with specific examples)
  - Flag outdated patterns or manual implementations
  - Document tech debt and missing validation

### 2. Update `best-practices-researcher.md`
Add new section in Phase 3 (Synthesize Findings):
- **Section: "Recommend Best Tools for This Problem"**
  - Research current best-in-class libraries for the domain
  - Include comparison rationale (why X over Y)
  - Provide specific examples: Zod for validation, bcrypt for hashing, etc.
  - List trade-offs between options
  - Prioritize tools that are:
    - Actively maintained
    - Type-safe
    - Well-documented
    - Production-proven

### 3. Add Tool Recommendation Templates
Include examples in both agents:
- Validation: Zod (TypeScript), Pydantic (Python)
- Authentication: Passport.js, bcrypt
- Date handling: date-fns, Temporal
- HTTP clients: axios, node-fetch
- Testing: vitest, jest, pytest

### 4. Update Output Format
Modify research output to include:
```markdown
## Tool Recommendations
- **Problem Domain**: [e.g., JSON validation]
- **Recommended Tool**: [e.g., Zod]
- **Rationale**: [Why this over alternatives]
- **Alternatives Considered**: [Other options and trade-offs]
- **Examples**: [Code snippet showing usage]
```

## Tests
- Create test scenario: "add validation" task
- Verify research output includes:
  - Tool recommendations (e.g., Zod for TypeScript, Pydantic for Python)
  - Rationale for recommendations
  - Comparison with alternatives
  - Specific examples
- Document findings in test results

## Exit Criteria
1. ✅ `repo-research-analyst.md` has "Identify Improvement Opportunities" section
2. ✅ `best-practices-researcher.md` has "Recommend Best Tools" section
3. ✅ Research output format includes tool recommendations template
4. ✅ Both agents reference specific best-in-class tools with examples
5. ✅ Test scenario demonstrates tool recommendations appear in research output
6. ✅ Verification command passes

## Verification
**Verify:** Research output includes tool recommendations with rationale

Testing approach:
- Create a sample task spec (e.g., "add user input validation")
- Run research agents (manually or via test harness)
- Verify output contains:
  - Recommended validation library (Zod/Pydantic)
  - Rationale for recommendation
  - Alternative options considered
  - Code examples
