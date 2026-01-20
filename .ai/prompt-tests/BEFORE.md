# BEFORE State Analysis

## Files Analyzed

| File | Lines | State |
|------|-------|-------|
| `spec-generator.ts` | 661 | Complex orchestrator |
| `harness/claude.ts` | 107 | Basic SDK wrapper |
| `harness/types.ts` | 76 | No interactive option |
| `create-spec/SKILL.md` | 168 | Interview-only |

## Code Architecture

### spec-generator.ts

**Pattern**: Fat orchestrator with embedded prompts

```
├── SPEC_GENERATION_PROMPT (80+ lines embedded)
├── INTERACTIVE_ADDENDUM
├── HEADLESS_ADDENDUM
├── generateSpec() - router function
├── generateSpecInteractive() - uses spawn('claude', ...)
├── generateSpecHeadless() - uses harness with stream parsing
├── generateSpecAutonomous() - own review loop
├── runReviewSpec() - spawns review agent
├── parseReviewOutput() - parses PASS/FAIL from output
└── refineSpec() - applies review feedback
```

**Problems identified:**
1. **Dual code paths**: Interactive uses `spawn()` (subprocess), headless uses harness
2. **Embedded prompts**: 80+ lines of prompt text in TypeScript file
3. **Duplicate logic**: Review loop implemented here AND in skill
4. **Tight coupling**: Parsing review output requires understanding skill's output format
5. **No terminal interaction**: AskUserQuestion in harness mode has no user input

### harness/claude.ts

**Pattern**: Basic SDK wrapper

```typescript
query({
  prompt,
  options: {
    cwd: options.cwd,
    permissionMode: 'bypassPermissions',
    allowedTools: options.allowedTools,
    model: options.model,
    systemPrompt: options.systemPrompt,
    // NO canUseTool callback
  },
});
```

**Problems:**
1. **No AskUserQuestion handling**: When skill calls AskUserQuestion, there's no mechanism to prompt the user
2. **No interactive/headless distinction**: Harness doesn't know the mode
3. **SDK capability unused**: Claude Agent SDK supports `canUseTool` but we don't use it

### create-spec/SKILL.md

**Pattern**: Interview-first, assumes interactive user

**Workflow:**
```
Interview → Generate → Review → Finalize
```

**Problems:**
1. **No inference mode**: Skill assumes user is present for interview
2. **Headless failure**: Without user, AskUserQuestion blocks or gets ignored
3. **Limited tools**: `allowed-tools: Read, Write, Edit, AskUserQuestion, Task`
   - No Glob/Grep for codebase analysis in inference mode
4. **Single finalization path**: Always shows interactive "Ready to proceed?" prompt

## Test Case Analysis

### TC1: Headless Spec Generation

**Command**: `ralphie init --headless -d "Build a REST API"`

**Expected BEFORE behavior:**
1. spec-generator routes to `generateSpecHeadless()`
2. Uses embedded SPEC_GENERATION_PROMPT + HEADLESS_ADDENDUM
3. Harness runs prompt directly (no skill invocation)
4. No codebase exploration (skill with Glob/Grep not used)
5. Review loop runs via `runReviewSpec()` (separate harness call)

**Issues:**
- Duplicates skill logic in spec-generator
- No true inference from codebase
- Review loop is redundant with skill's own review

### TC2: Interactive Spec Generation

**Command**: `ralphie init -d "Build a CLI calculator"`

**Expected BEFORE behavior:**
1. spec-generator routes to `generateSpecInteractive()`
2. Spawns `claude --dangerously-skip-permissions` as subprocess
3. Writes `/create-spec` prompt to stdin
4. Inherits stdio for user interaction

**Issues:**
- Uses subprocess instead of harness
- Inconsistent with other harness-based operations
- Can't leverage SDK features like canUseTool

### TC3: AskUserQuestion in Harness Mode

**Scenario**: Skill calls AskUserQuestion while running through harness

**Expected BEFORE behavior:**
1. SDK sees AskUserQuestion tool call
2. No canUseTool callback to intercept
3. Tool executes with... undefined behavior?
4. User cannot answer questions

**Issues:**
- AskUserQuestion becomes unusable in harness mode
- Forces interactive mode to use subprocess instead

## Quality Metrics (BEFORE)

| Metric | Score | Notes |
|--------|-------|-------|
| Code DRY-ness | 3/10 | Prompts duplicated between skill and spec-gen |
| Architectural consistency | 4/10 | Subprocess vs harness split |
| Feature parity | 5/10 | Headless lacks codebase inference |
| SDK utilization | 4/10 | canUseTool unused |
| Maintainability | 4/10 | 661 lines, multiple code paths |
| Test coverage | 7/10 | Tests exist but test old architecture |
