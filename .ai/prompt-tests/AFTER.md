# AFTER State Analysis

## Files Analyzed

| File | Lines | State |
|------|-------|-------|
| `spec-generator.ts` | 163 | Thin wrapper |
| `harness/claude.ts` | 154 | SDK with canUseTool |
| `harness/types.ts` | 77 | +interactive option |
| `harness/terminal-prompt.ts` | 111 | NEW - terminal interaction |
| `create-spec/SKILL.md` | 290 | +Inference mode |

## Code Architecture

### spec-generator.ts

**Pattern**: Thin wrapper around skill invocation

```typescript
export async function generateSpec(options: SpecGeneratorOptions): Promise<SpecGeneratorResult> {
  const harness = getHarness('claude');
  const specPath = join(options.cwd, 'SPEC.md');
  const interactive = !options.headless && !options.autonomous;

  let prompt = `/create-spec\n\nDescription: ${options.description}`;

  if (!interactive) {
    prompt += `\n\nNote: No user is present. Skip the interview phase and:
1. Analyze the codebase to understand existing patterns
2. Infer project type, stack, and requirements from the description
3. Generate a SPEC.md with sensible defaults
4. Run the review loop internally
5. Output "SPEC.md created" when complete`;
  }

  const result = await harness.run(prompt, {
    cwd: options.cwd,
    model: options.model,
    interactive,
  }, onEvent);

  // Validation only - skill handles the rest
}
```

**Improvements:**
1. **Single code path**: Always uses harness, never subprocess
2. **No embedded prompts**: Mode instructions only (5 lines vs 80+)
3. **Delegation**: Review loop delegated to skill
4. **Loose coupling**: Just validates SPEC.md exists + format

### harness/claude.ts

**Pattern**: SDK wrapper with tool interception

```typescript
query({
  prompt,
  options: {
    cwd: options.cwd,
    permissionMode: 'bypassPermissions',
    model: options.model,
    canUseTool: async (toolName: string, input: Record<string, unknown>) => {
      if (toolName === 'AskUserQuestion') {
        if (!options.interactive) {
          // Headless: return defaults
          const defaults = getDefaultAnswers(askInput);
          return { behavior: 'allow', updatedInput: defaults };
        }
        // Interactive: prompt via terminal
        const result = await promptAskUserQuestion(askInput);
        return { behavior: 'allow', updatedInput: result };
      }
      return { behavior: 'allow', updatedInput: input };
    },
  },
});
```

**Improvements:**
1. **AskUserQuestion handling**: Intercepted and routed appropriately
2. **Mode awareness**: `interactive` option drives behavior
3. **Graceful degradation**: Headless returns defaults, doesn't block

### terminal-prompt.ts (NEW)

**Pattern**: Terminal interaction utility

```typescript
export async function promptAskUserQuestion(input): Promise<AskUserQuestionOutput> {
  for (const q of input.questions) {
    console.log(`\n${q.header}: ${q.question}`);
    options.forEach((opt, i) => {
      console.log(`  ${i + 1}. ${opt.label} - ${opt.description}`);
    });
    const response = await prompt('Your choice: ');
    answers[q.question] = parseResponse(response, options);
  }
  return { questions: input.questions, answers };
}

export function getDefaultAnswers(input): AskUserQuestionOutput {
  // Returns first option for each question (usually recommended)
}
```

**Capabilities:**
- Displays numbered options in terminal
- Accepts number selection or free text
- Supports multi-select (comma-separated)
- Provides sensible defaults for headless mode

### create-spec/SKILL.md

**Pattern**: Dual-mode skill with inference fallback

```markdown
## Detecting Mode

Check if a user is present by looking at the prompt:
- If prompt contains "No user is present" → use **Inference Mode**
- Otherwise → use **Interview Mode**

## Inference Mode (No User Present)

### Step 1: Analyze Codebase
Use Glob and Grep to understand the project:
1. Check for package.json, pyproject.toml, go.mod → detect language
2. Read README.md, CLAUDE.md for project context
3. List src/ or main directories to understand structure
4. Check for existing patterns (routes, models, tests)

### Step 2: Infer Requirements
| Signal | Inference |
|--------|-----------|
| `package.json` with express | Web API, TypeScript |
| Existing `tests/` directory | Unit tests expected |
```

**Improvements:**
1. **Mode detection**: Reads prompt to determine mode
2. **Inference capability**: Can analyze codebase without user
3. **Extended tools**: `allowed-tools: Read, Write, Edit, AskUserQuestion, Task, Glob, Grep`
4. **Dual finalization**: Interactive prompts user, headless outputs completion

## Test Case Analysis

### TC1: Headless Spec Generation

**Command**: `ralphie init --headless -d "Build a REST API"`

**Expected AFTER behavior:**
1. spec-generator builds prompt with "No user is present" marker
2. Harness runs with `interactive: false`
3. Skill detects headless mode → uses Inference Mode
4. Skill uses Glob/Grep to analyze existing codebase
5. Skill generates SPEC based on inference
6. Skill runs internal review loop
7. spec-generator validates result

**Improvements:**
- True codebase inference (not just prompt-based)
- Single code path through harness
- Review handled by skill (DRY)

### TC2: Interactive Spec Generation

**Command**: `ralphie init -d "Build a CLI calculator"`

**Expected AFTER behavior:**
1. spec-generator builds prompt without headless marker
2. Harness runs with `interactive: true`
3. Skill uses Interview Mode
4. When skill calls AskUserQuestion:
   - `canUseTool` intercepts
   - `promptAskUserQuestion()` displays options in terminal
   - User selects via number or text
   - Answer returned to skill
5. Skill generates SPEC based on interview
6. Skill runs review, prompts user to proceed

**Improvements:**
- Uses harness (not subprocess)
- AskUserQuestion works via canUseTool callback
- Consistent architecture with other harness operations

### TC3: AskUserQuestion in Harness Mode

**Scenario**: Skill calls AskUserQuestion while running through harness

**Expected AFTER behavior:**
1. SDK sees AskUserQuestion tool call
2. `canUseTool` callback intercepts
3. If interactive: `promptAskUserQuestion()` displays terminal UI
4. If headless: `getDefaultAnswers()` returns first options
5. Execution continues with answers

**Improvements:**
- AskUserQuestion fully functional in harness mode
- Graceful headless fallback

## Quality Metrics (AFTER)

| Metric | Score | Notes |
|--------|-------|-------|
| Code DRY-ness | 8/10 | Logic in skill only |
| Architectural consistency | 9/10 | All paths use harness |
| Feature parity | 9/10 | Headless has codebase inference |
| SDK utilization | 9/10 | canUseTool callback in use |
| Maintainability | 8/10 | 163 lines, single path |
| Test coverage | 8/10 | Tests updated for new architecture |
