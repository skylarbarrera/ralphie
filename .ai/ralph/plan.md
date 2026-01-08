## Goal
Add git commit parsing to detect and log commits from Bash tool output.

## Files
- src/lib/state-machine.ts - add isGitCommitCommand(), parseGitCommitOutput(), integrate into handleToolEnd()
- tests/state-machine.test.ts - add tests for git commit parsing

## Tests
- isGitCommitCommand() detects `git commit` and `git commit -m`
- isGitCommitCommand() returns false for other commands
- parseGitCommitOutput() parses commit hash and message from output
- parseGitCommitOutput() returns null for non-commit output
- handleToolEnd() adds commit activity when git commit detected
- handleToolEnd() sets lastCommit when commit detected

## Exit Criteria
- isGitCommitCommand() correctly identifies git commit commands
- parseGitCommitOutput() extracts hash and message from output
- handleToolEnd() detects Bash git commit and adds to activity log
- lastCommit state is set when commit detected
- All tests pass
- Changes committed
