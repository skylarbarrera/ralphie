---
name: review-spec
description: Validate specs for V2 format compliance (task IDs, status, size) and content quality. Checks structure, deliverables, and provides content critique.
context: fork
allowed-tools: Read, Grep, Glob
license: MIT
metadata:
  author: ralphie
  version: "3.0.0"
  argument-hint: "[spec-path]"
  install-hint: npx add-skill skillet/ralph --skill review-spec
---

# Review SPEC Skill (V2 Format)

Validate spec files for V2 format compliance and content quality before finalizing.

## Workflow

```
Locate Spec → V2 Format Checks → Content Checks → Content Critique → Report
```

## Step 1: Locate Spec

Find the spec to review:

1. Check `specs/active/*.md` first (V2 location)
2. Fall back to `SPEC.md` at root (legacy location - warn user)
3. Or use provided path argument

```bash
# Check for V2 location
ls specs/active/*.md 2>/dev/null

# Or legacy location
ls SPEC.md 2>/dev/null
```

If found at legacy location, note: "⚠️ Spec at legacy location. Consider moving to `specs/active/`"

## Step 2: V2 Format Checks

These checks are **required** for V2 specs. Legacy specs will fail these checks.

### 2.1 Task ID Format

**PASS:**
```markdown
### T001: Setup project structure
### T002: Implement core logic
### T003: Add tests
```

**FAIL:**
```markdown
### Task 1: Setup project      # No T prefix, wrong format
### T1: Implement logic        # Only 1 digit, need 3
- [ ] Add tests                # Checkbox format (legacy)
```

**Check for:**
- All tasks use `### T###:` format (H3, T prefix, 3 digits, colon, space)
- Sequential numbering (T001, T002, T003...)
- No gaps in sequence (T001, T003 - missing T002)

### 2.2 Status Field

**PASS:**
```markdown
### T001: Task title
- Status: pending
```

**FAIL:**
```markdown
### T001: Task title
- Status: todo          # Invalid value
- status: pending       # Lowercase "status"
                        # Missing Status line entirely
```

**Valid values:** `pending`, `in_progress`, `passed`, `failed`

**Check for:**
- Every task has `- Status:` line (exact format)
- Value is one of the four valid options
- Appears immediately after task header

### 2.3 Size Field

**PASS:**
```markdown
### T001: Task title
- Status: pending
- Size: M
```

**FAIL:**
```markdown
### T001: Task title
- Status: pending
- Size: Medium          # Full word, not abbreviation
- Size: XL              # Invalid size
                        # Missing Size line
```

**Valid values:** `S`, `M`, `L`

**Check for:**
- Every task has `- Size:` line (exact format)
- Value is S, M, or L (single uppercase letter)
- Appears after Status line

### 2.4 Deliverables Section

**PASS:**
```markdown
### T001: Task title
- Status: pending
- Size: S

**Deliverables:**
- First deliverable
- Second deliverable
```

**FAIL:**
```markdown
### T001: Task title
- Status: pending
- Size: S

- First deliverable     # Missing **Deliverables:** header
- Second deliverable
```

**Check for:**
- `**Deliverables:**` header present for each task
- At least one bullet under Deliverables
- Deliverables describe WHAT not HOW

### 2.5 Verify Section

**PASS:**
```markdown
**Verify:** `npm test -- task-name`
```

**FAIL:**
```markdown
**Verify:** Run the tests    # No backticks, vague
Verify: npm test             # Missing ** bold
                             # Missing Verify section entirely
```

**Check for:**
- `**Verify:**` present (bold, colon)
- Contains a command or clear verification method
- Commands should be in backticks

### 2.6 Task Separators

**PASS:**
```markdown
**Verify:** `npm test`

---

### T002: Next task
```

**FAIL:**
```markdown
**Verify:** `npm test`

### T002: Next task          # Missing --- separator
```

**Check for:**
- `---` separator between each task
- Blank line before and after separator

### V2 Format Summary

Report each violation:

```markdown
## V2 Format Issues

### Task IDs
- Task 3: Uses `### Task 3:` instead of `### T003:`
- Task sequence: Gap detected - T001, T003 (missing T002)

### Status Field
- T002: Missing Status field
- T004: Invalid status value "todo" (use: pending, in_progress, passed, failed)

### Size Field
- T001: Missing Size field
- T003: Invalid size "Medium" (use: S, M, L)

### Deliverables
- T002: Missing **Deliverables:** section
- T004: Deliverables section empty

### Verify
- T001: Missing **Verify:** section
- T003: Verify missing backticks around command

### Separators
- Between T002 and T003: Missing --- separator
```

---

## Step 3: Content Checks

These checks apply to both legacy and V2 specs.

### 3.1 No Code Snippets in Tasks

**FAIL - Code in tasks:**
```markdown
**Deliverables:**
- Use `bcrypt.compare()` instead of `===`
- Add this code:
  ```typescript
  const isValid = await bcrypt.compare(password, hash);
  ```
```

**PASS - Deliverable-focused:**
```markdown
**Deliverables:**
- Password comparison should be timing-safe
- Handle comparison errors gracefully
```

**Note:** Code in `**Verify:**` sections is OK (test commands, not implementation)

### 3.2 No File Paths in Tasks

**FAIL:**
```markdown
**Deliverables:**
- Modify src/auth/login.ts line 42
- Update src/middleware/validate.ts
```

**PASS:**
```markdown
**Deliverables:**
- Login endpoint returns 401 for invalid credentials
- Credentials validated before database lookup
```

### 3.3 Deliverables Are WHAT Not HOW

**FAIL - Instructions:**
```markdown
**Deliverables:**
- Install express and body-parser
- Create routes/user.ts file
- Add GET and POST handlers
```

**PASS - Outcomes:**
```markdown
**Deliverables:**
- GET /users returns list of users
- POST /users creates new user
- Returns 400 for invalid input
```

### 3.4 Task Batching

**FAIL - Over-split:**
```markdown
### T001: Create UserModel.ts
### T002: Create UserService.ts
### T003: Create UserController.ts
### T004: Create user.test.ts
```

**PASS - Properly batched:**
```markdown
### T001: Implement User module
- Status: pending
- Size: M

**Deliverables:**
- User CRUD operations (model, service, controller)
- Input validation
- Tests cover all operations
```

**Guideline:** 3-10 tasks total. Each task = meaningful iteration (30min - 2hr work).

---

## Step 4: Content Critique

Evaluate problem-solution fit.

### 4.1 Problem-Solution Fit

- Does the spec clearly state what problem it solves?
- Are tasks aligned with solving that problem?
- Any tasks unrelated to the stated goal?

### 4.2 Integration Awareness

- Does spec consider existing systems?
- Tasks for integration points (APIs, databases)?
- Backward compatibility considered?

### 4.3 Size Point Distribution

For V2 specs, check size distribution:

```markdown
## Size Analysis

| Size | Count | Points |
|------|-------|--------|
| S | 3 | 3 |
| M | 4 | 8 |
| L | 1 | 4 |
| **Total** | **8** | **15** |

Estimated iterations: ~4 (at 4 pts/iteration)
```

**Concerns:**
- All L tasks? Consider splitting
- All S tasks? May be over-split
- Mix of sizes is healthy

### 4.4 Scope Appropriateness

- Is spec trying to do too much?
- Tasks that could be deferred?
- Missing prerequisites?

---

## Step 5: EARS Validation (Optional)

If spec has `## Acceptance Criteria` with EARS patterns, validate them.

### Valid EARS Patterns

| Pattern | Format |
|---------|--------|
| Ubiquitous | "The system shall [response]" |
| Event-driven | "WHEN [trigger], the system shall [response]" |
| State-driven | "WHILE [state], the system shall [response]" |
| Optional | "WHERE [feature enabled], the system shall [response]" |
| Unwanted | "IF [condition], THEN the system shall [response]" |

### EARS Concerns

**FAIL:**
```markdown
- When needed, the system should probably do something
```

Issues:
- "When needed" is vague trigger
- "should probably" is weak (use "shall")
- "do something" has no specific response

**PASS:**
```markdown
- WHEN user submits login form, the system shall validate credentials within 200ms
```

---

## Step 6: Generate Report

### Output Format

```markdown
# SPEC Review: [PASS/FAIL]

## V2 Format: [PASS/FAIL]

[If FAIL, list all V2 format violations]
[If PASS, "V2 format validated: X tasks, Y total points"]

## Content: [PASS/FAIL]

[If FAIL, list content violations (code, file paths, etc.)]
[If PASS, "No content violations found."]

## Content Critique: [PASS/CONCERNS]

[If CONCERNS, list in priority order]
[If PASS, "Spec is well-structured and ready."]

## Size Summary

| Size | Count | Points |
|------|-------|--------|
| S | X | X |
| M | Y | 2Y |
| L | Z | 4Z |
| Total | N | P |

Estimated iterations: ~I (at 4 pts/iteration)

## Recommendations

1. [Required fixes]
2. [Suggested improvements]

## Summary

[✓ Ready / ❌ Needs revision / ⚠️ Needs discussion]
```

### Example: PASS Report

```markdown
# SPEC Review: PASS

## V2 Format: PASS
V2 format validated: 8 tasks, 15 total points
- Task IDs: T001-T008 sequential ✓
- All tasks have Status, Size, Deliverables, Verify ✓
- Separators present between all tasks ✓

## Content: PASS
No content violations found.

## Content Critique: PASS
- Clear goal statement
- Tasks properly batched
- Good integration awareness
- Appropriate scope

## Size Summary

| Size | Count | Points |
|------|-------|--------|
| S | 3 | 3 |
| M | 4 | 8 |
| L | 1 | 4 |
| Total | 8 | 15 |

Estimated iterations: ~4 (at 4 pts/iteration)

## Recommendations
None. Spec is ready for implementation.

## Summary
✓ Spec follows V2 format and is ready for `ralphie run`.
```

### Example: FAIL Report

```markdown
# SPEC Review: FAIL

## V2 Format: FAIL

### Task IDs
- Line 45: Uses `### Task 3:` instead of `### T003:`

### Status Field
- T002: Missing Status field
- T004: Invalid status "todo" (valid: pending, in_progress, passed, failed)

### Size Field
- T001: Missing Size field

### Deliverables
- T002: Missing **Deliverables:** section

## Content: FAIL

### Code Snippets
- T003 line 82: Contains implementation code `bcrypt.compare()`

### File Paths
- T001 line 55: References `src/auth/login.ts:42`

## Content Critique: CONCERNS

### HIGH PRIORITY
1. Missing Prerequisites: Auth tasks should come before admin dashboard

## Size Summary
Cannot calculate - missing Size fields on some tasks.

## Recommendations

1. **Fix V2 format** (required):
   - Add missing Status and Size fields
   - Fix task ID format on Task 3
   - Add Deliverables section to T002

2. **Fix content** (required):
   - Remove code from task descriptions
   - Remove file path references

3. **Address concerns**:
   - Reorder tasks for prerequisites

## Summary
❌ Spec needs revision. Fix V2 format violations first.
```

---

## Quick Reference

| V2 Check | Pass | Fail |
|----------|------|------|
| Task ID | `### T001:` | `### Task 1:`, `- [ ]` |
| Status | `- Status: pending` | Missing, invalid value |
| Size | `- Size: M` | Missing, invalid value |
| Deliverables | `**Deliverables:**` + bullets | Missing section |
| Verify | `**Verify:** \`cmd\`` | Missing section |
| Separators | `---` between tasks | Missing |

| Content Check | Pass | Fail |
|---------------|------|------|
| Code | Only in Verify | In Deliverables |
| Files | No paths | `src/file.ts:42` |
| Deliverables | WHAT (outcomes) | HOW (instructions) |
| Batching | 3-10 tasks | 20+ micro-tasks |

## When to Use

**Use `/review-spec` when:**
- Just generated a spec with `/spec-autonomous` or `/spec-interactive`
- User asks to validate a spec before starting work
- Running `ralphie spec` (uses this for self-review)
- Unsure if spec follows V2 conventions

**Don't use when:**
- Spec already validated and user is ready to start
- Mid-iteration (use `/ralphie-iterate` instead)
