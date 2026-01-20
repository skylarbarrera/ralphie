# Using Ralphie

Ralphie is an autonomous AI coding loop. You write a spec, Ralphie works through it task by task.

## Quick Start

1. **Install skills** using [add-skill](https://github.com/vercel-labs/add-skill):
   ```bash
   npx add-skill skylarbarrera/ralphie
   ```
2. **Create a spec** in `specs/active/` or run `/ralphie-spec "description"`
3. **Run Ralphie**: `ralphie run --all`

## Project Structure

Ralphie expects this structure:

```
your-project/
├── .claude/
│   └── ralphie.md        # Coding standards (auto-created)
├── specs/
│   ├── active/           # Current specs (you write here)
│   │   └── my-feature.md
│   └── completed/        # Archived specs (auto-moved)
├── STATE.txt             # Progress log (Ralphie updates this)
└── src/                  # Your code
```

## Writing a Spec (V2 Format)

Specs use task IDs and status tracking:

```markdown
# My Feature

Goal: Brief description of what you're building.

## Context

Background information for the AI implementing this spec.

## Tasks

### T001: Initialize project with TypeScript and testing
- Status: pending
- Size: M

**Deliverables:**
- TypeScript configuration with strict mode
- Vitest setup with coverage
- Basic project structure

**Verify:** `npm run type-check && npm test`

---

### T002: Set up database models
- Status: pending
- Size: M

**Deliverables:**
- User model with email, password hash, timestamps
- Post model with title, body, author reference
- Migration scripts

**Verify:** `npm run migrate && npm test`

---

### T003: Implement authentication system
- Status: pending
- Size: L

**Deliverables:**
- POST /auth/register endpoint
- POST /auth/login endpoint with JWT
- Auth middleware for protected routes
- Tests for all auth flows

**Verify:** `npm test -- auth`

---

## Acceptance Criteria

- WHEN user registers, THEN account is created with hashed password
- WHEN user logs in with valid credentials, THEN JWT is returned
```

### Task Design Principles

**One task = one logical unit of work.** Deliverables are implementation details.

| Size | Points | Description |
|------|--------|-------------|
| S | 1 | Single file, < 50 lines |
| M | 2 | Multiple files, 50-200 lines |
| L | 4 | Complex feature, 200+ lines |

**Batching heuristics:**
- Same feature? One task. (model + API + tests = T001)
- Files that import each other? One task.
- Sweet spot: 3-7 files per task

## Commands

```bash
ralphie run              # Run one iteration
ralphie run --all        # Run until spec complete
ralphie run -n 5         # Run 5 iterations
ralphie status           # Show progress
ralphie archive          # Move completed spec to archive
ralphie --help           # See all options
```

## The Loop

Each iteration, Ralphie:
1. Reads spec from `specs/active/` to find pending tasks
2. Implements the task with tests
3. Updates task status to `passed` or `failed`
4. Commits changes
5. Updates STATE.txt

## Tips

- **Clean git state**: Ralphie requires no uncommitted changes before running
- **One task per iteration**: Tasks transition pending → in_progress → passed/failed
- **Check status**: Run `ralphie status` to see progress
- **Edit spec anytime**: Add/remove/reorder tasks between runs

