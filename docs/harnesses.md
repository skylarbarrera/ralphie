# AI Harnesses

Ralphie supports multiple AI providers through a harness abstraction.

## Supported

| Harness | Provider | Status |
|---------|----------|--------|
| `claude` | Claude Code | Default, production-ready |
| `codex` | OpenAI Codex | Experimental |
| `opencode` | OpenCode AI | Experimental |

## Usage

```bash
ralphie run                    # Claude (default)
ralphie run --harness codex    # Codex
ralphie run --harness opencode  # OpenCode
export RALPH_HARNESS=opencode  # Set default
```

## Environment Variables

| Harness | Required |
|---------|----------|
| `claude` | `ANTHROPIC_API_KEY` |
| `codex` | `OPENAI_API_KEY` |
| `opencode` | `OPENCODE_SERVER_URL` or `OPENCODE_API_KEY` |

Missing variables are detected at startup with setup hints.

## Configuration

Priority:
1. CLI flag: `--harness codex`
2. Environment: `RALPH_HARNESS=codex`
3. Config file: `.ralphie/config.yml`
4. Default: `claude`

```yaml
# .ralphie/config.yml
harness: opencode
```

## Architecture

```
┌─────────────────────────────────────┐
│           Ralphie Core              │
└────────────────┬────────────────────┘
                 │
          ┌──────▼──────┐
          │   Harness   │
          │ Abstraction │
          └──────┬──────┘
                 │
     ┌────────────┼────────────┐
     │            │            │
┌───▼───┐   ┌───▼───┐   ┌───▼───┐
│Claude │   │ Codex │   │OpenCode│
└───────┘   └───────┘   └───────┘
```

Harnesses normalize events across providers: `tool_start`, `tool_end`, `thinking`, `message`, `error`.

## Adding Harnesses

Implement in `src/lib/harness/`:

```typescript
interface Harness {
  name: string;
  run(
    prompt: string,
    options: HarnessRunOptions,
    onEvent: (event: HarnessEvent) => void
  ): Promise<HarnessResult>;
}
```
