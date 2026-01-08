## Goal
Create ToolList.tsx - Ink component that displays a coalesced list of tools, showing active tools with spinners and completed tool groups with summaries.

## Files
- src/components/ToolList.tsx - new component
- tests/ToolList.test.tsx - unit tests

## Design
The ToolList component will:
1. Accept `toolGroups` (completed tool groups) and `activeTools` (currently running)
2. Display completed groups in coalesced format: `✓ Read 3 files (0.8s)`
3. Display active tools individually with spinners
4. Handle edge cases: empty lists, mixed states

Props interface:
```typescript
interface ToolListProps {
  toolGroups: ToolGroup[];      // from state-machine
  activeTools: ActiveTool[];    // from state-machine
}
```

Display format:
- Completed group with 1 tool: `│ ✓ Read file.ts (0.8s)`
- Completed group with N tools: `│ ✓ Read 3 files (1.2s)`
- Active tool: `│ ◐ Reading file.ts` (with spinner)

## Tests
- Renders empty state (no tools)
- Renders single completed tool
- Renders coalesced completed group (multiple tools)
- Renders active tool with spinner
- Renders mixed state (completed groups + active tools)
- Renders error state tools correctly
- Shows correct category verbs (Reading, Editing, Running, Processing)
- Shows correct duration formatting

## Exit Criteria
- Component renders all tool states correctly
- Tool groups are coalesced with count and total duration
- Active tools show spinners
- Tests pass with good coverage
- No TypeScript errors
- Changes committed
