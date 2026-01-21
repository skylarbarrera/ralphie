# Plan: T006 - Implement multi-agent review with cost tracking

## Goal
Add multi-agent review system with parallel execution and cost tracking for code quality analysis.

## Task ID
T006

## Files to Create/Modify

### Create:
- `src/lib/review.ts` - Core review orchestration logic
- `src/lib/cost-tracker.ts` - Cost calculation and tracking
- `tests/lib/review.test.ts` - Unit tests for review system
- `tests/lib/cost-tracker.test.ts` - Unit tests for cost tracking

### Modify:
- `src/commands/run.ts` - Add `--review` flag support
- `src/types.ts` - Add review types and interfaces
- `.ralphie/specs/active/compound-learnings.md` - Update T006 status

## Tests
- Unit tests for review orchestration
- Unit tests for cost calculation
- Test parallel execution of multiple reviewers
- Test language detection and reviewer selection
- Test severity parsing and P1 blocking
- Test cost tracking and display
- Integration test for `--review` flag

## Exit Criteria
- ✓ Review system loads agent prompts: security-sentinel, performance-oracle, architecture-strategist, typescript-reviewer, python-reviewer
- ✓ Language detection auto-selects relevant reviewers
- ✓ Reviewers run in parallel via Promise.all()
- ✓ Each reviewer outputs markdown findings
- ✓ Severity parsing: Critical/High → P1, Medium → P2, Low → P3
- ✓ Cost tracking displays: tokens (in/out) + estimated USD
- ✓ Pricing stored in settings for user override
- ✓ `ralphie run --review` flag implemented
- ✓ All tests pass
- ✓ Type check passes
- ✓ Manual verification: `ralphie run --review` in TypeScript project runs 4 reviewers with cost summary
