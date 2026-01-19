# Spec Generation Refactor

Refactor spec generation to use SDK callbacks for interactive prompts instead of subprocess stdin piping.

## Problem

Current implementation has two paths with different mechanisms:
- **Interactive**: Spawns CLI subprocess, pipes stdin manually - fragile, doesn't properly handle AskUserQuestion
- **Headless**: Uses SDK harness but with embedded prompts, orchestrates review loop externally

This is inconsistent and the interactive mode doesn't work well.

## Solution

Use SDK's `canUseTool` callback to handle AskUserQuestion for both modes:
- **Interactive**: Callback renders questions to terminal, waits for user input
- **Headless**: Callback denies tool or returns defaults, skill falls back to inference

## Architecture

```
ralphie spec "description"
    │
    ▼
┌─────────────────────────────────────────────────────┐
│  spec-generator.ts (thin wrapper)                   │
│  - Validate inputs                                  │
│  - Call harness.run('/create-spec ...', options)    │
│  - Validate output (SPEC.md exists, format valid)   │
└─────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────┐
│  Harness (claude.ts / codex.ts)                     │
│  - SDK query() with canUseTool callback             │
│  - Interactive: prompt user, return answers         │
│  - Headless: deny AskUserQuestion or return defaults│
└─────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────┐
│  create-spec Skill (runs inside agent)              │
│  - Try AskUserQuestion for interview                │
│  - If denied/timeout: fall back to codebase analysis│
│  - Generate SPEC.md                                 │
│  - Spawn review agent (Task tool)                   │
│  - Refine until review passes (max attempts)        │
│  - Finalize                                         │
└─────────────────────────────────────────────────────┘
```

## Tasks

### Phase 1: Harness Callback Support

- [ ] Add `interactive` option to HarnessRunOptions interface
  - `interactive?: boolean` - whether to support user prompts
  - Default: false (headless behavior)

- [ ] Implement canUseTool callback in claude.ts harness
  - Handle AskUserQuestion tool calls
  - Interactive mode: render questions to stdout, read answers from stdin
  - Headless mode: return tool denied or sensible defaults
  - Pass through other tool calls (return true)

- [ ] Add terminal prompt utility for interactive questions
  - Parse AskUserQuestion input format
  - Render options to terminal (numbered list)
  - Read user selection
  - Format response for SDK

### Phase 2: Simplify spec-generator.ts

- [ ] Remove embedded SPEC_GENERATION_PROMPT constant
  - Skill owns the format rules, not the generator

- [ ] Remove generateSpecInteractive function
  - No more subprocess spawn with stdin piping

- [ ] Remove external review loop orchestration
  - runReviewSpec, refineSpec, parseReviewOutput go away
  - Skill handles review loop internally

- [ ] Simplify generateSpec to thin wrapper
  - Build prompt: `/create-spec\n\nDescription: {desc}`
  - Call harness.run(prompt, { interactive, cwd, model })
  - Validate SPEC.md was created
  - Return result

- [ ] Simplify generateSpecHeadless
  - Same as above but with `interactive: false`
  - Add instruction in prompt: "No user present - analyze codebase to infer requirements"

### Phase 3: Update create-spec Skill

- [ ] Add fallback for AskUserQuestion denial
  - If tool call fails/denied: switch to inference mode
  - Analyze codebase (package.json, README, existing code)
  - Infer project type, stack, requirements from context

- [ ] Ensure review loop is self-contained
  - Skill spawns Task agent for review
  - Handles refinement internally
  - Has max attempts (3) with graceful failure

- [ ] Add completion signal
  - Clear output when done: "SPEC.md created with X tasks"
  - Agent exits cleanly

### Phase 4: Codex Harness Support

- [ ] Implement similar canUseTool pattern for Codex
  - Research Codex SDK's equivalent callback mechanism
  - If no equivalent: always run in inference mode

### Phase 5: Tests

- [ ] Update spec-generator tests
  - Mock harness.run instead of spawn
  - Test interactive: true passes to harness
  - Test headless prompt includes inference instruction

- [ ] Add harness callback tests
  - Test AskUserQuestion handling in interactive mode
  - Test tool denial in headless mode

## Interface Changes

### HarnessRunOptions

```typescript
interface HarnessRunOptions {
  cwd: string;
  model?: string;
  systemPrompt?: string;
  allowedTools?: string[];
  interactive?: boolean;  // NEW: enable user prompts
}
```

### Harness canUseTool callback

```typescript
// Inside claude.ts
const queryResult = query({
  prompt,
  options: {
    cwd: options.cwd,
    permissionMode: 'bypassPermissions',
    model: options.model,
    canUseTool: async (toolName: string, input: unknown) => {
      if (toolName === 'AskUserQuestion') {
        if (!options.interactive) {
          // Headless: deny or return defaults
          return { denied: true, reason: 'No user present - infer from context' };
        }
        // Interactive: prompt user
        const answers = await promptUserInteractive(input);
        return { answers };
      }
      return true; // Allow other tools
    }
  }
});
```

## Success Criteria

- [ ] `ralphie spec "desc"` prompts user with AskUserQuestion options via SDK callback
- [ ] `ralphie spec --headless "desc"` generates spec without user interaction
- [ ] Both modes use same harness, different callback behavior
- [ ] Review loop happens inside skill, not orchestrated by spec-generator
- [ ] All existing tests pass (with updates)
- [ ] Works with both Claude and Codex harnesses

## Out of Scope

- TUI rendering for interactive mode (simple numbered list is fine)
- Fancy progress indicators (raw agent output is fine)
- Timeout handling for user input (can add later)
