# Plan: Create review-spec skill

## Goal
Create a `review-spec` skill that validates SPEC.md files for format compliance and content quality. The skill should check for format issues (checkbox syntax, no code snippets, no file paths, deliverable sub-bullets) and provide content critique (problem-solution fit, integration awareness, scalability, scope).

## Files

### New Files
- `skills/review-spec/SKILL.md` - Main skill file with frontmatter and validation logic

### Files to Reference
- `skills/create-spec/SKILL.md` - For frontmatter format consistency
- `skills/ralph-iterate/SKILL.md` - For skill structure examples
- `SPEC.md` - Example of a well-formed spec to validate against

## Tests

Since this is a skill (markdown file with instructions for Claude), testing will be manual:
1. Verify frontmatter format matches add-skill standard (name, description, context, allowed-tools)
2. Review validation criteria are comprehensive
3. Ensure output format is clear and actionable

## Exit Criteria

- [x] `skills/review-spec/SKILL.md` exists with proper frontmatter
- [x] Format checks documented: checkbox syntax, no code snippets, no file paths, deliverable sub-bullets
- [x] Content critique documented: problem-solution fit, integration awareness, scalability, scope
- [x] Output format documented: PASS/FAIL on format, list of concerns, improvement suggestions
- [x] Skill follows add-skill frontmatter format (vercel-labs/add-skill)
- [x] Tests pass (npm test)
- [x] Type check passes (npm run type-check)
- [x] Changes committed with clear message
- [x] .ai/ralph/index.md, SPEC.md, STATE.txt updated
