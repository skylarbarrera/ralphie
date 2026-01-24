# SPEC System V2

Goal: Overhaul Ralphie's specification format to use task IDs, status tracking, size-based greedy budgeting, and a folder-based spec lifecycle.

## Context

Ralphie currently uses a flat `SPEC.md` with checkbox-based task tracking. This works but has limitations:
- No task identification for cross-references
- No machine-readable status (only `[x]` vs `[ ]`)
- No size estimation for greedy budgeting
- No spec lifecycle management (active vs completed)
- Checkbox format mixes requirement tracking with implementation state

The new system draws from research into Ralph methodology, spec-driven development, GitHub Spec Kit, and AWS Kiro patterns. Key insight: specs should be AI-generated from user intent, not hand-written.

## Tasks

### T001: Create spec folder structure
- Status: passed
- Size: S

**Deliverables:**
- `specs/active/` directory for the one active spec
- `specs/completed/` directory for archived specs
- `specs/templates/` directory for spec templates
- `specs/lessons.md` file for cross-spec learnings
- Update `ralphie init` to create this structure

**Verify:** `ls specs/` shows `active/ completed/ templates/ lessons.md`

---

### T002: Implement new spec parser
- Status: passed
- Size: L

**Deliverables:**
- Parse task IDs (T001, T002, etc.) from markdown headers
- Parse Status field (pending | in_progress | passed | failed)
- Parse Size field (S=1 | M=2 | L=4 size points)
- Extract Deliverables bullets under each task
- Extract Verify commands for backpressure
- Return typed `SpecV2` structure with all parsed data
- Backward compatible: detect old format and warn

**Verify:** `npm test -- spec-parser` passes with 90%+ coverage

---

### T003: Implement spec locator
- Status: passed
- Size: S

**Deliverables:**
- `locateActiveSpec()` function returns path to spec in `specs/active/`
- Error if 0 specs in active directory
- Error if 2+ specs in active directory
- Fallback: check for legacy `SPEC.md` at root with deprecation warning

**Verify:** `npm test -- spec-locator` passes

---

### T004: Implement spec archiver
- Status: passed
- Size: S

**Deliverables:**
- `archiveSpec(specPath)` moves spec to `specs/completed/YYYY-MM-DD-{name}.md`
- Sets all task statuses to `passed` before archiving
- Appends completion timestamp to spec header
- `ralphie archive` CLI command triggers archival

**Verify:** `ralphie archive && ls specs/completed/` shows dated spec file

---

### T005: Implement greedy budget calculator
- Status: passed
- Size: M

**Deliverables:**
- `calculateBudget(spec, budget)` returns tasks that fit within budget
- S=1, M=2, L=4 size points
- Default budget: 4 points per iteration
- Conservative mode: stop after completing M or L task
- Respect task dependencies (if any marked)

**Verify:** `npm test -- greedy-budget` passes with edge cases

---

### T006: Add spec management CLI commands
- Status: passed
- Size: M

**Deliverables:**
- `ralphie spec "description"` creates spec in `specs/active/`
- `ralphie spec list` shows active and completed specs
- `ralphie status` shows task progress for active spec
- `ralphie lessons` views/adds to `specs/lessons.md`
- `ralphie archive` moves completed spec to `specs/completed/`

**Verify:** Each command shows correct output with `--help`

---

### T007: Update ralphie run command
- Status: passed
- Size: M

**Deliverables:**
- Use `locateActiveSpec()` instead of hardcoded `SPEC.md`
- Pass budget to greedy calculator (default 4, `--budget N` to override)
- Update task Status field after completion (pending -> passed)
- Update task Status to `failed` if iteration fails
- Run Verify command after task completion

**Verify:** `ralphie run --budget 6` selects tasks up to 6 size points

---

### T008: Update spec-autonomous skill
- Status: passed
- Size: M

**Deliverables:**
- Generate new format with task IDs (T001, T002...)
- Include Status field (default: pending)
- Include Size field (estimate based on deliverables)
- Include Verify commands for each task
- Write spec to `specs/active/` not root `SPEC.md`

**Verify:** `/spec-autonomous "build auth"` creates valid v2 spec

---

### T009: Update spec-interactive skill
- Status: passed
- Size: M

**Deliverables:**
- Same format changes as T008
- Interview questions about task sizing
- Preview size estimates for user approval
- Write to `specs/active/`

**Verify:** `/spec-interactive` interview produces v2 spec

---

### T010: Update review-spec skill
- Status: passed
- Size: S

**Deliverables:**
- Validate task ID format (T001, T002...)
- Validate Status field values
- Validate Size field values
- Optional: validate EARS syntax in Acceptance Criteria
- Fail review if missing required fields

**Verify:** `/review-spec` catches missing Status/Size fields

---

### T011: Update ralphie-iterate skill
- Status: passed
- Size: M

**Deliverables:**
- Read new spec format
- Update Status field (pending -> in_progress -> passed/failed)
- Respect greedy budget (don't start tasks that exceed remaining budget)
- Run Verify command as part of completion check
- Write notes to task's Notes section

**Verify:** Iteration updates Status field correctly

---

### T012: Create spec templates
- Status: passed
- Size: S

**Deliverables:**
- `specs/templates/feature.md` - Standard feature template
- `specs/templates/bugfix.md` - Bug fix template
- `specs/templates/refactor.md` - Refactoring template
- Templates include placeholder task IDs and sections

**Verify:** Templates pass `/review-spec` validation

---

### T013: Update templates for init command
- Status: passed
- Size: S

**Deliverables:**
- Add `specs/` folder structure to init templates
- Add `specs/lessons.md` starter file
- Update `.claude/ralphie.md` to reference new spec location
- Remove `SPEC.md` from init templates (deprecated)

**Verify:** `ralphie init` creates `specs/` structure

---

### T014: Documentation and migration guide
- Status: passed
- Size: M

**Deliverables:**
- Update README.md with new spec format examples
- Add migration guide for existing projects
- Document greedy budgeting system
- Document lessons.md workflow
- Add examples to `examples/` directory

**Verify:** `docs/spec-format-v2.md` exists with complete documentation

---

## Acceptance Criteria

- WHEN user runs `ralphie init`, THEN `specs/` folder structure is created
- WHEN user runs `ralphie spec "description"`, THEN a v2 format spec is created in `specs/active/`
- WHEN 0 or 2+ specs exist in `specs/active/`, THEN `ralphie run` shows clear error
- WHEN user runs `ralphie run`, THEN tasks are selected by greedy budget (default 4 points)
- WHEN user runs `ralphie run --budget 6`, THEN tasks up to 6 size points are selected
- WHEN a task completes, THEN its Status changes from `pending` to `passed`
- WHEN a task fails, THEN its Status changes to `failed`
- WHEN task has Verify command, THEN it runs after implementation
- WHEN all tasks pass, THEN `ralphie archive` moves spec to `specs/completed/`
- WHEN user runs `ralphie status`, THEN progress summary is shown
- WHEN user runs `ralphie lessons`, THEN lessons.md content is displayed
- WHEN old `SPEC.md` exists at root, THEN deprecation warning is shown

## Completion

**Archived:** 2026-01-18T21:30:51.234Z

---
**Completed:** 2026-01-18T21:30:51.234Z

## Notes

<!-- AI updates this section during implementation -->

### Research Sources
- Geoffrey Huntley's Ralph: Fresh context per iteration, plans disposable
- Clayton Farr's Playbook: Three phases, AGENTS.md, backpressure via tests
- Rich Tabor: JSON with passes field, task IDs, dependencies
- Addy Osmani: Six areas to cover, modular specs
- GitHub Spec Kit: [P] markers, constitution.md
- AWS Kiro: EARS syntax, requirements/design/tasks

### Size Point Reference
- S (1 point): Single file change, simple logic
- M (2 points): Multiple files, moderate logic
- L (4 points): Complex feature, architectural changes

### Migration Path
Existing projects with `SPEC.md`:
1. Run `ralphie init` to create `specs/` structure
2. Move `SPEC.md` to `specs/active/` and rename
3. Run `/review-spec` to identify format issues
4. Manually add task IDs, Status, Size fields
5. Or regenerate spec with `/spec-autonomous`
