# Prompt Testing Framework

## Purpose
Test the impact of skill/setting changes on Claude Code behavior.

## Methodology

### 1. Identify Test Cases
For each change, identify prompts that would exercise the changed behavior.

### 2. BEFORE Phase
- Revert changes to original state
- Run test prompts
- Document: response quality, tool usage, behavior

### 3. AFTER Phase
- Apply changes
- Run identical test prompts
- Document: response quality, tool usage, behavior

### 4. Analysis
- Compare BEFORE/AFTER
- Score impact: HIGH | MEDIUM | LOW | NONE
- If uncertain, add another test prompt

## Changes Being Tested

| Change | File | Description |
|--------|------|-------------|
| Interactive option | `harness/types.ts` | Added `interactive?: boolean` to HarnessRunOptions |
| canUseTool callback | `harness/claude.ts` | AskUserQuestion handling via SDK callback |
| Terminal prompt util | `harness/terminal-prompt.ts` | New file for terminal interaction |
| Simplified spec-gen | `spec-generator.ts` | 590 → 163 lines, skill-based approach |
| Inference mode | `skills/create-spec/SKILL.md` | Added headless inference workflow |

## Test Cases

### TC1: Headless Spec Generation
**Prompt**: `ralphie init --headless -d "Build a REST API for todo items"`
**Tests**: Does inference mode kick in? Are sensible defaults chosen?

### TC2: Interactive Spec Generation
**Prompt**: `ralphie init -d "Build a CLI calculator"`
**Tests**: Does AskUserQuestion work? Can user answer via terminal?

### TC3: Model Option Passing
**Prompt**: `ralphie init --headless -d "Test project" --model opus`
**Tests**: Is the model option passed through to harness?

### TC4: Skill Invocation
**Prompt**: Direct `/create-spec` skill invocation
**Tests**: Does the skill detect mode correctly?
