# SPEC: Harness Refactor - Official SDK Integration

## Overview

Replace custom stream parsing (~700 lines) with official Claude Agent SDK and add Codex support. Net reduction of ~575 lines while gaining multi-harness capability.

## Background

Research revealed that Anthropic ships `@anthropic-ai/claude-agent-sdk` which handles all CLI spawning, JSONL parsing, and event typing. OpenAI has equivalent `@openai/codex-sdk`. Ralph's custom `StreamParser` and `StateMachine` are redundant.

See: `.ai/ralph/harness-refactor-plan.md` for full research notes.

## Goals

- Use official SDKs instead of custom parsing
- Support both Claude and Codex harnesses
- Reduce codebase complexity
- Maintain all existing functionality (TUI, headless, failure context)

## Non-Goals

- Google ADK support (future work if needed)
- AG-UI protocol compliance (overkill for now)
- Breaking changes to CLI interface

---

## Tasks

### Phase 1: Dependencies

- [ ] Add `@anthropic-ai/claude-agent-sdk` to package.json
- [ ] Add `@openai/codex-sdk` to package.json
- [ ] Run `npm install` and verify no conflicts

### Phase 2: New Harness Implementation

- [ ] Create `src/lib/harness/types.ts` with `Harness`, `HarnessEvent`, `HarnessResult` interfaces
- [ ] Create `src/lib/harness/claude.ts` wrapping official Claude SDK
- [ ] Create `src/lib/harness/codex.ts` wrapping official Codex SDK
- [ ] Create `src/lib/harness/index.ts` with `getHarness()` factory
- [ ] Add unit tests for new harness implementations

### Phase 3: Integration

- [ ] Update `useClaudeStream.ts` to use new harness interface
- [ ] Update `headless-runner.ts` to use new harness interface
- [ ] Update CLI to accept `--harness <claude|codex>` flag
- [ ] Add `RALPH_HARNESS` environment variable support
- [ ] Update config loader to support harness selection

### Phase 4: Delete Old Code

- [ ] Delete `src/lib/stream-parser.ts`
- [ ] Delete `src/lib/state-machine.ts`
- [ ] Delete `src/lib/harness/claude-code-harness.ts` (old implementation)
- [ ] Remove unused imports and types from `types.ts`

### Phase 5: Test Updates

- [ ] Delete `tests/lib/stream-parser.test.ts`
- [ ] Delete `tests/lib/state-machine.test.ts`
- [ ] Update `tests/lib/harness/` with new tests
- [ ] Verify all existing App.test.tsx tests still pass
- [ ] Add integration test for Codex harness (mocked)

### Phase 6: Documentation

- [ ] Update README with `--harness` flag documentation
- [ ] Update CLAUDE.md if needed
- [ ] Archive old harness-refactor-plan.md to `.ai/ralph/archive/`

---

## Success Criteria

- [ ] `ralph run --all` works with Claude (default)
- [ ] `ralph run --all --harness codex` works with Codex
- [ ] All existing tests pass (should be 630+)
- [ ] New harness tests pass
- [ ] `npm run type-check` passes
- [ ] Net line count reduction of ~500+ lines
- [ ] Failure context still captured and displayed
- [ ] TUI shows real-time tool activity
- [ ] Headless mode emits JSON events for Whim

---

## Technical Notes

### Harness Interface

```typescript
interface Harness {
  run(prompt: string, cwd: string, onEvent: (e: HarnessEvent) => void): Promise<HarnessResult>;
}
```

### Event Types

```typescript
type HarnessEvent =
  | { type: 'tool_start'; name: string; input?: string }
  | { type: 'tool_end'; name: string; output?: string; error?: boolean }
  | { type: 'thinking'; text: string }
  | { type: 'complete'; success: boolean; durationMs: number; costUsd?: number };
```

### CLI Flag

```bash
ralph run --harness <claude|codex>  # Flag
RALPH_HARNESS=codex ralph run       # Env var
```

---

## Risks

| Risk | Mitigation |
|------|------------|
| SDK API changes | Pin versions, monitor changelogs |
| Codex auth differs | Research auth flow before implementation |
| Tool name mismatch | Map tool names in harness if needed |
| Breaking TUI updates | Keep `onEvent` callback pattern |

---

## References

- [Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/typescript)
- [Codex SDK](https://developers.openai.com/codex/sdk/)
- [Harness Refactor Plan](.ai/ralph/harness-refactor-plan.md)
