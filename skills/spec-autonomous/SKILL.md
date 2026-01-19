---
name: spec-autonomous
description: Generate project specifications in V2 format autonomously through codebase analysis. No user interaction required.
context: fork
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
license: MIT
metadata:
  author: ralphie
  version: "3.0.0"
  argument-hint: <project-description>
  install-hint: npx add-skill skillet/ralph --skill spec-autonomous
---

# Autonomous Spec Generation (V2 Format)

Generate comprehensive specs using the V2 format with task IDs, status tracking, and size-based budgeting. Analyzes existing codebase and infers requirements without user interaction.

## When to Use

- Headless/CI environments
- Automated workflows via `ralphie spec`
- When user is not present to answer questions

## Output Location

**IMPORTANT:** Write specs to `specs/active/{name}.md`, NOT to root `SPEC.md`.

- Generate a kebab-case filename from the description
- Example: "user authentication" → `specs/active/user-authentication.md`

## Workflow

```
Detect Project → Explore Codebase → Infer Requirements → Write V2 Spec → Self-Review → Finalize
```

---

## Step 1: Detect Project Type

Analyze manifests to understand the project:

```bash
# Check for project files
ls package.json pyproject.toml go.mod Cargo.toml pom.xml build.gradle 2>/dev/null
```

Read the manifest that exists:
- `package.json` → Node.js/TypeScript
- `pyproject.toml` / `setup.py` → Python
- `go.mod` → Go
- `Cargo.toml` → Rust

---

## Step 2: Explore Codebase

### 2.1 Directory Structure

```bash
find . -type d -name node_modules -prune -o -type d -name .git -prune -o -type d -print 2>/dev/null | head -30
```

Or use Glob:
```
Glob("src/**/*")
Glob("lib/**/*")
```

### 2.2 Read Context Files

Read these if they exist:
- `README.md` - Project description
- `CLAUDE.md` or `.claude/CLAUDE.md` - AI instructions
- `specs/lessons.md` - Past learnings to apply
- Main entry point (index.ts, main.py, etc.)

### 2.3 Detect Patterns

```
Grep("export (async )?function", path="src/", type="ts")
Grep("def ", path="src/", type="py")
Grep("(describe|test|it)\\(", path="tests/")
```

---

## Step 3: Infer Requirements

Map description + codebase to requirements:

| Signal | Inference |
|--------|-----------|
| "REST API" in description | Need routes, HTTP methods |
| "CLI" in description | Need argument parsing, commands |
| Existing `tests/` folder | New features need tests |
| Existing patterns | Follow same patterns |

### Size Estimation

Estimate each task's size based on complexity:

| Size | Points | Criteria |
|------|--------|----------|
| S | 1 | Single file change, simple logic, < 50 lines |
| M | 2 | Multiple files, moderate logic, 50-200 lines |
| L | 4 | Complex feature, architectural changes, 200+ lines |

### Scope Control

**ONLY include tasks that:**
1. Are explicitly in the description
2. Are required dependencies of mentioned features
3. Are clearly implied by project type

**NEVER add:**
- "Nice to have" features not mentioned
- Generic infrastructure unless required
- Over-engineering for simple projects

---

## Step 4: Write V2 Spec

### Format

```markdown
# Feature Name

Goal: One-sentence description of what this achieves when complete.

## Context

Background information for the agent implementing this spec:
- What problem does this solve?
- What existing code/patterns should it follow?
- Any constraints or requirements?

## Tasks

### T001: First task title
- Status: pending
- Size: S

**Deliverables:**
- What to build (WHAT, not HOW)
- Another deliverable

**Verify:** `npm test -- something`

---

### T002: Second task title
- Status: pending
- Size: M

**Deliverables:**
- Deliverable description
- Another deliverable

**Verify:** `curl localhost:3000/api` returns 200

---

### T003: Third task title
- Status: pending
- Size: S

**Deliverables:**
- Deliverable description

**Verify:** `npm run type-check` passes

---

## Acceptance Criteria

- WHEN user does X, THEN Y happens
- WHEN condition Z, THEN expected outcome

## Notes

<!-- AI updates this section during implementation -->
```

### V2 Format Rules

| Element | Format | Example |
|---------|--------|---------|
| Task ID | `### T###:` | `### T001: Setup database` |
| Status | `- Status: pending\|in_progress\|passed\|failed` | `- Status: pending` |
| Size | `- Size: S\|M\|L` | `- Size: M` |
| Deliverables | `**Deliverables:**` + bullets | See template |
| Verify | `**Verify:**` + command | `**Verify:** \`npm test\`` |
| Separator | `---` between tasks | Required |

### Content Rules

| Rule | Do | Don't |
|------|-----|-------|
| Task count | 3-10 total | 20+ micro-tasks |
| IDs | Sequential T001, T002... | T1, Task-1, random |
| Status | Always `pending` for new specs | Leave blank |
| Size | Estimate from deliverables | Skip or guess randomly |
| Sub-bullets | Deliverables (WHAT) | Instructions (HOW) |
| Code | Only in **Verify:** sections | In task descriptions |
| File paths | Never in tasks | `src/auth.ts:42` |
| Batching | Related work = 1 task | Split into tiny pieces |

---

## Step 5: Self-Review

After writing spec, verify quality:

### 5.1 V2 Format Checks

**Task ID syntax:**
- Use `### T001:` format (3 digits, colon, space)
- Sequential numbering (T001, T002, T003...)

**Status field:**
- Every task has `- Status: pending` line
- Not blank, not missing

**Size field:**
- Every task has `- Size: S|M|L` line
- Estimated based on deliverable complexity

**Deliverables section:**
- `**Deliverables:**` header present
- At least one bullet under it

**Verify section:**
- `**Verify:**` present with actual command
- Commands in backticks

### 5.2 Content Checks

**No code in tasks:**
- No ` ``` ` blocks in task descriptions
- No implementation code like `` `bcrypt.compare()` ``
- Code is OK in **Verify:** sections

**No file paths:**
- No `src/auth.ts:42` references
- No specific filenames in task bullets

**Sub-bullets are deliverables:**
- Describe WHAT not HOW
- "Returns 401 for invalid credentials" not "Use bcrypt.compare()"

**Completeness:**
- All requirements from description covered
- No gaps that would leave request unfulfilled

**Order:**
- Dependencies respected (can't use auth before creating it)
- Foundation → Features → Integration

### 5.3 Fix Issues

If any check fails:
1. Edit spec to fix
2. Re-check
3. Only proceed when all checks pass

---

## Step 6: Finalize

Write spec to `specs/active/{name}.md` and output:

```
SPEC_COMPLETE

specs/active/{name}.md created with X tasks (Y size points total).
Self-verification: PASSED

Task summary:
- T001: First task [S]
- T002: Second task [M]
...

Ready for implementation with `ralphie run`.
```

The `SPEC_COMPLETE` marker signals successful completion to the caller.

---

## Quick Reference

| Check | Pass | Fail |
|-------|------|------|
| Location | `specs/active/*.md` | `SPEC.md` at root |
| Task IDs | `### T001:` | `- [ ]`, `### Task 1:` |
| Status | `- Status: pending` | Missing or blank |
| Size | `- Size: S\|M\|L` | Missing or invalid |
| Deliverables | `**Deliverables:**` + bullets | Missing section |
| Verify | `**Verify:** \`cmd\`` | Missing section |
| Separators | `---` between tasks | None |
| Code | Only in Verify | In task descriptions |
| Files | No paths | `src/file.ts:42` |
| Scope | Matches description | Kitchen sink |
