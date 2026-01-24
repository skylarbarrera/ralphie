---
problem: Need to capture and reuse learnings from task failures
solution: Implemented learnings capture system with automatic failed→passed detection
prevention: Use learnings system to document all failures that get fixed
tags:
  - learnings
  - architecture
  - patterns
  - compound-engineering
category: patterns
date: '2026-01-21'
---

## Context

Task T004 required implementing a learnings capture system as part of the compound engineering integration. The goal is to "turn failures into upgrades" by automatically documenting fixes when tasks transition from failed to passed status.

## Architecture

### Components

1. **Types** (`src/lib/learnings/types.ts`)
   - `LearningCategory`: build-errors, test-failures, runtime-errors, patterns
   - `LearningScope`: global vs project-specific
   - `LearningMetadata`: YAML frontmatter structure

2. **Manager** (`src/lib/learnings/manager.ts`)
   - `createLearning()`: Creates learning files with YAML frontmatter
   - `detectCategory()`: Auto-detects category from problem description
   - `decideLearningScope()`: Determines global vs project scope
   - `generateLearningFromFailure()`: Creates stub learning from failed task

3. **Status Tracker** (`src/lib/learnings/status-tracker.ts`)
   - `recordTaskStatuses()`: Tracks task status history in `.ralphie/.task-status.json`
   - `detectFailedToPassedTasks()`: Finds tasks that went failed→passed
   - Stores history as JSON array of `{taskId, status, timestamp}`

4. **Prompt Template** (`src/lib/learnings/prompt-template.ts`)
   - `generateLearningCaptureInstructions()`: Creates prompt for AI to complete learning
   - Tells AI to: document root cause, add test, suggest rule for `.claude/ralphie.md`

### Integration Points

**Headless Runner** (`src/lib/headless-runner.ts`):
- **Before iteration**: Check for failed→passed tasks, inject learning capture prompt
- **After iteration**: Record current task statuses for next iteration

**Learnings Search** (`src/lib/learnings-search.ts`):
- Already integrated (T005) - searches learnings before each iteration
- Search order: project learnings first, then global learnings

### Data Flow

```
Iteration 1: T001 fails
  └─> recordTaskStatuses() saves {T001: failed}

Iteration 2: T001 passes
  ├─> detectFailedToPassedTasks() finds T001
  ├─> generateLearningFromFailure() creates stub learning
  ├─> createLearning() writes to .ralphie/learnings/
  ├─> generateLearningCaptureInstructions() injects into prompt
  └─> AI completes the learning with:
      - Root cause analysis
      - Test that catches the bug
      - Rule suggestion for .claude/ralphie.md
```

## Storage Locations

**Project Learnings**: `.ralphie/learnings/`
- `build-errors/`
- `test-failures/`
- `runtime-errors/`
- `patterns/`

**Global Learnings**: `~/.ralphie/learnings/`
- Same structure, shared across all projects
- Build errors default to global
- Project-specific issues default to project

**Status Tracking**: `.ralphie/.task-status.json`
- Tracks task status history
- Used to detect failed→passed transitions
- Not committed to git

## Resolution

Successfully implemented all components with comprehensive tests:
- 17 tests for learnings manager
- 11 tests for status tracker
- All existing tests still pass (687 total)
- Type checks pass

The system gracefully handles errors - if status tracking fails (e.g., in mocked tests), it logs a warning but doesn't break the iteration.

## Test Added

Created comprehensive unit tests:
- `tests/lib/learnings/manager.test.ts`: Tests for slugify, detectCategory, decideLearningScope, createLearning, generateLearningFromFailure
- `tests/lib/learnings/status-tracker.test.ts`: Tests for status tracking, detection, and integration scenarios

## Rule Suggestion

Add to `.claude/ralphie.md`:
```markdown
## Learnings Capture

When a task fails then passes in subsequent iterations:
1. A stub learning file is automatically created
2. Complete the learning with:
   - Root cause analysis (what actually caused the failure)
   - Solution explanation (what fixed it)
   - Prevention strategy (how to avoid it)
   - Test that catches the bug
   - Rule suggestion for this file
3. Learnings are searchable and auto-injected into relevant future tasks
```
