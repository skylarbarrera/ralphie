# SPEC Format V2

Ralphie V2 introduces a structured spec format with task IDs, status tracking, size-based budgeting, and a folder-based lifecycle.

## Quick Start

```bash
# Initialize project with V2 structure
ralphie init

# Create a spec
ralphie spec "user authentication system"

# Check status
ralphie status

# Run iteration (selects tasks by budget)
ralphie run

# Archive completed spec
ralphie archive
```

## Folder Structure

```
project/
├── specs/
│   ├── active/           # One active spec at a time
│   │   └── user-auth.md
│   ├── completed/        # Archived specs with dates
│   │   └── 2026-01-15-setup.md
│   ├── templates/        # Spec templates
│   │   ├── feature.md
│   │   ├── bugfix.md
│   │   └── refactor.md
│   └── lessons.md        # Cross-spec learnings
└── ...
```

## Spec Format

```markdown
# Feature Name

Goal: One-sentence description of what this achieves.

## Context

Background for the implementing agent:
- What problem does this solve?
- What patterns to follow?
- Any constraints?

## Tasks

### T001: First task title
- Status: pending
- Size: S

**Deliverables:**
- What to build (WHAT, not HOW)
- Another outcome

**Verify:** `npm test -- something`

---

### T002: Second task title
- Status: pending
- Size: M

**Deliverables:**
- Deliverable description

**Verify:** `curl localhost:3000/api` returns 200

---

## Acceptance Criteria

- WHEN user does X, THEN Y happens
- WHEN condition Z, THEN expected outcome

## Notes

<!-- AI updates this section during implementation -->
```

## Task Fields

### Task ID

Format: `### T###: Title`

- Three-digit sequential numbering: T001, T002, T003...
- Used for cross-references and commit messages

### Status

Values: `pending` | `in_progress` | `passed` | `failed`

```
pending → in_progress → passed
                     → failed
```

| Status | Meaning |
|--------|---------|
| `pending` | Not started |
| `in_progress` | Currently being worked on |
| `passed` | Completed, Verify passed |
| `failed` | Blocked, documented in Notes |

### Size

Values: `S` | `M` | `L`

| Size | Points | Criteria |
|------|--------|----------|
| S | 1 | Single file, simple logic, <50 lines |
| M | 2 | Multiple files, moderate logic, 50-200 lines |
| L | 4 | Complex feature, architectural changes, 200+ lines |

### Deliverables

What the task produces (outcomes, not instructions):

```markdown
# Good - outcomes
**Deliverables:**
- GET /users returns list of users
- POST /users creates new user
- Returns 400 for invalid input

# Bad - instructions
**Deliverables:**
- Install express
- Create routes/user.ts
- Add GET and POST handlers
```

### Verify

Command or check to confirm task completion:

```markdown
**Verify:** `npm test -- user-api`
**Verify:** `curl localhost:3000/health` returns 200
**Verify:** Documentation exists at docs/api.md
```

## Greedy Budgeting

Ralphie selects tasks using a greedy algorithm with a point budget.

### How It Works

1. Default budget: **4 points** per iteration
2. Select `in_progress` tasks first (resume incomplete work)
3. Add `pending` tasks until budget is full
4. Skip tasks that would exceed budget

### Example

```
Budget: 4 points

T001 (passed, S=1)     → Skip (already done)
T002 (in_progress, M=2) → Select (2 pts used)
T003 (pending, S=1)     → Select (3 pts used)
T004 (pending, S=1)     → Select (4 pts used)
T005 (pending, M=2)     → Skip (would exceed)
```

### Override Budget

```bash
ralphie run --budget 6    # Allow up to 6 points
ralphie run --budget 2    # Conservative, one small task
```

### Conservative Mode

With `--conservative`, stop after completing any M or L task:

```bash
ralphie run --conservative
```

## CLI Commands

### `ralphie status`

Show progress of active spec:

```
Spec: User Authentication
Path: specs/active/user-auth.md

Progress: [████████████░░░░░░░░] 8/14 tasks (57%)
Points:   12/24 completed, 12 pending

Next tasks (budget 4):
  → T009: Add password reset [M]
  → T010: Add email verification [M]
```

### `ralphie spec-list`

List all specs:

```
Active specs:
  → user-auth

Completed specs:
  ✓ 2026-01-15-project-setup
  ✓ 2026-01-10-initial-config
```

### `ralphie archive`

Archive completed spec:

```bash
ralphie archive
# Moves specs/active/user-auth.md
# To specs/completed/2026-01-18-user-auth.md
# Sets all tasks to passed
# Adds completion timestamp
```

### `ralphie lessons`

View or add lessons:

```bash
ralphie lessons              # View all lessons
ralphie lessons --add "Always validate email format before DB insert"
```

## Lessons.md

Track cross-spec learnings:

```markdown
# Lessons Learned

### 2026-01-18: Email validation
**Context:** User auth spec, registration endpoint
**Lesson:** Always validate email format before database insert - Prisma throws cryptic errors otherwise
**Apply when:** Any user input going to database

### 2026-01-15: Test isolation
**Context:** API tests were flaky
**Lesson:** Reset database state in beforeEach, not afterEach
**Apply when:** Writing integration tests
```

## Migration from V1

### Automatic Detection

Ralphie detects legacy `SPEC.md` files and shows a warning:

```
⚠️ Using legacy SPEC.md at project root.
   Consider migrating to specs/active/ directory.
```

### Manual Migration

1. Create the folder structure:
   ```bash
   ralphie init  # Creates specs/ if missing
   ```

2. Move your spec:
   ```bash
   mv SPEC.md specs/active/my-feature.md
   ```

3. Convert format:
   ```markdown
   # Before (V1)
   - [ ] Task one
   - [x] Task two

   # After (V2)
   ### T001: Task one
   - Status: pending
   - Size: M

   **Deliverables:**
   - Outcome description

   **Verify:** `npm test`

   ---

   ### T002: Task two
   - Status: passed
   - Size: S

   **Deliverables:**
   - Outcome description

   **Verify:** `npm test`
   ```

4. Validate:
   ```bash
   ralphie validate
   ```

### Size Estimation Guide

When migrating, estimate sizes based on:

| Original Task | Likely Size |
|--------------|-------------|
| "Set up X" | S |
| "Create X model/type" | S |
| "Add X endpoint" | M |
| "Implement X feature" | M-L |
| "Add tests for X" | S-M |
| "Refactor X" | M-L |

## Templates

### Feature Template

`specs/templates/feature.md` - Standard new feature

### Bugfix Template

`specs/templates/bugfix.md` - Bug investigation and fix

### Refactor Template

`specs/templates/refactor.md` - Code improvement without behavior change

## Best Practices

### Task Count

- **3-10 tasks** per spec
- Too few: Spec is trivial, just do it
- Too many: Split into multiple specs

### Task Sizing

- Mix of S, M, L is healthy
- All L tasks? Consider splitting
- All S tasks? May be over-split

### Deliverables

- Describe **outcomes**, not steps
- Should be **verifiable**
- No file paths or implementation details

### Verify Commands

- Include for every task
- Should be runnable commands
- Test the deliverable, not the implementation

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "No spec found" | Create spec in `specs/active/` or run `ralphie spec` |
| "Multiple specs found" | Only one spec allowed in `specs/active/` |
| Status not updating | Use Edit tool, exact format: `- Status: passed` |
| Budget too restrictive | Use `--budget N` to increase |
| Legacy spec warning | Migrate to `specs/active/` folder |
