import { EventEmitter } from 'events';
import type {
  ClaudeMessage,
  ParserEvent,
  InitEvent,
  ToolStartEvent,
  ToolEndEvent,
  TextEvent,
  ResultEvent,
  ErrorEvent,
  ContentBlock,
  ToolUseContent,
  ToolResultContent,
} from './types.js';

export interface StreamParserEvents {
  init: (event: InitEvent) => void;
  tool_start: (event: ToolStartEvent) => void;
  tool_end: (event: ToolEndEvent) => void;
  text: (event: TextEvent) => void;
  result: (event: ResultEvent) => void;
  error: (event: ErrorEvent) => void;
  event: (event: ParserEvent) => void;
}

export class StreamParser extends EventEmitter {
  private pendingToolUses: Map<string, ToolUseContent> = new Map();
  private buffer: string = '';

  constructor() {
    super();
  }

  override on<K extends keyof StreamParserEvents>(
    event: K,
    listener: StreamParserEvents[K]
  ): this {
    return super.on(event, listener);
  }

  override emit<K extends keyof StreamParserEvents>(
    event: K,
    ...args: Parameters<StreamParserEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }

  parseLine(line: string): void {
    const trimmed = line.trim();
    if (!trimmed) return;

    let parsed: ClaudeMessage;
    try {
      parsed = JSON.parse(trimmed) as ClaudeMessage;
    } catch {
      return;
    }

    this.processMessage(parsed, trimmed);
  }

  parseChunk(chunk: string): void {
    this.buffer += chunk;
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() ?? '';

    for (const line of lines) {
      this.parseLine(line);
    }
  }

  flush(): void {
    if (this.buffer.trim()) {
      this.parseLine(this.buffer);
      this.buffer = '';
    }
  }

  private processMessage(message: ClaudeMessage, rawLine: string): void {
    try {
      switch (message.type) {
        case 'system':
          this.handleSystemMessage(message);
          break;
        case 'assistant':
          this.handleAssistantMessage(message);
          break;
        case 'user':
          this.handleUserMessage(message);
          break;
        case 'result':
          this.handleResultMessage(message);
          break;
      }
    } catch (err) {
      const errorEvent: ErrorEvent = {
        type: 'error',
        error: err instanceof Error ? err : new Error(String(err)),
        rawLine,
      };
      this.emit('error', errorEvent);
      this.emit('event', errorEvent);
    }
  }

  private handleSystemMessage(message: ClaudeMessage): void {
    const initEvent: InitEvent = {
      type: 'init',
      sessionId: message.result?.session_id,
      model: message.message?.model,
    };
    this.emit('init', initEvent);
    this.emit('event', initEvent);
  }

  private handleAssistantMessage(message: ClaudeMessage): void {
    if (!message.message?.content) return;

    for (const block of message.message.content) {
      this.processContentBlock(block);
    }
  }

  private handleUserMessage(message: ClaudeMessage): void {
    if (!message.message?.content) return;

    for (const block of message.message.content) {
      if (block.type === 'tool_result') {
        this.processToolResult(block as ToolResultContent);
      }
    }
  }

  private handleResultMessage(message: ClaudeMessage): void {
    const result = message.result;
    const resultEvent: ResultEvent = {
      type: 'result',
      durationMs: result?.duration_ms,
      isError: result?.is_error ?? false,
      numTurns: result?.num_turns,
      totalCostUsd: result?.total_cost_usd,
      usage: result?.usage
        ? {
            inputTokens: result.usage.input_tokens,
            outputTokens: result.usage.output_tokens,
          }
        : undefined,
    };
    this.emit('result', resultEvent);
    this.emit('event', resultEvent);
  }

  private processContentBlock(block: ContentBlock): void {
    switch (block.type) {
      case 'text':
        const textEvent: TextEvent = {
          type: 'text',
          text: block.text,
        };
        this.emit('text', textEvent);
        this.emit('event', textEvent);
        break;
      case 'tool_use':
        this.pendingToolUses.set(block.id, block);
        const toolStartEvent: ToolStartEvent = {
          type: 'tool_start',
          toolUseId: block.id,
          toolName: block.name,
          input: block.input,
        };
        this.emit('tool_start', toolStartEvent);
        this.emit('event', toolStartEvent);
        break;
      case 'tool_result':
        this.processToolResult(block);
        break;
    }
  }

  private processToolResult(block: ToolResultContent): void {
    const toolUse = this.pendingToolUses.get(block.tool_use_id);
    if (toolUse) {
      this.pendingToolUses.delete(block.tool_use_id);
    }

    const toolEndEvent: ToolEndEvent = {
      type: 'tool_end',
      toolUseId: block.tool_use_id,
      content: block.content,
      isError: block.is_error ?? false,
    };
    this.emit('tool_end', toolEndEvent);
    this.emit('event', toolEndEvent);
  }

  getPendingToolUses(): Map<string, ToolUseContent> {
    return new Map(this.pendingToolUses);
  }

  reset(): void {
    this.pendingToolUses.clear();
    this.buffer = '';
  }
}

export function createStreamParser(): StreamParser {
  return new StreamParser();
}
