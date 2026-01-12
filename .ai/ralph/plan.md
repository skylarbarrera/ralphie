## Goal
Add code review protocol to ralph.md - spawn a Task agent for code review before committing.

## Files
- templates/.claude/ralph.md - add new "Code Review Protocol" section after "Task Completion Criteria"

## Content to Add
A new section that documents:
1. When to spawn a code review agent (after tests pass, before committing)
2. Task agent call example with review prompt
3. What the agent reviews (code quality, test coverage, patterns, security)
4. How to handle review feedback (critical vs suggestions)
5. When to skip review (trivial changes)

## Exit Criteria
- New "Code Review Protocol" section added after "Task Completion Criteria"
- Includes Task agent example with appropriate prompt
- Documents review categories and how to handle feedback
- Fits Ralph's style (concise, practical)
- Changes committed with clear message
