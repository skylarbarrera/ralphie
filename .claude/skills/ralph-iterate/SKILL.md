---
name: ralph-iterate
description: Execute one Ralph iteration - load context, explore codebase, plan implementation, write code with tests, review changes, and commit. Use this skill to run a single autonomous coding iteration following the Ralph protocol.
context: fork
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Task, TodoWrite, LSP
---

# Ralph Iteration Protocol

Execute ONE complete Ralph iteration: read SPEC, plan, implement, test, review, commit.

## Step 1: Load Context

### 1.1 Read SPEC.md

Find the next incomplete task:
- Look for the first unchecked checkbox: `- [ ]`
- Skip checked items: `- [x]`
- A batched checkbox counts as ONE task (e.g., "Create components A, B, C" = 1 task)

```
Read SPEC.md → Find first `- [ ]` → This is your task for this iteration
```

### 1.2 Check STATE.txt (if needed)

Read `STATE.txt` when:
- Unsure if a task was partially completed
- Need to understand blockers from previous iterations
- Want to verify what was done vs what SPEC shows

Look for:
- ✅ entries (completed work)
- ⚠️ entries (blockers or issues)
- Last completion timestamp

### 1.3 Read Recent Context

Read **last 3-5 entries** from `.ai/ralph/index.md`:
- Extract file patterns (what files were recently changed)
- Note "next:" hints (what the previous iteration recommended)
- Understand recent architectural decisions

**Don't read the entire index** — only recent entries to stay context-efficient.

### 1.4 Break Down with TodoWrite

If the task has **3+ steps**, use TodoWrite to track sub-tasks:

```typescript
TodoWrite({
  todos: [
    {
      content: "Read existing auth code",
      activeForm: "Reading existing auth code",
      status: "pending"
    },
    {
      content: "Create login endpoint",
      activeForm: "Creating login endpoint",
      status: "pending"
    },
    {
      content: "Add input validation",
      activeForm: "Adding input validation",
      status: "pending"
    },
    {
      content: "Write unit tests",
      activeForm: "Writing unit tests",
      status: "pending"
    }
  ]
})
```

**Required fields:**
- `content`: Imperative form (what to do)
- `activeForm`: Present continuous (what's happening)
- `status`: "pending" | "in_progress" | "completed"

**Skip TodoWrite when:**
- Task is atomic (single file, single change)
- Task is documentation-only
- Task can be completed in under 3 steps

## Step 2: Explore (if needed)

Before writing your plan, spawn parallel exploration agents to understand unfamiliar parts of the codebase. This is faster than reading files sequentially and helps you make better architectural decisions.

### 2.1 When to Explore

**Explore when:**
- Working in a new area of the codebase
- Task involves multiple interconnected modules
- Unsure about existing patterns or conventions
- Need to understand how similar features were implemented

**Skip when:**
- Working on files you've modified recently
- Simple changes to isolated functions
- Task specifies exact file paths in SPEC
- Documentation-only changes

### 2.2 Spawn Parallel Agents

Use the Task tool with `subagent_type='Explore'` to spawn agents that search the codebase in parallel. **Send all Task calls in a single message** to run them concurrently:

```typescript
// Example: Exploring for an authentication feature
// Spawn all agents in ONE message (parallel execution)

Task({
  subagent_type: 'Explore',
  description: 'Find auth patterns',
  prompt: 'Find how authentication is implemented. Look for middleware, JWT handling, session management. Report file paths and key patterns.'
})

Task({
  subagent_type: 'Explore',
  description: 'Find test patterns',
  prompt: 'Find testing patterns for API endpoints. Look for test setup, mocking strategies, assertion patterns. Report examples I can follow.'
})

Task({
  subagent_type: 'Explore',
  description: 'Find error handling',
  prompt: 'Find error handling patterns. Look for custom error classes, error middleware, response formatting. Report the conventions used.'
})
```

### 2.3 What to Explore

Tailor your exploration prompts to your task:

| Need | Prompt Focus |
|------|--------------|
| **Architecture** | "How is [feature] structured? What files/modules are involved?" |
| **Patterns** | "What patterns are used for [X]? Show me examples." |
| **Dependencies** | "What does [module] depend on? What depends on it?" |
| **Conventions** | "What naming/file structure conventions are used?" |
| **Similar features** | "How is [existing similar feature] implemented?" |

### 2.4 Using Exploration Results

Once all agents complete:

1. **Wait for completion** — don't proceed until all agents return
2. **Extract file paths** — incorporate discovered paths into your plan's Files section
3. **Follow patterns** — use patterns the agents identify (don't invent new ones)
4. **Note concerns** — document any blockers or risks in your plan
5. **Update sub-tasks** — add/remove TodoWrite items based on findings

```
Exploration Results → Informs Plan → Guides Implementation
```

## Step 3: Plan

Write your plan to `.ai/ralph/plan.md` **before writing any code**. The plan is your contract for this iteration — it defines scope, prevents creep, and provides a clear completion target.

### 3.1 Write the Goal

The Goal is a **single sentence** that describes what this iteration accomplishes. It should be:
- **Specific**: Name the feature, component, or fix
- **Completable**: Something achievable in one iteration
- **Verifiable**: You can objectively confirm it's done

**Good goals:**
```markdown
## Goal
Add JWT token refresh endpoint that returns a new access token when given a valid refresh token.
```

```markdown
## Goal
Fix race condition in WebSocket reconnection that causes duplicate message handlers.
```

**Bad goals (too vague):**
```markdown
## Goal
Improve authentication.  ← What specifically? Add? Fix? Refactor?
```

```markdown
## Goal
Work on the API.  ← Which endpoint? What change?
```

### 3.2 List the Files

List every file you plan to create or modify with a brief note about what changes:

```markdown
## Files
- src/auth/refresh.ts - create token refresh endpoint
- src/auth/middleware.ts - add refresh token validation
- src/auth/types.ts - add RefreshTokenPayload type
- tests/auth/refresh.test.ts - unit tests for refresh flow
```

**Guidelines:**
- **Be explicit** — list actual file paths, not "auth files"
- **Include tests** — every implementation file should have a corresponding test file
- **Note the action** — "create", "modify", "add", "fix", "remove"
- **Use exploration results** — if Step 2 found patterns in specific files, reference them

If you're unsure which files need changes, your exploration in Step 2 was incomplete. Go back and explore more before planning.

### 3.3 Define the Tests

List specific test scenarios that prove your implementation works. These become your acceptance criteria:

```markdown
## Tests
- Returns new access token when refresh token is valid
- Returns 401 when refresh token is expired
- Returns 401 when refresh token is revoked
- Returns 400 when refresh token is malformed
- Rotates refresh token on successful refresh (one-time use)
```

**Guidelines:**
- **Cover happy path** — at least one test for the success case
- **Cover error cases** — invalid input, edge cases, failures
- **Be specific** — "handles errors" is not a test; "returns 404 when user not found" is
- **Match existing patterns** — look at how similar features are tested in the codebase

**Skip when:**
- Task is documentation-only
- Task is configuration/setup (no logic to test)
- Existing tests already cover the change

### 3.4 Set Exit Criteria

Exit criteria are the **checkboxes you must check** before committing. They combine your goal, tests, and any additional requirements:

```markdown
## Exit Criteria
- Refresh endpoint returns new tokens for valid requests
- All 5 test scenarios pass
- Type checking passes (`npm run type-check`)
- No new linting errors
- Changes committed with conventional message
```

**Standard exit criteria (include most of these):**
- Feature/fix works as described in Goal
- Tests pass with good coverage (80%+ for new code)
- Type checking passes (if TypeScript)
- No linting errors
- Changes committed

**Additional criteria (when applicable):**
- Documentation updated (for public APIs)
- Migration added (for database changes)
- Environment variables documented (for new config)

### Complete Plan Example

```markdown
## Goal
Add JWT token refresh endpoint that returns a new access token when given a valid refresh token.

## Files
- src/auth/refresh.ts - create token refresh endpoint
- src/auth/middleware.ts - add refresh token validation helper
- src/auth/types.ts - add RefreshTokenPayload interface
- tests/auth/refresh.test.ts - unit tests

## Tests
- Returns new access token when refresh token is valid
- Returns 401 when refresh token is expired
- Returns 401 when refresh token is revoked
- Returns 400 when refresh token is malformed
- Rotates refresh token on successful refresh

## Exit Criteria
- Refresh endpoint works for valid requests
- All 5 test scenarios pass
- Type checking passes
- Changes committed
```

### After Writing the Plan

1. **Review scope** — Is this achievable in one iteration? If not, split the task.
2. **Update TodoWrite** — Add sub-tasks based on your Files list if not done in Step 1.
3. **Proceed to implementation** — Only start coding after the plan is written.

## Step 4: Implement

1. Write the code following existing patterns
2. Write tests alongside implementation
3. Run tests: `npm test` (or project-specific command)
4. Run type check: `npm run type-check` (if TypeScript)
5. Fix any failures before proceeding

Update TodoWrite status as you complete sub-tasks.

## Step 5: Review

Before committing, spawn a review agent:

```typescript
Task({
  subagent_type: 'general-purpose',
  description: 'Review code changes',
  prompt: `Review changes for: [TASK]

Files: [list]

Check: bugs, test coverage, patterns, security, performance.

Respond: CRITICAL (must fix), SUGGESTIONS (optional), or APPROVED.`
})
```

- **CRITICAL**: Fix issues and re-review
- **SUGGESTIONS**: Address if quick
- **APPROVED**: Proceed to commit

## Step 6: Commit

1. Stage changes: `git add [files]`
2. Commit with conventional message:
   ```
   type(scope): brief description
   ```
3. Append to `.ai/ralph/index.md`:
   ```markdown
   ## {sha} — {commit message}
   - files: {changed files}
   - tests: {count} passing
   - notes: {key decisions}
   - next: {logical follow-up}
   ```
4. Update `SPEC.md` - check off completed task: `- [x]`
5. Update `STATE.txt` with completion details

## Hard Rules

- ONE task per iteration (batched checkbox = one task)
- Plan BEFORE coding
- Tests MUST pass before commit
- No commit = no index entry
- Mark SPEC task complete only after commit
