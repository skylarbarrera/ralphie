# SPEC Guide

How to write effective SPECs for Ralphie.

> **New in V2:** Ralphie now uses a structured spec format with task IDs, status tracking, and size-based budgeting. See [spec-format-v2.md](./spec-format-v2.md) for full documentation.

## Quick Start (V2 Format)

```bash
# Initialize project
ralphie init

# Generate a spec
ralphie spec "REST API with user auth"

# Check progress
ralphie status

# Run iteration
ralphie run
```

## V2 Format Overview

```markdown
# Project Name

Goal: What this achieves when complete.

## Tasks

### T001: First task
- Status: pending
- Size: S

**Deliverables:**
- Outcome one
- Outcome two

**Verify:** `npm test`

---

### T002: Second task
- Status: pending
- Size: M

**Deliverables:**
- Outcome description

**Verify:** `npm run build`
```

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Task ID** | `T001`, `T002`... for tracking |
| **Status** | `pending` → `in_progress` → `passed`/`failed` |
| **Size** | S (1pt), M (2pt), L (4pt) for budgeting |
| **Budget** | Default 4 points per iteration |

## Creating a SPEC

```bash
# Autonomous (no interaction)
ralphie spec "REST API with user auth"

# Interactive (with interview)
# Use /spec-interactive skill in Claude Code
```

## Good Tasks

### Clear deliverables (WHAT, not HOW)

```markdown
# Good - outcomes
**Deliverables:**
- GET /users returns list of users
- POST /users creates new user
- Returns 400 for invalid input

# Bad - instructions
**Deliverables:**
- Create routes/user.ts
- Add validation middleware
- Write tests
```

### Right-sized

| Size | Use For |
|------|---------|
| S (1pt) | Single file, config, simple util |
| M (2pt) | Feature module, endpoint, service |
| L (4pt) | Complex feature, major refactor |

### Ordered by dependency

```markdown
### T001: Set up database connection
### T002: Create User model
### T003: Add auth endpoints
### T004: Add protected routes
```

## Example V2 Spec

```markdown
# Task API

Goal: Build a task management API with user authentication.

## Context

New project using Express + TypeScript + PostgreSQL.

## Tasks

### T001: Set up Express + TypeScript
- Status: pending
- Size: S

**Deliverables:**
- Express server starts on port 3000
- TypeScript compilation works
- Basic health endpoint responds

**Verify:** `curl localhost:3000/health`

---

### T002: Configure PostgreSQL with Prisma
- Status: pending
- Size: M

**Deliverables:**
- Prisma schema defined
- Database connection works
- Migrations run successfully

**Verify:** `npx prisma db push`

---

### T003: Create User model
- Status: pending
- Size: S

**Deliverables:**
- User model with email, passwordHash
- Unique constraint on email

**Verify:** `npx prisma generate`

---

## Acceptance Criteria

- WHEN POST /auth/register with valid data, THEN user is created
- WHEN POST /auth/login with valid credentials, THEN JWT is returned
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Task too vague | Add specific deliverables |
| Task too large | Split into S/M sized tasks |
| Stuck on same task | Check Status field, run `ralphie status` |
| Progress slow | Use smaller tasks or increase `--budget` |

## Legacy Format

The V1 checkbox format is still supported but deprecated:

```markdown
# V1 (deprecated)
- [ ] Task one
- [x] Task two

# V2 (recommended)
### T001: Task one
- Status: pending
- Size: M
```

Migrate by running `ralphie init` and moving your spec to `specs/active/`.

## Further Reading

- [spec-format-v2.md](./spec-format-v2.md) - Complete V2 documentation
- [cli.md](./cli.md) - All CLI commands
- [architecture.md](./architecture.md) - How Ralphie works
