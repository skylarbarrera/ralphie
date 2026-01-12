## Goal
Update ralph init command to copy the skill directory (.claude/skills/ralph-iterate) if it exists in templates.

## Files
- src/commands/init.ts - add skill directory copying logic
- tests for init command (if they exist)

## Tests
- Verify skill directory is copied when it exists in templates
- Verify init still works when skill directory doesn't exist

## Exit Criteria
- ralph init copies .claude/skills/ directory from templates
- Existing init functionality unchanged
- Tests pass
- Changes committed
