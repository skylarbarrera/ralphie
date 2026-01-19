---
name: ralphie-iterate
description: Execute one Ralphie iteration using V2 spec format - load context, select tasks by budget, plan, implement, verify, update status, and commit.
context: fork
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Task, TodoWrite, LSP
---

# Ralphie Iteration Protocol (V2 Format)

Execute ONE complete Ralphie iteration: read spec, select tasks by budget, plan, implement, verify, update status, commit.

**For coding standards** (language, style, testing, git, security), see `ralphie.md`.

## V2 Spec Format Overview

V2 specs use task IDs and structured fields instead of checkboxes:

```markdown
### T001: Task title
- Status: pending | in_progress | passed | failed
- Size: S (1pt) | M (2pt) | L (4pt)

**Deliverables:**
- Outcome 1
- Outcome 2

**Verify:** `npm test -- task-name`
```

**Key differences from legacy:**
- Task IDs (`T001`) instead of checkboxes (`- [ ]`)
- Status field tracks state (not `[x]` vs `[ ]`)
- Size field enables budget-based selection
- Verify section provides completion check

## Claude Code Native Features

| Feature | Tool | When Used |
|---------|------|-----------|
| **Codebase Exploration** | `Task(scout)` | Step 2 - understand code before planning |
| **Progress Tracking** | `TodoWrite` | Steps 1-6 - track sub-task completion |
| **Code Review** | `Task(general-purpose)` | Step 5 - pre-commit review |
| **Iteration Validation** | Stop Hook | After Step 6 - verify iteration complete |

## Step 1: Load Context and Select Tasks

### 1.1 Locate Spec

Find the active spec:

```bash
ls specs/active/*.md 2>/dev/null  # V2 location
ls SPEC.md 2>/dev/null             # Legacy fallback
```

If found at legacy location (`SPEC.md`), warn: "⚠️ Using legacy spec. Consider migrating to V2 format in `specs/active/`"

### 1.2 Parse Tasks and Select by Budget

Read the spec and identify tasks to work on:

1. **Find pending/in_progress tasks** - Look for `- Status: pending` or `- Status: in_progress`
2. **Calculate budget** - Default: 4 points per iteration
3. **Select tasks that fit** - Prioritize `in_progress` first, then `pending`

**Size points:**
- S = 1 point
- M = 2 points
- L = 4 points

**Selection example (budget 4):**
```
T003 (in_progress, M=2) → Selected (2 pts used)
T004 (pending, S=1) → Selected (3 pts used)
T005 (pending, S=1) → Selected (4 pts used)
T006 (pending, M=2) → Skipped (would exceed budget)
```

### 1.3 Mark Selected Tasks as in_progress

For each task you're starting, update its Status:

```markdown
# Before
### T004: Add input validation
- Status: pending
- Size: S

# After
### T004: Add input validation
- Status: in_progress
- Size: S
```

**Use Edit tool** to change `Status: pending` to `Status: in_progress`.

### 1.4 Read Context Files

**Read if they exist:**
- `specs/lessons.md` - Past learnings to apply
- `.ai/ralphie/index.md` (last 3-5 entries) - Recent changes and recommendations
- `STATE.txt` - If unsure about partial completion

### 1.5 Break Down with TodoWrite

If total selected work has **3+ steps**, use TodoWrite:

```typescript
TodoWrite({
  todos: [
    { content: "T003: Complete user validation", activeForm: "Completing user validation", status: "in_progress" },
    { content: "T004: Add input validation", activeForm: "Adding input validation", status: "pending" },
    { content: "T005: Add error messages", activeForm: "Adding error messages", status: "pending" },
    { content: "Run tests and verify", activeForm: "Running tests", status: "pending" },
    { content: "Commit changes", activeForm: "Committing", status: "pending" }
  ]
})
```

## Step 2: Explore (if needed)

Before writing your plan, spawn exploration agents to understand unfamiliar code.

### 2.1 When to Explore

**Explore when:**
- Working in a new area of the codebase
- Task involves multiple interconnected modules
- Unsure about existing patterns or conventions

**Skip when:**
- Working on files you've modified recently
- Simple changes to isolated functions
- Documentation-only changes

### 2.2 Spawn Parallel Agents

Use `Task(scout)` to explore in parallel:

```typescript
Task({
  subagent_type: 'scout',
  description: 'Find validation patterns',
  prompt: 'Find input validation patterns. Look for validation libraries, error formatting, common patterns. Report file paths and examples.'
})

Task({
  subagent_type: 'scout',
  description: 'Find test patterns',
  prompt: 'Find testing patterns for validation. Look for test setup, assertion patterns, error case testing.'
})
```

### 2.3 Using Exploration Results

1. Wait for all agents to complete
2. Extract file paths for your plan
3. Follow discovered patterns
4. Update TodoWrite if needed

## Step 3: Plan

Write your plan to `.ai/ralphie/plan.md` **before writing any code**.

### 3.1 Plan Format

```markdown
## Goal
Single sentence: what this iteration accomplishes.

## Tasks (from spec)
- T003: Complete user validation [M]
- T004: Add input validation [S]
- T005: Add error messages [S]

Total: 4 points

## Files
- src/validation/user.ts - add validation rules
- src/errors/messages.ts - add error messages
- tests/validation/user.test.ts - unit tests

## Tests
- Validates email format
- Rejects invalid phone numbers
- Returns localized error messages
- Handles edge cases (empty, null)

## Exit Criteria
- All selected tasks pass their Verify commands
- Tests pass with 80%+ coverage
- Type check passes
- Changes committed
```

### 3.2 Include Verify Commands

For each task, note its Verify command from the spec:

```markdown
## Verification Commands
- T003: `npm test -- user-validation`
- T004: `npm test -- input-validation`
- T005: `npm test -- error-messages`
```

## Step 4: Implement

Execute your plan for each selected task.

### 4.1 Implementation Order

For multiple tasks, implement in order (T003 → T004 → T005):

1. **Start task** - Update TodoWrite to `in_progress`
2. **Read existing code** - Understand before modifying
3. **Write code** - Follow existing patterns
4. **Write tests** - Cover all planned scenarios
5. **Run task's Verify command** - Confirm it passes
6. **Complete task** - Update TodoWrite to `completed`

### 4.2 Run Verify Commands

After implementing each task, run its Verify command:

```bash
# From spec: **Verify:** `npm test -- user-validation`
npm test -- user-validation
```

**If Verify fails:**
1. Fix the issue
2. Re-run Verify
3. Don't proceed until it passes

### 4.3 Run Full Test Suite

After all tasks implemented:

```bash
npm test                # All tests
npm run type-check      # TypeScript
```

### 4.4 Update TodoWrite Progress

```typescript
TodoWrite({
  todos: [
    { content: "T003: Complete user validation", activeForm: "Completed", status: "completed" },
    { content: "T004: Add input validation", activeForm: "Completed", status: "completed" },
    { content: "T005: Add error messages", activeForm: "Completed", status: "completed" },
    { content: "Run tests and verify", activeForm: "Running tests", status: "in_progress" },
    { content: "Commit changes", activeForm: "Committing", status: "pending" }
  ]
})
```

## Step 5: Review

Before committing, spawn a review agent for significant changes.

### 5.1 When to Review

**Review when:**
- More than 20 lines of new code
- Modified business logic
- Security-relevant changes

**Skip when:**
- Documentation-only
- Config/setup only
- Purely stylistic

### 5.2 Spawn Review Agent

```typescript
Task({
  subagent_type: 'general-purpose',
  description: 'Review code changes',
  prompt: `Review changes for tasks T003, T004, T005.

## Files Changed
- src/validation/user.ts - validation rules
- src/errors/messages.ts - error messages
- tests/validation/user.test.ts - tests

## Check for:
1. Bugs - logic errors, null handling
2. Test coverage - edge cases tested?
3. Patterns - follows existing conventions?
4. Security - input validation complete?

Respond: CRITICAL, SUGGESTIONS, or APPROVED`
})
```

### 5.3 Handle Feedback

| Response | Action |
|----------|--------|
| **CRITICAL** | Fix all issues, re-review |
| **SUGGESTIONS** | Fix if quick, otherwise note for later |
| **APPROVED** | Proceed to commit |

## Step 6: Commit and Update Status

### 6.1 Update Task Status to Passed

For each completed task, update Status in the spec:

```markdown
# Before
### T003: Complete user validation
- Status: in_progress
- Size: M

# After
### T003: Complete user validation
- Status: passed
- Size: M
```

**Use Edit tool** to change `Status: in_progress` to `Status: passed`.

### 6.2 If Task Failed

If a task couldn't be completed:

```markdown
### T003: Complete user validation
- Status: failed
- Size: M
```

Add a note in the spec's Notes section:

```markdown
## Notes

### T003 Failed (2026-01-18)
- Issue: Validation library incompatible with existing schema
- Attempted: Custom validation but hit type conflicts
- Next: Evaluate alternative libraries
```

### 6.3 Update index.md

Prepare the index.md entry (use placeholder for commit SHA):

```markdown
## COMMIT_SHA — feat(validation): add user input validation

- tasks: T003, T004, T005 (4 points)
- files: src/validation/user.ts, src/errors/messages.ts, tests/validation/user.test.ts
- tests: 12 passing
- notes: Used Zod for validation, matches existing patterns
- next: T006, T007 are ready (5 points for next iteration)
```

### 6.4 Update STATE.txt

```markdown
✅ 2026-01-18: Completed T003, T004, T005 (4 points)
  - Added user input validation with Zod
  - Added localized error messages
  - Tests: 12 passing
```

### 6.5 Stage and Commit Everything

**Important:** Stage ALL changed files including tracking files:

```bash
# Stage implementation files
git add src/validation/ src/errors/ tests/validation/

# Stage spec with status updates
git add specs/active/*.md

# Stage tracking files
git add .ai/ralphie/index.md .ai/ralphie/plan.md STATE.txt

git status  # Verify all files staged
```

Commit with conventional format:

```bash
git commit -m "$(cat <<'EOF'
feat(validation): add user input validation and error messages

- T003: Complete user validation
- T004: Add input validation
- T005: Add error messages

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

### 6.6 Update index.md with Commit SHA

After committing, get the SHA and update the placeholder:

```bash
git log -1 --format='%h'
```

Use Edit tool to replace `COMMIT_SHA` with the actual hash, then amend:

```bash
git add .ai/ralphie/index.md STATE.txt
git commit --amend --no-edit
```

### 6.8 Complete TodoWrite

```typescript
TodoWrite({
  todos: [
    { content: "T003: Complete user validation", status: "completed", activeForm: "Completed" },
    { content: "T004: Add input validation", status: "completed", activeForm: "Completed" },
    { content: "T005: Add error messages", status: "completed", activeForm: "Completed" },
    { content: "Run tests and verify", status: "completed", activeForm: "Completed" },
    { content: "Commit changes", status: "completed", activeForm: "Completed" }
  ]
})
```

## Status Transitions

```
pending → in_progress → passed
                     → failed
```

| Transition | When |
|------------|------|
| `pending → in_progress` | Starting work on task |
| `in_progress → passed` | Task complete, Verify passes |
| `in_progress → failed` | Task blocked, can't complete |

**Never skip states** - Always go through `in_progress` first.

## Hard Rules

- **Budget**: Don't exceed 4 points (or configured budget) per iteration
- **Status**: Update Status field, not checkboxes
- **Verify**: Run each task's Verify command before marking passed
- **One iteration**: Complete selected tasks, then stop
- **No partial**: Either all selected tasks pass, or mark failed ones

## Quick Reference

| Step | V2 Action |
|------|-----------|
| **1. Load** | Find `specs/active/*.md`, select tasks by budget |
| **2. Explore** | Use `Task(scout)` for unfamiliar code |
| **3. Plan** | Write to `.ai/ralphie/plan.md` with task IDs |
| **4. Implement** | Code + tests, run Verify for each task |
| **5. Review** | Spawn review agent for significant changes |
| **6. Commit** | Update Status → update tracking files → commit all together |

## Iteration Validation

A valid iteration:
- [ ] Selected tasks fit within budget
- [ ] All selected tasks have Status: passed (or failed with notes)
- [ ] All Verify commands pass
- [ ] Full test suite passes
- [ ] Commit includes: code + spec + index.md + STATE.txt + plan.md
- [ ] No orphaned tracking file changes after commit
