# Compound Learnings Integration

Goal: Integrate compound engineering concepts into Ralphie - research-driven spec gen, spec validation, learnings capture, and multi-agent review - while keeping Ralphie's simple iteration identity.

## Context

Inspired by [EveryInc/compound-engineering-plugin](https://github.com/EveryInc/compound-engineering-plugin). Key insight: "Each unit of work should make subsequent units easier."

Ralphie already has:
- Spec generation with V2 format (task IDs, status, verify)
- Iteration loop with fresh context
- `ralphie lessons` command (basic)
- `ralphie validate` for format checking

Adding:
- Pre-interview research phase for better specs
- SpecFlow-style gap analysis before implementation
- Structured learnings capture after errors resolved
- 5-agent parallel review with cost tracking

All Ralphie-related files stay in `.ralphie/` folder structure.

## Tasks

### T001: Restructure to .ralphie/ folder
- Status: pending
- Size: M

**Deliverables:**
- Move `specs/` to `.ralphie/specs/`
- Move `STATE.txt` to `.ralphie/state.txt`
- Add `.ralphie/learnings/` directory structure
- Update all path references in codebase
- Update `ralphie init` to create new structure
- Backward compat: detect old structure, suggest migration

**Verify:** `ralphie init` in fresh dir creates `.ralphie/specs/active/`, `.ralphie/learnings/`

---

### T002: Add research phase to spec generation
- Status: pending
- Size: L

**Deliverables:**
- Create repo-research agent prompt (patterns, conventions, existing code)
- Run research before interview in `ralphie spec` and `/ralphie-spec`
- Surface findings to inform interview questions
- Add `--skip-research` flag to bypass

**Verify:** `ralphie spec "add auth"` shows research findings before prompting

---

### T003: Add SpecFlow analyzer for spec validation
- Status: pending
- Size: L

**Deliverables:**
- Create spec-analyzer agent prompt (edge cases, gaps, missing requirements)
- Add `ralphie analyze` command to run analysis on active spec
- Integrate into `ralphie validate` with `--deep` flag
- Output: gap report with prioritized questions

**Verify:** `ralphie analyze` on spec with gaps outputs actionable findings

---

### T004: Implement learnings capture system
- Status: pending
- Size: M

**Deliverables:**
- Create `.ralphie/learnings/` structure with categories (build-errors, test-failures, runtime-errors, etc.)
- Add `ralphie compound` command to document resolved issues
- YAML frontmatter: problem, symptoms, root-cause, solution, prevention
- Trigger: prompt after task fails then passes, or manual

**Verify:** `ralphie compound` creates structured learning in `.ralphie/learnings/`

---

### T005: Add learnings search to iteration loop
- Status: pending
- Size: M

**Deliverables:**
- Before starting a task, search learnings for relevant context
- Simple keyword/tag matching (no vector DB)
- Surface relevant learnings in iteration prompt
- Add `ralphie recall "query"` for manual search

**Verify:** `ralphie recall "typescript import"` returns matching learnings

---

### T006: Implement 5-agent parallel review
- Status: pending
- Size: L

**Deliverables:**
- Create 5 review agent prompts: security, performance, architecture, testing, code-quality
- Add `ralphie review` command to run all in parallel
- Aggregate findings with P1/P2/P3 severity
- Track and display token cost per agent
- Output: review report with prioritized issues

**Verify:** `ralphie review` outputs findings from all 5 agents with cost summary

---

### T007: Integrate review into workflow
- Status: pending
- Size: S

**Deliverables:**
- Add `--review` flag to `ralphie run` to run review before starting
- Block on P1 findings (require `--force` to override)
- Add review step to `/ralphie-spec` workflow (optional)

**Verify:** `ralphie run --review` blocks if P1 issues found

---

## Acceptance Criteria

- WHEN `ralphie init` runs, THEN `.ralphie/` structure is created
- WHEN `ralphie spec` runs, THEN research phase informs interview
- WHEN `ralphie analyze` runs, THEN gaps and edge cases are identified
- WHEN task fails then passes, THEN user is prompted to document learning
- WHEN `ralphie review` runs, THEN 5 agents run in parallel with cost tracking
- WHEN P1 issue found, THEN `ralphie run --review` blocks without `--force`

## Notes

### Cost Tracking

Review agents run in parallel via Claude API. Track:
- Input/output tokens per agent
- Total cost per review
- Display in review summary

### Migration Path

Existing projects with `specs/` structure:
1. Detect old structure
2. Offer `ralphie migrate` command
3. Move files to `.ralphie/`
4. Update any hardcoded paths
