# Ralph v1.0 - Skill-Based Architecture

Convert Ralph to a skill-based architecture with verification capabilities for v1 release.

## Goal

Transform Ralph into a skill-installable tool where major operations are Claude Code skills, add verification capabilities, and design a harness abstraction layer for future multi-harness support.

## Current State

Ralph is a working CLI with:
- Commands: `init`, `run`, `validate`, `spec`, `upgrade`
- Headless mode for programmatic integration
- Skills in `.claude/skills/`: `create-spec`, `ralph-iterate`
- Spec generation via `src/lib/spec-generator.ts`
- Stream parsing and state machine for Claude output

---

## Tasks

### Phase 1: Skill Directory Migration

- [x] Move skills from `.claude/skills/` to `skills/` directory
  - Create `skills/create-spec/SKILL.md` from existing `.claude/skills/create-spec/SKILL.md`
  - Create `skills/ralph-iterate/SKILL.md` from existing `.claude/skills/ralph-iterate/SKILL.md`
  - Update skill frontmatter to match add-skill format (vercel-labs/add-skill)
  - Keep `.claude/skills/` as symlinks or copies for local development

### Phase 2: Review Skill

- [x] Create `skills/review-spec/SKILL.md` for spec validation
  - Format checks: checkbox syntax, no code snippets, no file paths, deliverable sub-bullets
  - Content critique: problem-solution fit, integration awareness, scalability, scope
  - Output: PASS/FAIL on format, list of concerns, improvement suggestions

### Phase 3: Verify Skill

- [x] Create `skills/verify/SKILL.md` for pre-commit verification
  - Skill for Claude to use during iteration before committing
  - Claude detects what to run from codebase (package.json scripts, tsconfig, eslint config, etc.)
  - No configuration needed - Claude figures it out from context
  - Runs tests, type check, lint as appropriate for the project
  - Reports pass/fail status with errors

### Phase 4: Interactive Spec Mode

- [x] Update `ralph spec` command to support interactive mode
  - Default behavior: interactive interview with AskUserQuestion
  - User is present, Claude interviews user, asks clarifying questions
  - User provides answers, reviews output, can request changes before finalizing
  - Use `create-spec` skill for interview flow

### Phase 5: Autonomous Spec Mode

- [x] Add autonomous mode for `ralph spec --auto` or `ralph spec --headless`
  - No user present
  - Generate initial spec with `create-spec` skill logic
  - Run `review-spec` validation on generated spec
  - If review finds issues, feed feedback back for refinement
  - Loop until quality threshold met or max attempts (3, configurable) reached
  - Exit with error on max attempts without passing review

### Phase 6: Harness Abstraction

- [x] Create harness interface in `src/lib/harness/`
  - Define `Harness` interface: run skill with context, return result (success/failure, output)
  - Implement `ClaudeCodeHarness` as default adapter (only implementation for v1)
  - Config selection: `.ralph/config.yml` has `harness: claude-code`
  - Environment variable override: `RALPH_HARNESS=codex`
  - CLI flag override: `ralph run --harness codex`
  - Design interface so other harnesses (Codex, OpenCode) can be added later

### Phase 7: Tests and Documentation

- [x] Add tests for new functionality
  - Unit tests for review-spec validation logic
  - Integration test: spec generation with review loop
  - Test skills work with `npx add-skill skylarbarrera/ralph`
  - Update README with new commands and skill installation

---

## Config

Ralph reads from `.ralph/config.yml` when present:

```yaml
harness: claude-code  # Default harness (only config needed)
```

Defaults are used when config is not present.

---

## Success Criteria

- Skills installable via `npx add-skill skylarbarrera/ralph`
- Skills installable selectively: `npx add-skill skylarbarrera/ralph --skill create-spec --skill verify`
- `ralph spec "description"` runs interactive interview (user present)
- `ralph spec --auto "description"` runs autonomous generation with review loop
- Verify skill works during iteration (Claude uses it to check work before committing)
- Harness interface designed for future extensibility (only Claude Code implemented for v1)
- All existing tests pass
- New functionality has test coverage
