/**
 * Events emitted by harnesses during execution.
 *
 * These are normalized events that work across different AI harnesses
 * (Claude, Codex, etc.) following patterns from AG-UI and LangChain.
 */
export type HarnessEvent =
  | { type: 'tool_start'; name: string; input?: string }
  | { type: 'tool_end'; name: string; output?: string; error?: boolean }
  | { type: 'thinking'; text: string }
  | { type: 'message'; text: string }
  | { type: 'error'; message: string };

/**
 * Result from running an iteration with a harness.
 */
export interface HarnessResult {
  /** Whether the iteration completed successfully */
  success: boolean;
  /** Duration of the iteration in milliseconds */
  durationMs: number;
  /** Cost of the iteration in USD (if available) */
  costUsd?: number;
  /** Token usage */
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  /** Error message if the iteration failed */
  error?: string;
  /** Final text output from the assistant */
  output?: string;
}

/**
 * Options for running an iteration.
 */
export interface HarnessRunOptions {
  /** Working directory */
  cwd: string;
  /** Allowed tools (optional, defaults to all) */
  allowedTools?: string[];
  /** Model to use (optional) */
  model?: string;
  /** Additional system prompt (optional) */
  systemPrompt?: string;
}

/**
 * Harness interface for AI coding assistants.
 *
 * Each harness wraps an official SDK (Claude Agent SDK, Codex SDK, etc.)
 * and emits normalized events for Ralphie to consume.
 */
export interface Harness {
  /** Name of the harness */
  name: string;

  /**
   * Run an iteration with the given prompt.
   *
   * @param prompt - The prompt to send to the AI
   * @param options - Run options including cwd
   * @param onEvent - Callback for streaming events
   * @returns Result of the iteration
   */
  run(
    prompt: string,
    options: HarnessRunOptions,
    onEvent: (event: HarnessEvent) => void
  ): Promise<HarnessResult>;
}

export type HarnessName = 'claude' | 'codex';
