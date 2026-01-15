---
name: review-spec
description: Validate SPEC.md for format compliance and content quality. Checks for checkbox syntax, code snippets, file paths, and provides content critique on problem-solution fit, integration awareness, scalability, and scope.
context: fork
allowed-tools: Read, Grep, Glob
---

# Review SPEC Skill

Validate `SPEC.md` files for format compliance and content quality before finalizing.

## Workflow

```
Read SPEC → Format Checks → Content Critique → Report
```

## Step 1: Read SPEC.md

Read the entire `SPEC.md` file to analyze its structure and content.

```bash
Read SPEC.md
```

## Step 2: Format Checks

Check for format violations that break Ralph iteration efficiency or create ambiguity.

### 2.1 Checkbox Syntax

**PASS:**
```markdown
- [ ] Task description
- [x] Completed task
```

**FAIL:**
```markdown
- [] Missing space
- [X] Uppercase X
- Task without checkbox
* Using asterisk instead of dash
```

**Check for:**
- All tasks use `- [ ]` or `- [x]` format
- Lowercase `x` for completed tasks
- Space after checkbox
- Dash `-` prefix, not asterisk `*` or number

### 2.2 No Code Snippets

**FAIL - Code snippets in tasks:**
```markdown
- [ ] Fix auth bug
  - Use `bcrypt.compare()` instead of `===`
  - Add this code:
    ```typescript
    const isValid = await bcrypt.compare(password, hash);
    ```
```

**PASS - Deliverable-focused:**
```markdown
- [ ] Fix auth bug
  - Password comparison should be timing-safe
  - Handle comparison errors gracefully
```

**Check for:**
- No ` ```language ` code blocks in task descriptions
- No inline code that shows implementation (`` `bcrypt.compare()` `` is implementation)
- Verification sections CAN include code examples (those are test scripts, not implementation)

### 2.3 No File Paths in Tasks

**FAIL - File paths prescribe implementation:**
```markdown
- [ ] Fix auth bug
  - Modify src/auth/login.ts line 42
  - Update src/middleware/validate.ts
```

**PASS - Outcome-focused:**
```markdown
- [ ] Fix auth bug
  - Login endpoint returns 401 for invalid credentials
  - Credentials are validated before database lookup
```

**Check for:**
- No file:line references (e.g., `auth.ts:42`)
- No specific file paths in task bullets (e.g., `src/auth/login.ts`)
- Files belong in `.ai/ralph/plan.md`, not SPEC.md

### 2.4 Sub-Bullets Are Deliverables

**FAIL - Sub-bullets as instructions:**
```markdown
- [ ] Create user API
  - Install express and body-parser
  - Create routes/user.ts file
  - Add GET and POST handlers
  - Write tests in tests/user.test.ts
```

**PASS - Sub-bullets as deliverables:**
```markdown
- [ ] Create user API
  - GET /users - list all users
  - POST /users - create new user
  - Returns 400 for invalid input
  - Tests cover all endpoints
```

**Check for:**
- Sub-bullets describe WHAT not HOW
- Sub-bullets are verifiable outcomes
- No "Create X file" or "Add Y function" (those are plans, not requirements)

### 2.5 Task Batching

**FAIL - Over-split tasks:**
```markdown
- [ ] Create UserModel.ts
- [ ] Create UserService.ts
- [ ] Create UserController.ts
- [ ] Create user.test.ts
```

**PASS - Properly batched:**
```markdown
- [ ] Create User module (Model, Service, Controller) with tests
  - User CRUD operations
  - Input validation
  - Tests cover all operations
```

**Check for:**
- Related files are batched into single tasks
- Tasks that could be done together aren't artificially split
- Each checkbox = one meaningful iteration (30min - 2hr of work)

### Format Check Summary

Report each violation found:

```markdown
## Format Issues

### Checkbox Syntax
- Line 42: Uses `* [ ]` instead of `- [ ]`
- Line 58: Completed task uses `[X]` instead of `[x]`

### Code Snippets
- Lines 65-70: Task contains TypeScript code block
- Line 82: Implementation detail in sub-bullet: `Use bcrypt.compare()`

### File Paths
- Line 92: References `src/auth/login.ts:42`
- Line 105: Sub-bullet says "Modify middleware/validate.ts"

### Sub-Bullets Not Deliverables
- Line 120: "Install express and body-parser" (instruction, not deliverable)
- Line 121: "Create routes/user.ts file" (prescribes file structure)

### Task Batching
- Lines 140-143: Four separate tasks for related User module files (should be one task)
```

## Step 3: Content Critique

Evaluate whether the SPEC describes a good problem-solution fit.

### 3.1 Problem-Solution Fit

**Questions to ask:**
- Does the SPEC clearly state what problem it solves?
- Are the tasks aligned with solving that problem?
- Are there tasks that seem unrelated to the stated goal?

**Example concern:**
```markdown
## Concern: Task Misalignment
SPEC Goal: "Build a CLI tool for managing database migrations"
Task: "Add user authentication with OAuth"

This task doesn't align with the stated goal. Authentication might be needed for a web UI, but the goal describes a CLI tool.
```

### 3.2 Integration Awareness

**Questions to ask:**
- Does the SPEC consider existing systems?
- Are there tasks for integration points (APIs, databases, services)?
- Does it account for backward compatibility if modifying existing code?

**Example concern:**
```markdown
## Concern: Missing Integration
SPEC adds a new payment endpoint but doesn't mention:
- How it integrates with existing order system
- Whether existing payment records need migration
- How to handle in-flight transactions during deployment
```

### 3.3 Scalability Considerations

**Questions to ask:**
- For performance-critical features, are there tasks for optimization?
- For high-volume features, is there consideration of limits/throttling?
- Are there tasks for monitoring or observability?

**Example concern:**
```markdown
## Concern: Scalability Not Addressed
SPEC adds a webhook system but doesn't include:
- Rate limiting for incoming webhooks
- Queue for processing high volumes
- Retry logic for failed deliveries
```

**Note:** Not all SPECs need scalability tasks. Simple CLIs, internal tools, and MVPs can skip this.

### 3.4 Scope Appropriateness

**Questions to ask:**
- Is the SPEC trying to do too much in one go?
- Are there tasks that could be deferred to later phases?
- Is the SPEC missing critical prerequisites?

**Example concern:**
```markdown
## Concern: Scope Too Large
SPEC has 45 tasks across 8 phases. Recommend:
- Identify MVP subset (first 10-15 tasks)
- Move nice-to-have features to Phase 2 SPEC
- Focus on one complete workflow first
```

**Example concern:**
```markdown
## Concern: Missing Prerequisites
SPEC starts with "Create admin dashboard" but has no tasks for:
- User authentication (needed to know who's an admin)
- Database schema (what data will the dashboard show?)
Recommend adding prerequisite tasks first.
```

### Content Critique Summary

Report concerns in priority order:

```markdown
## Content Concerns

### HIGH PRIORITY
1. **Missing Prerequisites**: Authentication tasks should come before admin dashboard
2. **Scope Too Large**: 45 tasks is too many for one SPEC - recommend splitting into MVP and Phase 2

### MEDIUM PRIORITY
3. **Integration Gap**: No mention of how new API integrates with existing order system
4. **Scalability Risk**: Webhook system needs rate limiting and queue (high volume expected)

### LOW PRIORITY
5. **Task Misalignment**: OAuth task seems unrelated to CLI tool goal (clarify if needed)
```

## Step 4: Generate Report

Combine format checks and content critique into a final report.

### Output Format

```markdown
# SPEC Review: [PASS/FAIL]

## Format: [PASS/FAIL]

[If FAIL, list all format violations from Step 2]
[If PASS, say "No format violations found."]

## Content: [PASS/CONCERNS]

[If CONCERNS, list all content issues from Step 3 in priority order]
[If PASS, say "No content concerns. SPEC is well-structured and ready."]

## Recommendations

[List actionable improvements, prioritized]

1. Fix format violations (required before finalizing)
2. Address HIGH PRIORITY content concerns
3. Consider MEDIUM PRIORITY concerns if applicable
4. Review LOW PRIORITY suggestions

## Summary

[Overall assessment - ready to use, needs revision, or needs major rework]
```

### Example: PASS Report

```markdown
# SPEC Review: PASS

## Format: PASS
No format violations found.

## Content: PASS
No content concerns. SPEC is well-structured with:
- Clear goal statement
- Tasks properly batched (15 tasks across 3 phases)
- Good integration awareness (migration tasks included)
- Appropriate scope for MVP

## Recommendations
None. SPEC is ready to use.

## Summary
✓ SPEC follows all conventions and is ready for implementation.
```

### Example: FAIL Report

```markdown
# SPEC Review: FAIL

## Format: FAIL

### Code Snippets
- Lines 65-70: Task contains TypeScript code block showing implementation
- Line 82: Sub-bullet includes `bcrypt.compare()` implementation detail

### File Paths
- Line 92: References specific file `src/auth/login.ts:42`

### Sub-Bullets Not Deliverables
- Line 120: "Install express and body-parser" is an instruction, not a deliverable
- Line 121: "Create routes/user.ts file" prescribes file structure

## Content: CONCERNS

### HIGH PRIORITY
1. **Missing Prerequisites**: Tasks 8-12 build admin dashboard but authentication (Task 15) comes later. Reorder so auth comes first.
2. **Scope Too Large**: 45 tasks is too ambitious. Recommend creating MVP SPEC with first 15 tasks, defer rest to Phase 2.

### MEDIUM PRIORITY
3. **Integration Gap**: New payment endpoint (Task 22) doesn't mention integration with existing order system or data migration.

## Recommendations

1. **Fix format violations** (required):
   - Remove code blocks from task descriptions
   - Remove file:line references
   - Rewrite sub-bullets as deliverables ("WHAT") not instructions ("HOW")

2. **Address HIGH PRIORITY concerns**:
   - Reorder tasks: move authentication (Task 15) to Phase 1, before admin dashboard
   - Split SPEC: Create `SPEC-MVP.md` with first 15 tasks, `SPEC-Phase2.md` with remaining 30

3. **Consider MEDIUM concerns**:
   - Add integration tasks for payment endpoint (migration, order system integration)

## Summary
❌ SPEC needs revision before use. Focus on fixing format violations and reordering tasks to address prerequisites.
```

## Quick Reference

| Check | Pass | Fail |
|-------|------|------|
| **Checkbox** | `- [ ]` or `- [x]` | `- []`, `- [X]`, `*`, numbers |
| **Code** | No code in tasks | ` ``` ` blocks or implementation code |
| **Files** | No file paths | `src/auth.ts:42`, specific filenames |
| **Sub-bullets** | Deliverables (WHAT) | Instructions (HOW) |
| **Batching** | Related work grouped | Tiny tasks split artificially |

## When to Use This Skill

**Use `/review-spec` when:**
- You just generated a SPEC with `/create-spec`
- User asks you to validate a SPEC before starting work
- You're unsure if a SPEC follows conventions
- Running `ralph spec --auto` (autonomous mode uses this for self-review)

**Don't use when:**
- SPEC has already been validated and user is ready to start iterations
- You're mid-iteration (use `/ralph-iterate` instead)
