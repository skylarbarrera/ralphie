## Goal
Run actual claude iteration and verify the CLI output works correctly end-to-end.

## Files
- No new files needed - this is a verification task
- May need minor fixes to existing files if issues are discovered

## Tests
- Run `npm run ralph -- -n 1 -p "echo hello world"` with a simple prompt
- Verify the UI displays correctly (iteration header, tool list, status bar)
- Verify JSONL logging works (check ./runs/ directory)
- Verify graceful completion

## Exit Criteria
- CLI runs without errors for a simple single-iteration task
- All UI components render correctly
- JSONL log file is created in ./runs/
- Process exits cleanly
- Any discovered bugs are fixed
- Task marked complete in PRD.md
