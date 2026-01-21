# Plan: T009 - Update /ralphie-spec skill for new flow

## Goal
Enhance ralphie-spec skill with research and analysis phases for thorough 80/20 workflow

## Task ID
T009

## Files
- `skills/ralphie-spec/SKILL.md` - Add research and analysis steps to workflow
- `.ralphie/specs/active/compound-learnings.md` - Update task status

## Tests
- No code changes, documentation only
- Manual verification that the skill instructions are clear

## Exit Criteria
1. ✅ Skill includes Research phase BEFORE interview
2. ✅ Skill includes Analysis phase AFTER spec draft
3. ✅ Flow updated: Research → Interview → Draft → Analyze → Review Gaps → Finalize
4. ✅ Instructions to read `.ralphie/research-context.md` if exists
5. ✅ Instructions to run analysis and present gaps before user approval
6. ✅ Skill remains self-contained (doesn't call harness, just prompts AI)
7. ✅ Task marked as passed in spec

## Notes
The skill is used interactively (user present), so it needs to:
- Check for `.ralphie/research-context.md` and incorporate findings if available
- After drafting spec, read `.ralphie/analysis.md` if exists and present gaps to user
- Not call harness directly (that's Ralphie CLI's job), just read the outputs
- Guide the AI to incorporate research and analysis findings into the interview and spec
