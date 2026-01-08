## Goal
Extract ToolActivityItem from ActivityFeed into standalone component (handles both tool_start and tool_complete).

## Files
- src/components/ToolActivityItem.tsx - new component with ToolStartItem and ToolCompleteItem
- tests/ToolActivityItem.test.tsx - unit tests
- src/components/ActivityFeed.tsx - update to import from ToolActivityItem.tsx

## Tests
- ToolStartItem renders spinner with tool displayName
- ToolStartItem uses category-based color for spinner
- ToolCompleteItem renders checkmark icon for success
- ToolCompleteItem renders error icon for errors
- ToolCompleteItem shows duration in seconds
- Both render border character (│) with proper indentation
- Handles empty displayName
- Handles different tool categories (read/write/command/meta)

## Exit Criteria
- ToolActivityItem.tsx created with exported ToolStartItem and ToolCompleteItem
- Tests pass with good coverage
- ActivityFeed updated to import from new file
- All existing tests still pass
- Changes committed
