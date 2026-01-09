# Ralph Runner v2 - Product Requirements Document

Enhance Ralph CLI with Claude Code-style activity feed, better pending states, and improved visual styling.

## Project Goals
- Replace grouped tool summary with rolling activity feed
- Show Claude Code-style context (thoughts, file operations, commits)
- Add pulsing/animated pending states
- Display commit hash + message per iteration
- Apply Claude Code visual style (cyan/green colors, bold accents)

## Technical Requirements
- TypeScript with tsx runner
- Ink 4.x for terminal UI
- ink-spinner for animated spinners
- Existing dependencies (no new packages needed)

## Display Example

```
┌─ Iteration 1/10 ──────────────────── 0:42 elapsed
│
│ ▶ "Implementing JWT authentication for the API..."
│
│ ● I'll implement JWT authentication for the API.
│
│ ● Reading project files...
│   ✓ Read PRD.md
│   ✓ Read progress.txt
│
│ ● Creating authentication module...
│   ✓ Created src/auth.ts
│   ⠋ Editing src/middleware.ts
│
│ ✓ a1b2c3d - feat(auth): add JWT authentication
│
└─ Running... (0:42) ───────────────────────────────
```

## Features

### Data Layer - Activity Tracking
- [x] Add `ActivityItem` type to `src/lib/types.ts` (thought, tool_start, tool_complete, commit)
- [x] Add `output?: string` to `CompletedTool` interface in `src/lib/state-machine.ts`
- [x] Add `activityLog: ActivityItem[]` to `IterationState`
- [x] Add `lastCommit: { hash, message }` to `IterationState`
- [x] Store tool output content in `handleToolEnd()`
- [x] Add `addActivityItem()` helper (cap at 50 items)
- [x] Add thoughts to activity log in `handleText()`

### Data Layer - Git Commit Parsing
- [x] Add `isGitCommitCommand()` method to detect git commit commands
- [x] Add `parseGitCommitOutput()` method with regex `/^\[[\w/-]+\s+([a-f0-9]{7,40})\]\s+(.+)$/m`
- [x] Parse and store commit hash + message when Bash runs git commit
- [x] Add commit as activity item when detected

### Hook Updates
- [x] Add `activityLog` to `ClaudeStreamState` in `src/hooks/useClaudeStream.ts`
- [x] Add `lastCommit` to `ClaudeStreamState`
- [x] Update `updateStateFromMachine()` to include new fields

### New Utilities
- [x] Create `src/lib/colors.ts` with Claude Code color scheme (cyan, green, yellow, red, magenta)
- [x] Create `src/hooks/usePulse.ts` hook for pulsing animations (toggle boolean on interval)

### New Components - Activity Feed
- [x] Create `src/components/ActivityFeed.tsx` - main container, renders last N items
- [x] Create `src/components/ThoughtItem.tsx` - displays `│ ● {thought text}`
- [x] Create `src/components/ToolActivityItem.tsx` - shows `│   ✓ Created src/auth.ts` or `│   ⠋ Editing...`
- [x] Create `src/components/CommitItem.tsx` - displays `│ ✓ a1b2c3d - commit message`
- [x] Create `src/components/PhaseIndicator.tsx` - pulsing phase indicator

### Component Updates - Styling
- [x] Update `src/components/IterationHeader.tsx` - bold text, cyan borders
- [x] Update `src/components/TaskTitle.tsx` - add pulse effect for pending
- [x] Update `src/components/StatusBar.tsx` - show commit info, Claude Code colors

### Integration
- [x] Update `src/App.tsx` - replace `<ToolList>` with `<ActivityFeed>`
- [x] Add `<PhaseIndicator>` to App layout
- [x] Show commit summary in iteration results

### Testing
- [x] Add tests for `parseGitCommitOutput()` in `tests/state-machine.test.ts`
- [x] Add tests for activity log updates
- [x] Create `tests/ActivityFeed.test.tsx` - test activity type rendering
- [x] Create `tests/usePulse.test.ts` - test animation hook
- [x] Verify existing tests still pass

## Activity Verbs

| Tool | Active | Complete |
|------|--------|----------|
| Read | Reading | Read |
| Edit | Editing | Edited |
| Write | Creating | Created |
| Bash | Running | Ran |
| Grep | Searching | Searched |
| Glob | Finding | Found |

## Color Scheme

| Element | Color |
|---------|-------|
| Borders | cyan |
| Success icons | green |
| Warnings | yellow |
| Errors | red |
| Read operations | cyan |
| Write operations | yellow |
| Commands | magenta |
| Meta operations | gray |

## Success Criteria
- Rolling activity feed shows operations as they happen
- Thoughts displayed with bullet points
- Git commits show hash + message
- Pulsing/animated pending states work
- Claude Code visual style applied throughout
- All existing tests pass
- New component tests written
