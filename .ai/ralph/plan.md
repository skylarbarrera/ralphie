# Plan: Harness Abstraction Layer

## Goal

Create a harness abstraction layer that allows Ralph to support multiple AI coding assistants (Claude Code, Codex, OpenCode, etc.) with Claude Code as the default implementation for v1.

## Files to Create/Modify

### Create New Files
- `src/lib/harness/types.ts` - Define `Harness` interface and related types
- `src/lib/harness/claude-code-harness.ts` - Implement `ClaudeCodeHarness` adapter
- `src/lib/harness/index.ts` - Export harness types and factory function
- `src/lib/config.ts` - Config loading from `.ralph/config.yml`
- `tests/lib/harness/claude-code-harness.test.ts` - Tests for Claude Code harness
- `tests/lib/config.test.ts` - Tests for config loading

### Modify Existing Files
- `src/cli.tsx` - Add `--harness` flag to run command
- `src/lib/headless-runner.ts` - Use harness instead of direct claude spawn
- `src/hooks/useClaudeStream.ts` - Use harness instead of direct claude spawn

## Implementation Details

### 1. Harness Interface (types.ts)

```typescript
export interface SkillContext {
  prompt: string;
  cwd: string;
  timeout?: number;
}

export interface SkillResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode?: number;
}

export interface Harness {
  name: string;
  runSkill(context: SkillContext): Promise<SkillResult>;
  spawn(args: string[], options: SpawnOptions): ChildProcess;
}
```

### 2. ClaudeCodeHarness Implementation

- Implement `runSkill()` to spawn `claude` CLI with skill invocation
- Implement `spawn()` to wrap `child_process.spawn('claude', args)`
- Use existing claude CLI flags: `--dangerously-skip-permissions`, `--output-format stream-json`, `--verbose`

### 3. Config Loading

Priority order:
1. CLI flag: `ralph run --harness codex`
2. Environment variable: `RALPH_HARNESS=codex`
3. Config file: `.ralph/config.yml` with `harness: claude-code`
4. Default: `claude-code`

Config file format:
```yaml
harness: claude-code  # or codex, opencode, etc.
```

### 4. Factory Function

```typescript
export function createHarness(name: string): Harness {
  switch (name) {
    case 'claude-code':
      return new ClaudeCodeHarness();
    default:
      throw new Error(`Unknown harness: ${name}`);
  }
}
```

## Tests

1. **Harness interface tests** - Verify ClaudeCodeHarness implements interface correctly
2. **Config loading tests** - Test priority order (CLI > env > config > default)
3. **Integration tests** - Verify harness works with existing headless runner and hook

## Exit Criteria

- [ ] Harness interface defined with clear contracts
- [ ] ClaudeCodeHarness implements interface and wraps existing claude CLI
- [ ] Config loading supports CLI flag, environment variable, and config file
- [ ] Priority order: CLI > env > config > default
- [ ] All existing tests pass (no regressions)
- [ ] New tests cover harness interface and config loading
- [ ] Type check passes with no errors
- [ ] Documentation comments explain harness extensibility design
