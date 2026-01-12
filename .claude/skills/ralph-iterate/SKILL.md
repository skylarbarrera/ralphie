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

Write plan to `.ai/ralph/plan.md`:

```markdown
## Goal
One sentence describing what this iteration accomplishes.

## Files
- src/feature.ts - add new function
- tests/feature.test.ts - unit tests

## Tests
- Test scenario 1
- Test scenario 2

## Exit Criteria
- Function works with valid input
- Tests pass with 80%+ coverage
- Changes committed
```

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
