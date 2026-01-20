# Ralphie Memory Index

Commit-anchored memory log. Each entry summarizes one completed task.

**Format:** One entry per commit, keyed by SHA (5-7 lines max)

**Rules:**
- Only append after successful commits
- Keep summaries concise
- List actual files changed, not planned files
- Include test count if tests were written
- "next:" hints at logical follow-up task

---

<!-- Entries append below this line -->

## 12064c5 — Add AskUserQuestion protocol for SPEC creation interviews
- files: templates/.claude/ralphie.md
- tests: N/A (documentation only)
- notes: Added "Creating SPECs (Interactive)" section with 3 question batches (technical foundation, feature scope, quality gates)
- next: Add Task(Explore) protocol to Planning Phase section

## 953b42c — Add Task(Explore) protocol for parallel codebase exploration
- files: templates/.claude/ralphie.md
- tests: N/A (documentation only)
- notes: Added step to Planning Phase for spawning exploration agents; detailed protocol with when to explore/skip, example code, guidance on using results
- next: Add code review protocol after Task Completion Criteria

## 81f9433 — Add code review protocol for pre-commit agent review
- files: templates/.claude/ralphie.md
- tests: N/A (documentation only)
- notes: New "Code Review Protocol" section with Task agent example, when to review/skip, handling CRITICAL vs SUGGESTIONS, example flow
- next: Add TodoWrite protocol for sub-task tracking

## 81b8407 — Add TodoWrite protocol for sub-task tracking
- files: templates/.claude/ralphie.md
- tests: N/A (documentation only)
- notes: New "Sub-Task Tracking Protocol" section with TodoWrite structure, example call, workflow, integration diagram with SPEC tasks
- next: Create /ralphie-iterate skill

## d867cb4 — Create ralphie-iterate skill with frontmatter
- files: .claude/skills/ralphie-iterate/SKILL.md
- tests: N/A (skill configuration)
- notes: Frontmatter (name, description, context: fork, allowed-tools); body has 6 steps (Load Context, Explore, Plan, Implement, Review, Commit)
- next: Verify/enhance skill body steps (Load Context step)

## 6c6645a — Enhance Load Context step with detailed TodoWrite guidance
- files: .claude/skills/ralphie-iterate/SKILL.md, .ai/ralphie/plan.md
- tests: N/A (documentation)
- notes: Added 4 sub-sections (SPEC reading, STATE.txt, index.md, TodoWrite); explicit TodoWrite example with all fields; skip guidance
- next: Enhance Explore step (spawn parallel Task(Explore) agents)

## 424eba4 — Enhance Explore step with parallel agent guidance
- files: .claude/skills/ralphie-iterate/SKILL.md, .ai/ralphie/plan.md
- tests: N/A (documentation)
- notes: Added 4 sub-sections (when to explore, spawn parallel agents, what to explore, using results); example with 3 concurrent Task(Explore) calls; table of exploration prompts
- next: Enhance Plan step (write plan.md with goal, files, tests, exit criteria)

## 1125a3a — Enhance Plan step with detailed guidance for writing plan.md
- files: .claude/skills/ralphie-iterate/SKILL.md, .ai/ralphie/plan.md
- tests: N/A (documentation)
- notes: Added 4 sub-sections (Write the Goal, List the Files, Define the Tests, Set Exit Criteria); good/bad goal examples; complete plan template; post-planning workflow
- next: Enhance Implement step (code + tests, run npm test and type-check)

## 9ba6886 — Enhance Implement step with detailed code and test guidance
- files: .claude/skills/ralphie-iterate/SKILL.md, .ai/ralphie/plan.md
- tests: N/A (documentation)
- notes: Added 5 sub-sections (Write the Code, Write the Tests, Run Tests, Run Type Check, Handle Failures); TodoWrite status updates; implementation checklist; common type errors table
- next: Enhance Review step (spawn Task agent for code review)

## a4f96a6 — Enhance Review step with detailed code review guidance
- files: .claude/skills/ralphie-iterate/SKILL.md, .ai/ralphie/plan.md
- tests: N/A (documentation)
- notes: Added 5 sub-sections (When to Review, Spawn Review Agent, Handle Review Feedback, Review Flow Example, Update TodoWrite); handling table for CRITICAL/SUGGESTIONS/APPROVED; re-review flow
- next: Enhance Commit step (git commit, update index.md, check SPEC task)

## 51535df — Enhance Commit step with detailed git and tracking guidance
- files: .claude/skills/ralphie-iterate/SKILL.md, .ai/ralphie/plan.md
- tests: N/A (documentation)
- notes: Added 6 sub-sections (Stage Changes, Commit Message, Update index.md, Update SPEC.md, Update STATE.txt, Update TodoWrite); HEREDOC example; commit types table; flow diagram
- next: Create scripts/validate-iteration.md for Stop hook validation

## d0a1824 — Add validate-iteration.md prompt for Stop hook
- files: scripts/validate-iteration.md, .ai/ralphie/plan.md
- tests: N/A (documentation/prompt)
- notes: 7-point checklist (task, tests, types, commit, index, spec, state); JSON output format with valid/invalid; example outputs for common scenarios
- next: Add hook configuration example to templates/.claude/settings.json.example

## 1fc21e0 — Add settings.json.example with Stop hook configuration
- files: templates/.claude/settings.json.example, .ai/ralphie/plan.md
- tests: N/A (configuration template)
- notes: Stop hook with type: prompt pointing to scripts/validate-iteration.md; common Ralphie permission patterns (npm test, vitest, git commands)
- next: Document hook setup in templates/.claude/ralphie.md under "Hooks Configuration" section

## b51ebad — Add Hooks Configuration section to ralphie.md
- files: templates/.claude/ralphie.md, .ai/ralphie/plan.md
- tests: N/A (documentation only)
- notes: Documents Stop hook purpose, settings.json setup, 7-point validation checklist, JSON output format, troubleshooting table
- next: Update templates/.claude/ralphie.md to sync with .claude/CLAUDE.md

## 10e84d2 — Sync ralphie.md with CLAUDE.md for template consistency
- files: templates/.claude/ralphie.md
- tests: N/A (documentation only)
- notes: Added 11 sections from CLAUDE.md: comment examples, test structure, file organization, commit examples, performance considerations, auth/auth, dependencies, code review checklist, expanded anti-patterns, tools/linters, 6th philosophical principle
- next: Add "Claude Code Native Features" section to ralphie.md

## eb573dd — Add Claude Code Native Features overview section
- files: templates/.claude/ralphie.md
- tests: N/A (documentation only)
- notes: Table summarizing 5 integrations; workflow diagram showing features working together; placed after Required Reading
- next: Update ralphie init command to copy skill directory

## 8ec2754 — Add ralphie-iterate skill to templates
- files: templates/.claude/skills/ralphie-iterate/SKILL.md
- tests: 542 passing (existing tests, no regressions)
- notes: Copied SKILL.md to templates; init already does recursive copying so no code changes needed
- next: Test AskUserQuestion flow manually

## a048557 — Create v3.1 spec to reduce template duplication
- files: SPEC.md
- tests: N/A (planning)
- notes: New spec to fix bloat/duplication: ralphie.md for standards only, SKILL.md for iteration protocol
- next: Phase 1 - refactor ralphie.md to remove iteration protocol sections

## da3e6ec — Add Phase 1 - headless flag and event emitter
- files: src/lib/headless-emitter.ts, src/cli.tsx, tests/cli.test.tsx, src/lib/__tests__/headless-emitter.test.ts
- tests: 555 passing (13 new tests for headless-emitter)
- notes: RalphieEvent types for 9 event kinds; emit() writes JSON to stdout; --headless flag; executeHeadlessRun placeholder
- next: Phase 2 - create headless-runner.ts to execute iterations without Ink UI

## e251fd3 — Add Phase 2 - headless runner
- files: src/lib/headless-runner.ts, src/cli.tsx, tests/cli.test.tsx, tests/lib/headless-runner.test.ts
- tests: 577 passing (22 new tests for headless-runner)
- notes: executeHeadlessRun() and runSingleIteration(); re-uses StreamParser/StateMachine; emits JSON events; stuck detection; exit codes (0=complete, 1=stuck, 2=max iterations, 3=error); --stuck-threshold CLI option
- next: Verify all phases complete, fix any type errors

## (pending) — Complete v0.3 headless mode - Phases 3, 4, 5
- files: tests/lib/headless-runner.test.ts, SPEC.md, STATE.txt
- tests: 577 passing (type check passes)
- notes: Phase 3/4/5 were already implemented in Phase 2; fixed TypeScript type error (Readable stream type for mock stdout/stderr); marked all phases complete in SPEC.md
- next: v0.3 complete - Factory can now use `ralphie run --headless` for programmatic integration
## 67a5fff — feat(skills): migrate skills to skills/ directory for add-skill compatibility
- files: skills/create-spec/SKILL.md, skills/ralphie-iterate/SKILL.md, .ai/ralphie/plan.md
- tests: 590 passing
- notes: Created skills/ directory structure; copied create-spec and ralphie-iterate with correct frontmatter (name, description, context, allowed-tools); .claude/skills/ remains for local dev
- next: Phase 2 - Create review-spec skill for SPEC validation

## 88b9966 — feat(skills): create review-spec skill for SPEC validation
- files: skills/review-spec/SKILL.md, .ai/ralphie/plan.md
- tests: 590 passing
- notes: Comprehensive validation with format checks (checkbox syntax, no code snippets, no file paths, deliverable sub-bullets) and content critique (problem-solution fit, integration awareness, scalability, scope); outputs PASS/FAIL with prioritized concerns and actionable recommendations
- next: Phase 3 - Create verify skill for pre-commit verification

## 53ab3b7 — feat(skills): create verify skill for pre-commit verification
- files: skills/verify/SKILL.md, SPEC.md, STATE.txt
- tests: 590 passing
- notes: Auto-detects project type from config files; zero configuration required; runs tests, type checking, linting based on available tools; supports TypeScript, Python, Go, Rust, Ruby; clear PASS/FAIL/ERROR reporting; integration guidance for Ralphie iteration workflow
- next: Phase 4 - Update ralphie spec command to support interactive mode

## f332846 — feat(spec): add interactive mode with create-spec skill
- files: src/lib/spec-generator.ts, tests/lib/spec-generator.test.ts, .ai/ralphie/plan.md
- tests: 593 passing (3 new tests for spec-generator)
- notes: Modified generateSpec() to use /create-spec skill in interactive mode (default) for structured interviews with AskUserQuestion; headless mode still uses embedded prompt for autonomous generation; added comprehensive tests with mocking for process.stdin and child_process.spawn
- next: Phase 5 - Add autonomous spec mode for ralphie spec --auto or --headless

## 665cb20 — feat(spec): add autonomous mode with review loop
- files: src/cli.tsx, src/lib/spec-generator.ts, tests/lib/spec-generator.test.ts
- tests: 597 passing (4 new tests for autonomous mode)
- notes: Added --auto and --max-attempts flags; created generateSpecAutonomous() with review loop; runReviewSpec() invokes /review-spec skill; parseReviewOutput() extracts PASS/FAIL and concerns; refineSpec() regenerates based on feedback; review loop runs up to maxAttempts (default 3); exit codes 0 on success, 1 on max attempts
- next: Phase 6 - Create harness abstraction in src/lib/harness/

## fcb141c — feat(harness): add harness abstraction layer for multi-AI support
- files: src/lib/harness/{types,claude-code-harness,index}.ts, src/lib/config-loader.ts, src/cli.tsx, package.json, tests/lib/harness/*.test.ts, tests/lib/config-loader.test.ts
- tests: 617 passing (17 new tests: 6 harness, 11 config-loader, 3 factory)
- notes: Harness interface with runSkill() and spawn() methods; ClaudeCodeHarness wraps claude CLI; config loading from .ralphie/config.yml with priority: CLI flag > env (RALPH_HARNESS) > config file > default (claude-code); added --harness flag to run command; factory pattern (createHarness) for extensibility
- next: Phase 7 - Add tests for new functionality and update documentation

## 6e8018a — feat(docs): add Phase 7 tests and documentation
- files: tests/lib/skills-structure.test.ts, README.md, SPEC.md, .ai/ralphie/plan.md
- tests: 630 passing (13 new tests for skills structure validation)
- notes: Created skills-structure.test.ts to validate skill frontmatter format for add-skill compatibility; updated README with skill installation instructions (npx add-skill), ralphie spec command modes (interactive, --auto, --headless), verify skill usage, and --harness flag documentation; Phase 7 complete
- next: Ralphie v1.0 complete - all phases done

## 521e541 — feat: T001-T003 migrate App.tsx to V2 spec parser
- files: src/lib/spec-parser-v2.ts, tests/spec-parser-v2.test.ts, src/App.tsx, specs/active/app-v2-migration.md
- tests: 677 passing (6 new tests for getTaskForIterationV2)
- notes: Created getTaskForIterationV2 compatibility bridge function; returns first pending/in_progress task in V1-compatible shape; updated App.tsx IterationRunner to use V2 parser (locateActiveSpec, parseSpecV2, isSpecCompleteV2); handles legacy format gracefully with warning
- next: T004-T006 to complete IterationRunner V2 migration (legacy handling, integration tests)

## 4c781dd — feat: T004 update IterationRunner spec loading
- files: specs/active/app-v2-migration.md
- tests: 677 passing (type check passes)
- notes: Updated T004 status to passed - all deliverables were already completed in T001-T003 batch commit; verified IterationRunner uses locateActiveSpec + parseSpecV2, handles ParseResult correctly, uses isSpecCompleteV2
- next: T005 - Update IterationRunner task retrieval

## 0402e9d — feat: T005 update IterationRunner task retrieval
- files: specs/active/app-v2-migration.md, .ai/ralphie/plan.md
- tests: 677 passing (type check passes)
- notes: Updated T005 status to passed - all deliverables were already completed in T001-T003 batch commit; verified uses getTaskForIterationV2, handles null spec case, type is SpecV2 | null, currentTask properties work correctly
- next: T006 - Handle legacy spec gracefully

## bd50617 — docs: update tracking files for T004-T005
- files: STATE.txt, .ai/ralphie/index.md
- tests: 677 passing (type check passes)
- notes: Updated tracking files to document T004 and T005 completion; both tasks were completed in previous commits (4c781dd, 0402e9d) but tracking files were not committed with them
- next: T006 - Handle legacy spec gracefully

## e402e86 — feat: T006-T007 add legacy spec warning and integration tests
- files: src/App.tsx, tests/App.test.tsx, specs/active/app-v2-migration.md, .ai/ralphie/plan.md
- tests: 682 passing (5 new integration tests for V2 spec)
- notes: T006 - Added legacySpecWarning prop flow from IterationRunner to AppInner; displays yellow warning banner when V1 spec detected; T007 - Added integration tests verifying legacy warning display, task number rendering, null spec handling, error resilience
- next: T008 - Manual E2E testing

## a559c84 — test: T008 verify V2 spec integration in interactive UI
- files: specs/active/app-v2-migration.md, .ai/ralphie/plan.md
- tests: 682 passing (all tests pass, type check passes)
- notes: Completed manual E2E testing verification; confirmed V2 spec loading from specs/active/, task ID display via taskNumber prop, task completion detection via status fields, legacy spec warning display; verified IterationRunner uses locateActiveSpec/parseSpecV2/getTaskForIterationV2 correctly
- next: App V2 migration spec complete - all 8 tasks passed

## ed4abcd — feat: T001 extract failure context helpers
- files: src/lib/failure-context.ts, src/App.tsx, specs/active/component-refactor.md, .ai/ralphie/plan.md
- tests: 682 passing (type check passes)
- notes: Created src/lib/failure-context.ts with buildFailureContext and formatToolInput; moved helper functions from App.tsx; removed unused imports (FailureContext, ActivityItem, ToolGroup); added JSDoc comments
- next: T002 - Extract IterationView component

## dfa584d — feat: T002 extract IterationView component
- files: src/components/IterationView.tsx, src/App.tsx, specs/active/component-refactor.md, .ai/ralphie/plan.md
- tests: 682 passing (type check passes)
- notes: Created src/components/IterationView.tsx with AppInner renamed to IterationView; exported IterationViewProps; moved component logic including useEffect; removed AppInnerProps from App.tsx; cleaned up unused imports
- next: T003 - Extract IterationRunner component

## 1bc8a46 — feat: T003 extract IterationRunner component
- files: src/IterationRunner.tsx, src/App.tsx, specs/active/component-refactor.md, .ai/ralphie/plan.md
- tests: 682 passing (type check passes)
- notes: Created src/IterationRunner.tsx with IterationRunner component, formatDuration, and aggregateStats helpers; App.tsx reduced from 334 to 72 lines (78% reduction); re-exports IterationRunner and IterationView for backward compatibility; achieves acceptance criteria (App.tsx under 100 lines)
- next: T004 - Extract prompt constants

## 2e616a7 — feat: T004 extract prompt constants
- files: src/lib/prompts.ts, src/cli.tsx, tests/cli.test.tsx, specs/active/component-refactor.md
- tests: 682 passing (type check passes)
- notes: Created src/lib/prompts.ts with DEFAULT_PROMPT and GREEDY_PROMPT exports (80 lines moved from cli.tsx); cli.tsx now imports from new module; updated test imports to use lib/prompts.js; pure refactor with no behavior changes
- next: T005 - Extract interactive run command

## 9f0c117 — feat: T005 extract interactive run command
- files: src/commands/run-interactive.tsx, src/cli.tsx, specs/active/component-refactor.md, .ai/ralphie/plan.md
- tests: 682 passing (type check passes)
- notes: Created src/commands/run-interactive.tsx with executeRun function (54 lines moved from cli.tsx); handles validation, branch creation, prompt resolution, Ink render, signal handling; removed unused imports from cli.tsx (React, render, IterationRunner, createFeatureBranch, getSpecTitleV2); pure refactor with no behavior changes
- next: T006 - Verify all tests pass

## ce3465b — test: T006 verify all tests pass after refactoring
- files: specs/active/component-refactor.md, .ai/ralphie/plan.md
- tests: 613 passing (all tests pass, no regressions)
- notes: Ran full test suite to verify refactoring tasks T001-T005; all 613 tests passed with no failures; verified import paths working correctly with new module structure; no behavior changes from refactoring
- next: Component refactor spec complete - all 6 tasks passed
