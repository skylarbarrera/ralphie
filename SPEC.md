# Ralph v3 - Claude Code Native Features Integration

Enhance Ralph to leverage Claude Code's native capabilities: AskUserQuestion for SPEC interviews, Task agents for parallel exploration and code review, TodoWrite for sub-task tracking, a /ralph-iterate skill, and Stop hook validation.

## Project Goals
- Use AskUserQuestion tool for structured SPEC creation interviews
- Spawn Task(Explore) agents for parallel codebase understanding
- Add automatic code review via Task agent after implementation
- Use TodoWrite for breaking down current task into sub-tasks
- Create /ralph-iterate skill that encapsulates the iteration protocol
- Add LLM-based Stop hook to validate iteration completion

## Phase 1: Update ralph.md with Native Tool Protocols

- [x] Add AskUserQuestion protocol to "Creating SPECs" section in templates/.claude/ralph.md - define 3 question batches (technical foundation, feature scope, quality gates) with specific options
- [x] Add Task(Explore) protocol to "Planning Phase" section - spawn parallel exploration agents before implementation
- [x] Add code review protocol after "Task Completion Criteria" - spawn review agent before committing
- [x] Add TodoWrite protocol for sub-task tracking - use TodoWrite to break down current SPEC task into actionable sub-steps

## Phase 2: Create /ralph-iterate Skill

- [x] Create .claude/skills/ralph-iterate/SKILL.md with frontmatter (name, description, allowed-tools, context: fork)
- [x] Write skill body: Load Context step (read SPEC, index.md, use TodoWrite for sub-tasks)
- [x] Write skill body: Explore step (spawn parallel Task(Explore) agents for codebase understanding)
- [x] Write skill body: Plan step (write plan.md with goal, files, tests, exit criteria)
- [x] Write skill body: Implement step (code + tests, run npm test and type-check)
- [x] Write skill body: Review step (spawn Task agent for code review, address critical issues)
- [x] Write skill body: Commit step (git commit, update index.md, check SPEC task)

## Phase 3: Add Stop Hook Validation

- [ ] Create scripts/validate-iteration.md with LLM prompt for iteration validation (check: task implemented, tests pass, commit made, index.md updated)
- [ ] Add hook configuration example to templates/.claude/settings.json.example for Stop hook with type: prompt
- [ ] Document hook setup in templates/.claude/ralph.md under new "Hooks Configuration" section

## Phase 4: Update Templates and Documentation

- [ ] Update templates/.claude/ralph.md to sync with .claude/CLAUDE.md (they should match)
- [ ] Add "Claude Code Native Features" section to ralph.md explaining the integration
- [ ] Update ralph init command to copy skill directory if it exists

## Phase 5: Testing and Validation

- [ ] Test AskUserQuestion flow manually - verify structured interview produces good SPEC
- [ ] Test /ralph-iterate skill in isolation - verify it follows the protocol
- [ ] Test Stop hook validation - verify it catches incomplete iterations
- [ ] Run full ralph run -n 3 with new features on a test project

## Success Criteria
- SPEC creation uses AskUserQuestion with structured options
- Each iteration spawns exploration agents before planning
- Code review agent runs before each commit
- TodoWrite shows sub-task progress during iteration
- /ralph-iterate skill can be invoked standalone
- Stop hook catches iterations that didn't complete properly
- All existing tests still pass
