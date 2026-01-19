import { query } from '@anthropic-ai/claude-agent-sdk';
import type { Harness, HarnessEvent, HarnessResult, HarnessRunOptions } from './types.js';
import { promptAskUserQuestion, getDefaultAnswers } from './terminal-prompt.js';

// Track active AskUserQuestion calls to prevent concurrency issues
let activePromptCount = 0;

/**
 * Claude harness using the official Anthropic Claude Agent SDK.
 *
 * Wraps the SDK's query() function and emits normalized events.
 */
export const claudeHarness: Harness = {
  name: 'claude',

  async run(
    prompt: string,
    options: HarnessRunOptions,
    onEvent: (event: HarnessEvent) => void
  ): Promise<HarnessResult> {
    const startTime = Date.now();

    if (!process.env.ANTHROPIC_API_KEY) {
      const errorMessage = 'Missing ANTHROPIC_API_KEY environment variable. Set it with: export ANTHROPIC_API_KEY=sk-ant-...';
      onEvent({ type: 'error', message: errorMessage });
      return {
        success: false,
        durationMs: Date.now() - startTime,
        error: errorMessage,
      };
    }

    try {
      const queryResult = query({
        prompt,
        options: {
          cwd: options.cwd,
          permissionMode: 'bypassPermissions',
          allowedTools: options.allowedTools,
          model: options.model,
          systemPrompt: options.systemPrompt,
          canUseTool: async (toolName: string, input: Record<string, unknown>) => {
            if (toolName === 'AskUserQuestion') {
              // Validate the input structure for AskUserQuestion
              if (!input || typeof input !== 'object' || !('questions' in input)) {
                return { behavior: 'deny' as const, message: 'Invalid AskUserQuestion input: missing questions' };
              }
              
              const rawInput = input as { questions: unknown };
              if (!Array.isArray(rawInput.questions)) {
                return { behavior: 'deny' as const, message: 'Invalid AskUserQuestion input: questions must be an array' };
              }
              
              const askInput = input as { questions: Array<{ question: string; header: string; options: Array<{ label: string; description: string }>; multiSelect: boolean }> };

              if (!options.interactive) {
                // Headless mode: return defaults so skill can continue
                const defaults = getDefaultAnswers(askInput);
                return { behavior: 'allow' as const, updatedInput: defaults as unknown as Record<string, unknown> };
              }

              // Interactive mode: prompt user via terminal
              if (activePromptCount > 0) {
                return { behavior: 'deny' as const, message: 'Another prompt is already active' };
              }
              
              activePromptCount++;
              try {
                const result = await promptAskUserQuestion(askInput);
                return { behavior: 'allow' as const, updatedInput: result as unknown as Record<string, unknown> };
              } catch (error) {
                // If prompting fails, deny with specific error
                const message = error instanceof Error ? error.message : 'Failed to prompt user';
                return { behavior: 'deny' as const, message };
              } finally {
                activePromptCount--;
              }
            }

            // Allow other tools
            return { behavior: 'allow' as const, updatedInput: input };
          },
        },
      });

      let result: HarnessResult = {
        success: false,
        durationMs: 0,
        error: 'No result received',
      };

      for await (const message of queryResult) {
        if (message.type === 'assistant') {
          // Process tool calls and thinking from assistant messages
          for (const block of message.message.content) {
            if (block.type === 'tool_use') {
              onEvent({
                type: 'tool_start',
                name: block.name,
                input: JSON.stringify(block.input),
              });
            } else if (block.type === 'text') {
              onEvent({
                type: 'message',
                text: block.text,
              });
            } else if (block.type === 'thinking') {
              onEvent({
                type: 'thinking',
                text: (block as { thinking: string }).thinking,
              });
            }
          }
        } else if (message.type === 'user') {
          // Process tool results from user messages
          for (const block of message.message.content) {
            if (block.type === 'tool_result') {
              const toolResult = block as {
                tool_use_id: string;
                content: unknown;
                is_error?: boolean;
              };
              // Find the tool name from a previous tool_use if needed
              onEvent({
                type: 'tool_end',
                name: toolResult.tool_use_id,
                output: typeof toolResult.content === 'string'
                  ? toolResult.content
                  : JSON.stringify(toolResult.content),
                error: toolResult.is_error,
              });
            }
          }
        } else if (message.type === 'result') {
          if (message.subtype === 'success') {
            result = {
              success: true,
              durationMs: message.duration_ms,
              costUsd: message.total_cost_usd,
              usage: {
                inputTokens: message.usage.input_tokens,
                outputTokens: message.usage.output_tokens,
              },
              output: message.result,
            };
          } else {
            // Error result
            const errorMsg = message as { errors?: string[] };
            result = {
              success: false,
              durationMs: message.duration_ms,
              costUsd: message.total_cost_usd,
              usage: {
                inputTokens: message.usage.input_tokens,
                outputTokens: message.usage.output_tokens,
              },
              error: errorMsg.errors?.[0] ?? 'Unknown error',
            };
          }
        }
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      onEvent({ type: 'error', message: errorMessage });

      return {
        success: false,
        durationMs: Date.now() - startTime,
        error: errorMessage,
      };
    }
  },
};
