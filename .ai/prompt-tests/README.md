# Spec Generation Prompt Testing Framework

A framework for measuring the impact of prompt changes on spec generation quality.

## Purpose

When iterating on spec generation prompts (in `skills/create-spec/SKILL.md` or `src/lib/spec-generator.ts`), you need to measure whether changes actually improve output quality. This framework:

1. Defines diverse test cases (greenfield, brownfield, different domains)
2. Runs `ralphie init --headless` with each test case
3. Scores the generated SPEC.md on structure, content, and quality
4. Compares BEFORE vs AFTER results

## Test Cases

| ID | Category | Description |
|----|----------|-------------|
| `greenfield-game-engine` | Greenfield | 2D game engine with rendering, physics, input |
| `greenfield-frontend` | Greenfield | React dashboard with charts, tables, WebSocket |
| `greenfield-trading` | Greenfield | Stock trading simulator with portfolio, orders |
| `brownfield-feature` | Brownfield | Add JWT auth to existing REST API |
| `brownfield-refactor` | Brownfield | Refactor JS to TypeScript with separation of concerns |
| `cli-tool` | Greenfield | File organizer CLI with undo support |

## Scoring

Each generated SPEC.md is scored on 100 points:

### Structure (45 points)
- Has `## Goal` section: 10
- Has phase organization: 10
- Tasks have checkboxes: 10
- Tasks have Verify sections: 15

### Content (45 points)
- No code snippets outside Verify: 15
- No file:line references: 10
- No shell commands in task deliverables: 10
- Deliverables, not instructions: 10

### Quality (10 points)
- Appropriate task count: 10
- Contains expected terms: +2 each
- Contains forbidden terms: -5 each

## Quick Start

### Full Workflow (Recommended)

```bash
# 1. Make changes to prompt files
vim skills/create-spec/SKILL.md
vim src/lib/spec-generator.ts

# 2. Run complete before/after comparison
./.ai/prompt-tests/test-workflow.sh full
```

### Step-by-Step

```bash
# 1. Stash changes and test with OLD prompts
./.ai/prompt-tests/test-workflow.sh before

# 2. Restore changes and test with NEW prompts
./.ai/prompt-tests/test-workflow.sh after

# 3. Compare results
./.ai/prompt-tests/test-workflow.sh compare
```

### Manual Commands

```bash
# Run BEFORE tests
npx tsx .ai/prompt-tests/run-tests.ts --phase before

# Run AFTER tests
npx tsx .ai/prompt-tests/run-tests.ts --phase after

# Compare results
npx tsx .ai/prompt-tests/run-tests.ts --compare
```

## Output

Results are saved to `.ai/prompt-tests/results/`:

- `before-{timestamp}.json` - Full results from BEFORE tests
- `after-{timestamp}.json` - Full results from AFTER tests
- `comparison-{timestamp}.json` - Side-by-side comparison

### Example Comparison Output

```
BEFORE vs AFTER COMPARISON
======================================================================

BEFORE: 2024-01-15T10:00:00Z (abc1234)
AFTER:  2024-01-15T11:00:00Z (def5678)

----------------------------------------------------------------------
SUMMARY COMPARISON
----------------------------------------------------------------------
Metric                         BEFORE       AFTER       DELTA
Passed                              2           4          +2
Failed                              4           2          -2
Avg Score                        45.2        68.5       +23.3
Avg Duration (ms)               15000       18000       +3000

----------------------------------------------------------------------
PER-TEST COMPARISON
----------------------------------------------------------------------
Test                               BEFORE       AFTER       DELTA
Greenfield: Game Engine               42          71        +29 ✓
Greenfield: React Dashboard           38          65        +27 ✓
Greenfield: Trading Simulator         45          72        +27 ✓
Brownfield: Add Auth to Existing      52          68        +16 ✓
Brownfield: Refactor to TypeScript    48          62        +14 ✓
Greenfield: CLI File Organizer        46          73        +27 ✓
```

## Adding Test Cases

Edit `test-cases.json`:

```json
{
  "id": "new-test-case",
  "name": "Category: Descriptive Name",
  "category": "greenfield|brownfield",
  "description": "Detailed prompt that describes what to build",
  "cwd": "/tmp/ralphie-test/new-test",
  "setup": "mkdir -p /tmp/ralphie-test/new-test && npm init -y",
  "expected": {
    "min_tasks": 3,
    "max_tasks": 8,
    "must_contain": ["keyword1", "keyword2"],
    "must_not_contain": ["npm install", "```typescript"]
  }
}
```

## Cleanup

```bash
# Remove test directories and results
./.ai/prompt-tests/test-workflow.sh clean
```

## Requirements

- Node.js 18+
- `npx tsx` for running TypeScript
- `ralphie` CLI installed (`npm link` in project root)
- `ANTHROPIC_API_KEY` environment variable set

## Cost Estimate

Each test case runs `ralphie init --headless`, which typically uses:
- 5-15k input tokens
- 2-5k output tokens

With 6 test cases × 2 phases (before/after):
- ~12 API calls
- ~$0.50-2.00 total (depending on model)

## Interpreting Results

### Good Changes (Commit)
- Avg Score increases by >10 points
- More tests pass
- Violations decrease

### Neutral Changes (Consider)
- Score changes <5 points
- Same pass/fail count
- Tradeoffs (faster but lower quality, or vice versa)

### Bad Changes (Revert)
- Score decreases
- More tests fail
- New violations appear
