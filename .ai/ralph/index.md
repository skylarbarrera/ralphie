# Ralph Memory Index

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

## ca9595d — Add JSONL stream parser for Claude output
- files: src/lib/types.ts, src/lib/stream-parser.ts, tests/stream-parser.test.ts
- tests: 25 passing (95% coverage)
- notes: EventEmitter-based parser handles all envelope types, correlates tool_use/tool_result
- next: Create state machine to track iteration state

## 39c2e45 — Add state machine for iteration tracking
- files: src/lib/state-machine.ts, tests/state-machine.test.ts
- tests: 41 passing (97% coverage)
- notes: Tracks phases, tool categories, coalesces tool groups, generates display summaries
- next: Create tool-categories.ts for configurable tool mapping

## 802598d — Add tool-categories module for configurable tool mapping
- files: src/lib/tool-categories.ts, tests/tool-categories.test.ts, src/lib/state-machine.ts
- tests: 30 passing (100% coverage)
- notes: Icons (◐✎⚡○✓✗), verbs, display helpers; refactored state-machine to use module
- next: Create JSONL logger for raw output tee to disk

## e14a41b — Add JSONL logger for raw output tee to disk
- files: src/lib/logger.ts, tests/logger.test.ts
- tests: 18 passing (100% coverage)
- notes: Creates ./runs/{ISO-timestamp}.jsonl files, auto-creates directory, handles objects and raw lines
- next: Create Ink components for terminal UI

## 3397c6f — Add IterationHeader Ink component
- files: src/components/IterationHeader.tsx, tests/IterationHeader.test.tsx
- tests: 13 passing
- notes: First UI component; displays `┌─ Iteration 1/10 ──── 0:42 elapsed`; formatElapsedTime helper
- next: Create TaskTitle.tsx component

## 95171c4 — Add TaskTitle Ink component
- files: src/components/TaskTitle.tsx, tests/TaskTitle.test.tsx
- tests: 16 passing
- notes: Displays `│ ▶ "First assistant text..."` with truncation support
- next: Create ToolItem.tsx component

## 8455922 — Add ToolItem Ink component
- files: src/components/ToolItem.tsx, tests/ToolItem.test.tsx
- tests: 18 passing
- notes: Displays single tool with spinner/checkmark/error icon, category verb, and duration
- next: Create ToolList.tsx component

## 7bc8921 — Add ToolList Ink component
- files: src/components/ToolList.tsx, tests/ToolList.test.tsx
- tests: 19 passing
- notes: Coalesced tool list; shows completed groups with count/duration, active tools with spinners
- next: Create StatusBar.tsx component

## cfc6f79 — Add StatusBar Ink component
- files: src/components/StatusBar.tsx, tests/StatusBar.test.tsx
- tests: 20 passing
- notes: Bottom status bar with phase and elapsed time; supports custom summary; matches header style
- next: Create useClaudeStream React hook

## c225b44 — Add useClaudeStream React hook
- files: src/hooks/useClaudeStream.ts, tests/useClaudeStream.test.tsx
- tests: 15 passing (integration tests)
- notes: Spawns claude, parses JSONL stream, updates state machine; handles idle timeout and cleanup
- next: Create App.tsx main component

## d1d9da8 — Add App.tsx main Ink component
- files: src/App.tsx, tests/App.test.tsx
- tests: 22 passing
- notes: Composes IterationHeader, TaskTitle, ToolList, StatusBar; uses useClaudeStream for state; _mockState prop for testing
- next: Create cli.tsx entry point

## b8fa540 — Add CLI entry point with commander
- files: src/cli.tsx, tests/cli.test.tsx
- tests: 17 passing
- notes: Parses all CLI options (-n, -p, --prompt-file, --cwd, --timeout-idle, --save-jsonl, --quiet, --title); DEFAULT_PROMPT for Ralph loop; graceful shutdown
- next: Handle iteration loop and final summary in App

## fda16d0 — Add iteration loop and final summary display
- files: src/App.tsx, src/cli.tsx, tests/App.test.tsx
- tests: 37 passing (was 22)
- notes: IterationRunner manages sequential iterations; aggregates stats; displays final summary with per-iteration results
- next: Run actual claude iteration and verify output

## 99f0427 — Fix bugs and verify end-to-end output
- files: src/hooks/useClaudeStream.ts, src/lib/logger.ts, src/lib/state-machine.ts, src/lib/tool-categories.ts, src/components/ToolList.tsx, tests/
- tests: 268 passing
- notes: Added --verbose flag (required for stream-json); fixed logger path handling; added input to CompletedTool for display names
- next: Add activity log tracking for rolling activity feed

## d409c6f — Add activity log and output tracking
- files: src/lib/types.ts, src/lib/state-machine.ts, tests/state-machine.test.ts
- tests: 277 passing (9 new)
- notes: ActivityItem type (thought/tool_start/tool_complete/commit), output in CompletedTool, activityLog capped at 50 items
- next: Add git commit parsing to detect and log commits

## 2c49b20 — Add git commit parsing and detection
- files: src/lib/state-machine.ts, tests/state-machine.test.ts
- tests: 299 passing (22 new)
- notes: isGitCommitCommand() detects git commit; parseGitCommitOutput() extracts hash+message; integrated into handleToolEnd()
- next: Add activityLog and lastCommit to useClaudeStream hook

## 6a1e134 — Add activityLog and lastCommit to ClaudeStreamState
- files: src/hooks/useClaudeStream.ts, tests/useClaudeStream.test.tsx
- tests: 303 passing (4 new)
- notes: Hook now exposes activityLog and lastCommit from state machine
- next: Create colors module with Claude Code color scheme

## e7f6f27 — Add colors module with Claude Code color scheme
- files: src/lib/colors.ts, tests/colors.test.ts, tests/App.test.tsx
- tests: 326 passing (23 new)
- notes: COLORS, ELEMENT_COLORS, CATEGORY_COLORS, STATE_COLORS; helper functions for status/category/state colors
- next: Create usePulse hook for pulsing animations

## 3f17c24 — Add usePulse hook for pulsing animations
- files: src/hooks/usePulse.ts, tests/usePulse.test.tsx
- tests: 341 passing (15 new)
- notes: Toggle boolean on configurable interval; supports enabled option; cleans up on unmount
- next: Create ActivityFeed component for rolling activity display

## ad5951d — Add ActivityFeed component for rolling activity display
- files: src/components/ActivityFeed.tsx, tests/ActivityFeed.test.tsx
- tests: 356 passing (15 new)
- notes: Renders thoughts (●), tool_start (spinner), tool_complete (✓/✗), commits; maxItems limits display to recent N items
- next: Create ThoughtItem, ToolActivityItem, CommitItem components

## 79f4019 — Extract ThoughtItem into standalone component
- files: src/components/ThoughtItem.tsx, tests/ThoughtItem.test.tsx, src/components/ActivityFeed.tsx
- tests: 367 passing (11 new)
- notes: Displays │ ● {thought text} with ELEMENT_COLORS; ActivityFeed now imports from ThoughtItem.tsx
- next: Create ToolActivityItem, CommitItem, PhaseIndicator components

## 8e4ff09 — Extract ToolActivityItem into standalone component
- files: src/components/ToolActivityItem.tsx, tests/ToolActivityItem.test.tsx, src/components/ActivityFeed.tsx
- tests: 392 passing (25 new)
- notes: ToolStartItem (spinner + displayName), ToolCompleteItem (✓/✗ + duration); category-based colors
- next: Create CommitItem, PhaseIndicator components

## 23e5163 — Extract CommitItem into standalone component
- files: src/components/CommitItem.tsx, tests/CommitItem.test.tsx, src/components/ActivityFeed.tsx
- tests: 410 passing (18 new)
- notes: Displays │ ✓ {short hash (7 chars)} - {message}; ActivityFeed imports from CommitItem.tsx
- next: Create PhaseIndicator component

## 8d82967 — Add PhaseIndicator component with pulsing animation
- files: src/components/PhaseIndicator.tsx, tests/PhaseIndicator.test.tsx
- tests: 438 passing (28 new)
- notes: Phase icons (○◐✎⚡●✓), labels, usePulse for active phases; cyan/gray pulsing effect
- next: Update IterationHeader, TaskTitle, StatusBar with Claude Code styling

## 6b946d5 — Add pulse effect to TaskTitle for pending state
- files: src/components/TaskTitle.tsx, tests/TaskTitle.test.tsx
- tests: 445 passing (6 new)
- notes: isPending prop enables usePulse; ELEMENT_COLORS for styling; icon pulses green/gray
- next: Update StatusBar with commit info and Claude Code colors

## b5187f5 — Add commit info display and ELEMENT_COLORS to StatusBar
- files: src/components/StatusBar.tsx, tests/StatusBar.test.tsx
- tests: 455 passing (10 new)
- notes: lastCommit prop, formatCommitInfo helper, commit display above status bar
- next: Integrate ActivityFeed and PhaseIndicator into App

## 7de5578 — Integrate ActivityFeed and PhaseIndicator into App
- files: src/App.tsx, tests/App.test.tsx, SPEC.md, STATE.txt
- tests: 464 passing (9 new)
- notes: Replaced ToolList with ActivityFeed; added PhaseIndicator; lastCommit in IterationResult
- next: Add Claude Code native features to Ralph v3

## 12064c5 — Add AskUserQuestion protocol for SPEC creation interviews
- files: templates/.claude/ralph.md
- tests: N/A (documentation only)
- notes: Added "Creating SPECs (Interactive)" section with 3 question batches (technical foundation, feature scope, quality gates)
- next: Add Task(Explore) protocol to Planning Phase section

## 953b42c — Add Task(Explore) protocol for parallel codebase exploration
- files: templates/.claude/ralph.md
- tests: N/A (documentation only)
- notes: Added step to Planning Phase for spawning exploration agents; detailed protocol with when to explore/skip, example code, guidance on using results
- next: Add code review protocol after Task Completion Criteria

## 81f9433 — Add code review protocol for pre-commit agent review
- files: templates/.claude/ralph.md
- tests: N/A (documentation only)
- notes: New "Code Review Protocol" section with Task agent example, when to review/skip, handling CRITICAL vs SUGGESTIONS, example flow
- next: Add TodoWrite protocol for sub-task tracking

## 81b8407 — Add TodoWrite protocol for sub-task tracking
- files: templates/.claude/ralph.md
- tests: N/A (documentation only)
- notes: New "Sub-Task Tracking Protocol" section with TodoWrite structure, example call, workflow, integration diagram with SPEC tasks
- next: Create /ralph-iterate skill

## d867cb4 — Create ralph-iterate skill with frontmatter
- files: .claude/skills/ralph-iterate/SKILL.md
- tests: N/A (skill configuration)
- notes: Frontmatter (name, description, context: fork, allowed-tools); body has 6 steps (Load Context, Explore, Plan, Implement, Review, Commit)
- next: Verify/enhance skill body steps (Load Context step)

## 6c6645a — Enhance Load Context step with detailed TodoWrite guidance
- files: .claude/skills/ralph-iterate/SKILL.md, .ai/ralph/plan.md
- tests: N/A (documentation)
- notes: Added 4 sub-sections (SPEC reading, STATE.txt, index.md, TodoWrite); explicit TodoWrite example with all fields; skip guidance
- next: Enhance Explore step (spawn parallel Task(Explore) agents)

## 424eba4 — Enhance Explore step with parallel agent guidance
- files: .claude/skills/ralph-iterate/SKILL.md, .ai/ralph/plan.md
- tests: N/A (documentation)
- notes: Added 4 sub-sections (when to explore, spawn parallel agents, what to explore, using results); example with 3 concurrent Task(Explore) calls; table of exploration prompts
- next: Enhance Plan step (write plan.md with goal, files, tests, exit criteria)

## 1125a3a — Enhance Plan step with detailed guidance for writing plan.md
- files: .claude/skills/ralph-iterate/SKILL.md, .ai/ralph/plan.md
- tests: N/A (documentation)
- notes: Added 4 sub-sections (Write the Goal, List the Files, Define the Tests, Set Exit Criteria); good/bad goal examples; complete plan template; post-planning workflow
- next: Enhance Implement step (code + tests, run npm test and type-check)

## 9ba6886 — Enhance Implement step with detailed code and test guidance
- files: .claude/skills/ralph-iterate/SKILL.md, .ai/ralph/plan.md
- tests: N/A (documentation)
- notes: Added 5 sub-sections (Write the Code, Write the Tests, Run Tests, Run Type Check, Handle Failures); TodoWrite status updates; implementation checklist; common type errors table
- next: Enhance Review step (spawn Task agent for code review)

## a4f96a6 — Enhance Review step with detailed code review guidance
- files: .claude/skills/ralph-iterate/SKILL.md, .ai/ralph/plan.md
- tests: N/A (documentation)
- notes: Added 5 sub-sections (When to Review, Spawn Review Agent, Handle Review Feedback, Review Flow Example, Update TodoWrite); handling table for CRITICAL/SUGGESTIONS/APPROVED; re-review flow
- next: Enhance Commit step (git commit, update index.md, check SPEC task)
