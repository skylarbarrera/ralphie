# Using Ralph

Ralph is an autonomous AI coding loop. You write a SPEC, Ralph works through it task by task.

## Quick Start

1. **Create a SPEC.md** with your project requirements and tasks
2. **Run Ralph**: `ralph run` or `ralph run -n 5` for multiple iterations

## Project Structure

Ralph expects this structure:

```
your-project/
├── .claude/
│   └── ralph.md      # Coding standards (auto-created)
├── .ai/ralph/
│   ├── plan.md       # Current task plan (Ralph writes this)
│   └── index.md      # Commit history (Ralph appends here)
├── SPEC.md            # YOUR requirements (you write this)
├── STATE.txt      # Progress log (Ralph updates this)
└── src/              # Your code
```

## Writing a SPEC

Your SPEC.md should have checkboxes for tasks. **Each checkbox = one Ralph iteration**, so batch related work together.

```markdown
# My Project

## Overview
Brief description of what you're building.

## Phase 1: Setup
- [ ] Initialize project with TypeScript, testing, and linting
- [ ] Set up database models and migrations
  - User model with email, password hash, timestamps
  - Post model with title, body, author reference
  - Comment model with body, author, post reference

## Phase 2: Core Features
- [ ] Implement authentication system
  - POST /auth/register - create user with hashed password
  - POST /auth/login - validate credentials, return JWT
  - POST /auth/logout - invalidate token
  - Middleware for protected routes
  - Tests for all auth flows

- [ ] Build posts API with full CRUD
  - GET/POST/PUT/DELETE endpoints
  - Authorization (only author can edit/delete)
  - Pagination for list endpoint
  - Tests for all operations
```

### Task Design Principles

**One checkbox = one iteration.** Sub-bullets are implementation details, not separate tasks.

| Pattern | Iterations | Throughput |
|---------|------------|------------|
| `- [ ] Create db.ts`<br>`- [ ] Create redis.ts`<br>`- [ ] Create queue.ts` | 3 | Low |
| `- [ ] Create data layer (db.ts, redis.ts, queue.ts)` | 1 | High |

**Batching heuristics:**
- Same verb? Batch them. ("Create X, Create Y" → "Create X and Y")
- Same feature? Batch them. (model + API + tests = one task)
- Files that import each other? Batch them.
- Sweet spot: 3-7 files or ~200-500 lines per task

**Include with each task:**
- Implementation AND tests
- Related files that depend on each other
- All sub-components of a feature

## Commands

```bash
ralph run              # Run one iteration
ralph run -n 5         # Run 5 iterations
ralph run --help       # See all options
```

## The Loop

Each iteration, Ralph:
1. Reads SPEC.md to find the next incomplete task
2. Writes a plan to .ai/ralph/plan.md
3. Implements the task with tests
4. Commits changes
5. Updates STATE.txt and .ai/ralph/index.md

## Tips

- **Clean git state**: Ralph requires no uncommitted changes before running
- **One task per iteration**: Don't expect multiple checkboxes done at once
- **Check STATE.txt**: See what's been done if you're unsure
- **Edit SPEC anytime**: Add/remove/reorder tasks between runs
