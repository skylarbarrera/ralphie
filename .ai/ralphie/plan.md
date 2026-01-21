# Plan: T003 Add SpecFlow analyzer for spec validation

## Goal
Integrate spec-flow-analyzer agent to validate spec completeness after generation

## Task ID
T003

## Files to Create/Modify

### Create:
- `src/lib/spec-analyzer.ts` - Core analyzer orchestration logic
- `tests/lib/spec-analyzer.test.ts` - Unit tests for analyzer

### Modify:
- `src/lib/spec-generator.ts` - Integrate analysis after spec generation
- `src/cli.tsx` - Add `--skip-analyze` flag to spec command
- `.ralphie/specs/active/compound-learnings.md` - Update T003 status

## Tests
- Test loadAnalyzerPrompt() loads spec-flow-analyzer.md
- Test runAnalyzer() calls harness with correct prompt
- Test analyzeSpec() orchestrates analysis flow
- Test autonomous mode runs refinement when gaps found
- Test interactive mode skips auto-refinement
- Test --skip-analyze flag bypasses analysis
- Test analysis failures are non-fatal

## Exit Criteria
- ✓ Analyzer uses spec-flow-analyzer prompt from T008
- ✓ Analysis runs AFTER spec generation automatically
- ✓ Output saved to `.ralphie/analysis.md`
- ✓ Autonomous mode: runs refinement if gaps found
- ✓ Interactive mode: presents gaps to user (no auto-fix)
- ✓ `--skip-analyze` flag implemented
- ✓ Analysis failures don't break spec generation
- ✓ All tests pass
- ✓ Type check passes
- ✓ Manual verification: `ralphie spec "feature"` shows analysis phase
