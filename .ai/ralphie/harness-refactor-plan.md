# Ralphie Harness Refactor Plan

## TL;DR

Replace ~700 lines of custom stream parsing with official SDKs. Add Codex support for ~125 total lines.

---

## Problem: We Reinvented the Wheel

Ralphie currently has custom implementations for:
- `StreamParser` (~200 lines) - Parses Claude Code JSONL output
- `StateMachine` (~350 lines) - Tracks tool execution state
- `Harness` abstraction (~150 lines) - Wraps CLI spawning

**The issue:** Anthropic ships `@anthropic-ai/claude-agent-sdk` that does all of this, properly typed, officially maintained.

---

## Research Summary

### Official Agent SDKs Exist

| Provider | Package | Streaming |
|----------|---------|-----------|
| **Claude** | `@anthropic-ai/claude-agent-sdk` | `for await (msg of query())` |
| **Codex** | `@openai/codex-sdk` | `for await (event of runStreamed())` |
| **Google** | `@google/adk` | `LlmAgent` callbacks |

All three SDKs:
- Spawn their CLI internally
- Parse JSONL events internally
- Expose typed async generators
- Handle sessions/threads

### AG-UI Protocol

Industry standard for agent events (~16 event types):
- `ToolCallStart`, `ToolCallEnd`, `ToolCallResult`
- `RunStarted`, `RunFinished`, `RunError`
- `TextMessageStart`, `TextMessageContent`, `TextMessageEnd`

We don't need to adopt AG-UI as a dependency, but our event types align with it.

**Sources:**
- [Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/typescript)
- [Codex SDK](https://developers.openai.com/codex/sdk/)
- [AG-UI Protocol](https://docs.ag-ui.com/concepts/events)

---

## Solution: Use Official SDKs + Thin Abstraction

### New Architecture

```
┌─────────────────────────────────────────┐
│  Ralphie (thin wrapper)                   │
│  ├─ SPEC parser + completion check      │
│  ├─ Iteration loop (until done/stuck)   │
│  ├─ TUI or Headless output              │
│  └─ Failure context capture             │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Harness Interface (~30 lines)          │
│  ├─ claudeHarness (wraps official SDK)  │
│  └─ codexHarness (wraps official SDK)   │
└─────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Official SDKs (do the hard work)       │
│  ├─ @anthropic-ai/claude-agent-sdk      │
│  └─ @openai/codex-sdk                   │
└─────────────────────────────────────────┘
```

---

## Implementation

### 1. Unified Types (`src/lib/harness/types.ts`)

```typescript
export type HarnessEvent =
  | { type: 'tool_start'; name: string; input?: string }
  | { type: 'tool_end'; name: string; output?: string; error?: boolean }
  | { type: 'thinking'; text: string }
  | { type: 'complete'; success: boolean; durationMs: number; costUsd?: number };

export interface HarnessResult {
  success: boolean;
  durationMs: number;
  costUsd?: number;
  usage?: { input: number; output: number };
  error?: string;
}

export interface Harness {
  run(prompt: string, cwd: string, onEvent: (e: HarnessEvent) => void): Promise<HarnessResult>;
}
```

### 2. Claude Harness (`src/lib/harness/claude.ts`)

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";
import type { Harness, HarnessEvent, HarnessResult } from "./types.js";

export const claudeHarness: Harness = {
  async run(prompt, cwd, onEvent) {
    for await (const msg of query({
      prompt,
      options: { cwd, permissionMode: 'bypassPermissions' }
    })) {
      if (msg.type === 'assistant') {
        for (const block of msg.message.content) {
          if (block.type === 'tool_use') {
            onEvent({ type: 'tool_start', name: block.name, input: JSON.stringify(block.input) });
          }
        }
      }
      if (msg.type === 'result') {
        return {
          success: !msg.is_error,
          durationMs: msg.duration_ms,
          costUsd: msg.total_cost_usd,
          usage: { input: msg.usage.input_tokens, output: msg.usage.output_tokens },
          error: msg.is_error ? msg.errors?.[0] : undefined,
        };
      }
    }
    return { success: false, durationMs: 0, error: 'No result' };
  }
};
```

### 3. Codex Harness (`src/lib/harness/codex.ts`)

```typescript
import { Codex } from "@openai/codex-sdk";
import type { Harness, HarnessEvent, HarnessResult } from "./types.js";

export const codexHarness: Harness = {
  async run(prompt, cwd, onEvent) {
    const codex = new Codex({ cwd });
    const thread = codex.startThread();
    const { events } = await thread.runStreamed(prompt);

    let result: HarnessResult = { success: false, durationMs: 0 };

    for await (const event of events) {
      if (event.type === 'item.completed') {
        const item = event.item;
        if (item.type === 'tool_call') {
          onEvent({ type: 'tool_start', name: item.name });
        }
        if (item.type === 'tool_result') {
          onEvent({ type: 'tool_end', name: item.name, output: item.output });
        }
      }
      if (event.type === 'turn.completed') {
        result = {
          success: true,
          durationMs: event.duration_ms ?? 0,
          usage: event.usage ? { input: event.usage.input_tokens, output: event.usage.output_tokens } : undefined,
        };
      }
    }
    return result;
  }
};
```

### 4. Factory (`src/lib/harness/index.ts`)

```typescript
import { claudeHarness } from "./claude.js";
import { codexHarness } from "./codex.js";
import type { Harness } from "./types.js";

export type HarnessName = 'claude' | 'codex';

export function getHarness(name: HarnessName = 'claude'): Harness {
  switch (name) {
    case 'claude': return claudeHarness;
    case 'codex': return codexHarness;
  }
}

export type { Harness, HarnessEvent, HarnessResult } from "./types.js";
```

---

## Migration Steps

### Phase 1: Add Dependencies
```bash
npm install @anthropic-ai/claude-agent-sdk @openai/codex-sdk
```

### Phase 2: Implement New Harness
1. Create `src/lib/harness/types.ts`
2. Create `src/lib/harness/claude.ts`
3. Create `src/lib/harness/codex.ts`
4. Create `src/lib/harness/index.ts`

### Phase 3: Update Consumers
1. Update `useClaudeStream.ts` to use harness
2. Update `headless-runner.ts` to use harness
3. Update CLI to accept `--harness codex` flag

### Phase 4: Delete Old Code
1. Delete `src/lib/stream-parser.ts`
2. Delete `src/lib/state-machine.ts`
3. Delete old `src/lib/harness/claude-code-harness.ts`

### Phase 5: Update Tests
1. Update harness tests
2. Remove stream-parser tests
3. Remove state-machine tests

---

## Line Count Impact

| Action | Lines |
|--------|-------|
| Delete `stream-parser.ts` | -200 |
| Delete `state-machine.ts` | -350 |
| Delete old harness | -150 |
| Add new harness | +125 |
| **Net change** | **-575 lines** |

---

## CLI Usage After Refactor

```bash
# Default (Claude)
ralphie run --all

# Explicit Claude
ralphie run --all --harness claude

# Use Codex
ralphie run --all --harness codex

# Environment variable
RALPH_HARNESS=codex ralphie run --all
```

---

## What Ralphie Keeps (Value-Add)

The official SDKs handle the hard stuff. Ralphie adds:

| Feature | Description |
|---------|-------------|
| SPEC.md parsing | Task extraction and completion detection |
| Iteration loop | Run until done or stuck |
| TUI progress | Real-time tool activity display |
| Failure context | Capture what failed and why |
| Headless mode | JSON events for Whim integration |
| Multi-harness | Claude + Codex support |

---

## Open Questions

1. **Codex authentication** - Does Codex SDK handle auth differently?
2. **Tool name mapping** - Are Claude and Codex tool names identical?
3. **Session resume** - Do we need cross-harness session support?

---

## References

- [Claude Agent SDK Docs](https://platform.claude.com/docs/en/agent-sdk/typescript)
- [Claude Agent SDK npm](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk)
- [Codex SDK Docs](https://developers.openai.com/codex/sdk/)
- [Codex SDK npm](https://www.npmjs.com/package/@openai/codex-sdk)
- [AG-UI Protocol](https://docs.ag-ui.com/)
- [LangChain Callbacks](https://github.com/langchain-ai/langchain) (pattern reference)
