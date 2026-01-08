## Goal
Extract ThoughtItem from ActivityFeed into a standalone component file with tests.

## Files
- src/components/ThoughtItem.tsx - new standalone component
- tests/ThoughtItem.test.tsx - unit tests
- src/components/ActivityFeed.tsx - update to import ThoughtItem

## Tests
- Renders thought text with bullet prefix (● symbol)
- Displays border character (│)
- Uses correct colors from ELEMENT_COLORS
- Handles empty text
- Handles long text

## Exit Criteria
- ThoughtItem.tsx created and exported
- Tests pass with good coverage
- ActivityFeed updated to import from new file
- All existing tests still pass
- Changes committed
