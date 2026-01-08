export type EnvelopeType = 'system' | 'assistant' | 'user' | 'result';

export interface TextContent {
  type: 'text';
  text: string;
}

export interface ToolUseContent {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultContent {
  type: 'tool_result';
  tool_use_id: string;
  content: string | Array<{ type: string; text?: string }>;
  is_error?: boolean;
}

export type ContentBlock = TextContent | ToolUseContent | ToolResultContent;

export interface ClaudeMessage {
  type: EnvelopeType;
  message?: {
    id: string;
    role: string;
    content: ContentBlock[];
    model?: string;
    stop_reason?: string;
  };
  result?: {
    duration_ms?: number;
    duration_api_ms?: number;
    is_error?: boolean;
    num_turns?: number;
    session_id?: string;
    total_cost_usd?: number;
    usage?: {
      input_tokens: number;
      output_tokens: number;
    };
  };
  subtype?: string;
}

export type ParserEventType = 'init' | 'tool_start' | 'tool_end' | 'text' | 'result' | 'error';

export interface InitEvent {
  type: 'init';
  sessionId?: string;
  model?: string;
}

export interface ToolStartEvent {
  type: 'tool_start';
  toolUseId: string;
  toolName: string;
  input: Record<string, unknown>;
}

export interface ToolEndEvent {
  type: 'tool_end';
  toolUseId: string;
  content: string | Array<{ type: string; text?: string }>;
  isError: boolean;
}

export interface TextEvent {
  type: 'text';
  text: string;
}

export interface ResultEvent {
  type: 'result';
  durationMs?: number;
  isError: boolean;
  numTurns?: number;
  totalCostUsd?: number;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface ErrorEvent {
  type: 'error';
  error: Error;
  rawLine?: string;
}

export type ParserEvent =
  | InitEvent
  | ToolStartEvent
  | ToolEndEvent
  | TextEvent
  | ResultEvent
  | ErrorEvent;
