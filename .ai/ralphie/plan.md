# Plan: T002 - Enhance spec gen with deep research phase

## Goal
Add deep research phase to spec generation using agent prompts to analyze codebase patterns before creating specs.

## Task ID
T002

## Files to Create/Modify

### Create:
- `src/lib/research-orchestrator.ts` - Core research orchestration logic
- `tests/lib/research-orchestrator.test.ts` - Unit tests for research orchestrator
- `.ralphie/settings.json` (example in templates) - MCP configuration

### Modify:
- `src/lib/spec-generator.ts` - Integrate research phase into spec generation
- `src/cli.tsx` - Add `--skip-research` flag to spec command
- `templates/.ralphie/settings.json` - Add MCP configuration template
- `.ralphie/specs/active/compound-learnings.md` - Update T002 status

## Tests
1. Unit tests for research orchestrator (search patterns, run research agents)
2. Unit tests for spec-generator integration (research before spec gen)
3. Integration test for `--skip-research` flag behavior

## Exit Criteria
- `ralphie spec "add auth"` shows research phase in output
- Research output saved to `.ralphie/research-context.md`
- Research findings injected into spec generation prompt
- `ralphie spec "add auth" --skip-research` bypasses research phase
- All tests pass (npm test)
- Type check passes (npm run type-check)
- Verify command passes: `ralphie spec "add auth"` shows research phase, output includes codebase patterns
