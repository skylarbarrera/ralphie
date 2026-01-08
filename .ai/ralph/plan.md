## Goal
Create StatusBar.tsx - Ink component that displays the bottom status bar with current phase and summary.

## Files
- src/components/StatusBar.tsx - new component
- tests/StatusBar.test.tsx - unit tests

## Design
The StatusBar component will:
1. Display a bottom border matching the header style
2. Show the current phase (idle, reading, editing, running, thinking, done)
3. Show elapsed time
4. Optionally show a summary message

Props interface:
```typescript
interface StatusBarProps {
  phase: Phase;
  elapsedSeconds: number;
  summary?: string;  // optional summary text
}
```

Display format (from PRD):
```
└─ Done (2m14s) ─────────────────────────────────────
```

Phase display mapping:
- idle → "Waiting..."
- reading → "Reading..."
- editing → "Editing..."
- running → "Running..."
- thinking → "Thinking..."
- done → "Done"

## Tests
- Renders idle phase correctly
- Renders reading phase correctly
- Renders editing phase correctly
- Renders running phase correctly
- Renders thinking phase correctly
- Renders done phase with elapsed time
- Renders custom summary when provided
- Formats elapsed time correctly (uses existing formatElapsedTime)
- Renders with correct colors/styling

## Exit Criteria
- Component renders all phases correctly
- Elapsed time is formatted properly
- Visual style matches IterationHeader (└─ pattern)
- Tests pass with good coverage
- No TypeScript errors
- Changes committed
