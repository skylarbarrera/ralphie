# Plan: Phase 1 - Skill Directory Migration

## Goal
Move skills from `.claude/skills/` to `skills/` directory at the project root, update skill frontmatter to match the add-skill format (from vercel-labs/add-skill), and maintain backward compatibility by keeping `.claude/skills/` as symlinks or copies for local development.

## Files to Create/Modify

### New Files
- `skills/create-spec/SKILL.md` - migrated from `.claude/skills/create-spec/SKILL.md`
- `skills/ralph-iterate/SKILL.md` - migrated from `.claude/skills/ralph-iterate/SKILL.md`

### Modified Files
- `.claude/skills/create-spec/SKILL.md` - potentially convert to symlink or keep as copy
- `.claude/skills/ralph-iterate/SKILL.md` - potentially convert to symlink or keep as copy

## Implementation Steps

1. **Research add-skill format**: Check what frontmatter format vercel-labs/add-skill expects
   - Look for examples in existing SKILL.md files
   - Identify required fields and structure

2. **Create skills/ directory structure**:
   - Create `skills/create-spec/` directory
   - Create `skills/ralph-iterate/` directory

3. **Migrate create-spec skill**:
   - Read existing `.claude/skills/create-spec/SKILL.md`
   - Update frontmatter to match add-skill format
   - Write to `skills/create-spec/SKILL.md`

4. **Migrate ralph-iterate skill**:
   - Read existing `.claude/skills/ralph-iterate/SKILL.md`
   - Update frontmatter to match add-skill format
   - Write to `skills/ralph-iterate/SKILL.md`

5. **Maintain backward compatibility**:
   - Keep `.claude/skills/` files as copies (symlinks may have issues on some platforms)
   - Document the relationship between the two directories

## Tests

- Verify `skills/` directory structure exists
- Verify both SKILL.md files have correct add-skill frontmatter format
- Verify `.claude/skills/` files still exist for local development
- Run existing tests to ensure no regressions

## Exit Criteria

- ✅ `skills/create-spec/SKILL.md` exists with correct add-skill frontmatter
- ✅ `skills/ralph-iterate/SKILL.md` exists with correct add-skill frontmatter
- ✅ `.claude/skills/` files remain unchanged for local development
- ✅ All existing tests pass
- ✅ Changes committed with descriptive message
