import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StreamParser, createStreamParser } from '../src/lib/stream-parser.js';
import type {
  InitEvent,
  ToolStartEvent,
  ToolEndEvent,
  TextEvent,
  ResultEvent,
  ParserEvent,
} from '../src/lib/types.js';

describe('StreamParser', () => {
  let parser: StreamParser;

  beforeEach(() => {
    parser = createStreamParser();
  });

  describe('parseLine', () => {
    it('ignores empty lines', () => {
      const eventSpy = vi.fn();
      parser.on('event', eventSpy);

      parser.parseLine('');
      parser.parseLine('   ');
      parser.parseLine('\n');

      expect(eventSpy).not.toHaveBeenCalled();
    });

    it('ignores non-JSON lines that do not look like JSON', () => {
      const eventSpy = vi.fn();
      parser.on('event', eventSpy);

      parser.parseLine('not json');
      parser.parseLine('random text output');
      parser.parseLine('>>> Some prefix text');

      expect(eventSpy).not.toHaveBeenCalled();
    });

    it('emits error for malformed JSON that looks like JSON', () => {
      const errorSpy = vi.fn();
      parser.on('error', errorSpy);

      parser.parseLine('{ invalid json }');
      parser.parseLine('{"type": "system"');
      parser.parseLine('{broken}');

      expect(errorSpy).toHaveBeenCalledTimes(3);
      expect(errorSpy.mock.calls[0][0].type).toBe('error');
      expect(errorSpy.mock.calls[0][0].error.message).toContain('Malformed JSON');
    });
  });

  describe('system message handling', () => {
    it('emits init event on system message', () => {
      const initSpy = vi.fn<[InitEvent], void>();
      parser.on('init', initSpy);

      const systemMsg = {
        type: 'system',
        result: { session_id: 'sess-123' },
        message: { id: 'msg-1', role: 'assistant', content: [], model: 'claude-3' },
      };
      parser.parseLine(JSON.stringify(systemMsg));

      expect(initSpy).toHaveBeenCalledTimes(1);
      expect(initSpy).toHaveBeenCalledWith({
        type: 'init',
        sessionId: 'sess-123',
        model: 'claude-3',
      });
    });

    it('emits init event with undefined values when fields missing', () => {
      const initSpy = vi.fn<[InitEvent], void>();
      parser.on('init', initSpy);

      parser.parseLine('{"type": "system"}');

      expect(initSpy).toHaveBeenCalledWith({
        type: 'init',
        sessionId: undefined,
        model: undefined,
      });
    });
  });

  describe('assistant message handling', () => {
    it('emits text event for text content', () => {
      const textSpy = vi.fn<[TextEvent], void>();
      parser.on('text', textSpy);

      const assistantMsg = {
        type: 'assistant',
        message: {
          id: 'msg-1',
          role: 'assistant',
          content: [{ type: 'text', text: 'Hello, I am working on your task...' }],
        },
      };
      parser.parseLine(JSON.stringify(assistantMsg));

      expect(textSpy).toHaveBeenCalledTimes(1);
      expect(textSpy).toHaveBeenCalledWith({
        type: 'text',
        text: 'Hello, I am working on your task...',
      });
    });

    it('emits tool_start event for tool_use content', () => {
      const toolStartSpy = vi.fn<[ToolStartEvent], void>();
      parser.on('tool_start', toolStartSpy);

      const assistantMsg = {
        type: 'assistant',
        message: {
          id: 'msg-1',
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'tool-123',
              name: 'Read',
              input: { file_path: '/path/to/file.ts' },
            },
          ],
        },
      };
      parser.parseLine(JSON.stringify(assistantMsg));

      expect(toolStartSpy).toHaveBeenCalledTimes(1);
      expect(toolStartSpy).toHaveBeenCalledWith({
        type: 'tool_start',
        toolUseId: 'tool-123',
        toolName: 'Read',
        input: { file_path: '/path/to/file.ts' },
      });
    });

    it('handles multiple content blocks in one message', () => {
      const eventSpy = vi.fn<[ParserEvent], void>();
      parser.on('event', eventSpy);

      const assistantMsg = {
        type: 'assistant',
        message: {
          id: 'msg-1',
          role: 'assistant',
          content: [
            { type: 'text', text: 'Let me read that file' },
            { type: 'tool_use', id: 'tool-1', name: 'Read', input: { file_path: '/a.ts' } },
            { type: 'tool_use', id: 'tool-2', name: 'Grep', input: { pattern: 'foo' } },
          ],
        },
      };
      parser.parseLine(JSON.stringify(assistantMsg));

      expect(eventSpy).toHaveBeenCalledTimes(3);
      expect(eventSpy.mock.calls[0][0].type).toBe('text');
      expect(eventSpy.mock.calls[1][0].type).toBe('tool_start');
      expect(eventSpy.mock.calls[2][0].type).toBe('tool_start');
    });

    it('ignores assistant message with no content', () => {
      const eventSpy = vi.fn();
      parser.on('event', eventSpy);

      parser.parseLine('{"type": "assistant", "message": {"id": "1", "role": "assistant"}}');
      parser.parseLine('{"type": "assistant"}');

      expect(eventSpy).not.toHaveBeenCalled();
    });
  });

  describe('user message handling (tool results)', () => {
    it('emits tool_end event for tool_result in user message', () => {
      const toolEndSpy = vi.fn<[ToolEndEvent], void>();
      parser.on('tool_end', toolEndSpy);

      const userMsg = {
        type: 'user',
        message: {
          id: 'msg-2',
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'tool-123',
              content: 'File contents here',
              is_error: false,
            },
          ],
        },
      };
      parser.parseLine(JSON.stringify(userMsg));

      expect(toolEndSpy).toHaveBeenCalledTimes(1);
      expect(toolEndSpy).toHaveBeenCalledWith({
        type: 'tool_end',
        toolUseId: 'tool-123',
        content: 'File contents here',
        isError: false,
      });
    });

    it('handles tool_result with is_error true', () => {
      const toolEndSpy = vi.fn<[ToolEndEvent], void>();
      parser.on('tool_end', toolEndSpy);

      const userMsg = {
        type: 'user',
        message: {
          id: 'msg-2',
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'tool-456',
              content: 'Error: file not found',
              is_error: true,
            },
          ],
        },
      };
      parser.parseLine(JSON.stringify(userMsg));

      expect(toolEndSpy).toHaveBeenCalledWith({
        type: 'tool_end',
        toolUseId: 'tool-456',
        content: 'Error: file not found',
        isError: true,
      });
    });

    it('handles tool_result with array content', () => {
      const toolEndSpy = vi.fn<[ToolEndEvent], void>();
      parser.on('tool_end', toolEndSpy);

      const userMsg = {
        type: 'user',
        message: {
          id: 'msg-2',
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'tool-789',
              content: [{ type: 'text', text: 'result 1' }, { type: 'text', text: 'result 2' }],
            },
          ],
        },
      };
      parser.parseLine(JSON.stringify(userMsg));

      expect(toolEndSpy).toHaveBeenCalledWith({
        type: 'tool_end',
        toolUseId: 'tool-789',
        content: [{ type: 'text', text: 'result 1' }, { type: 'text', text: 'result 2' }],
        isError: false,
      });
    });
  });

  describe('result message handling', () => {
    it('emits result event on result message', () => {
      const resultSpy = vi.fn<[ResultEvent], void>();
      parser.on('result', resultSpy);

      const resultMsg = {
        type: 'result',
        result: {
          duration_ms: 5000,
          is_error: false,
          num_turns: 3,
          total_cost_usd: 0.05,
          usage: { input_tokens: 1000, output_tokens: 500 },
        },
      };
      parser.parseLine(JSON.stringify(resultMsg));

      expect(resultSpy).toHaveBeenCalledTimes(1);
      expect(resultSpy).toHaveBeenCalledWith({
        type: 'result',
        durationMs: 5000,
        isError: false,
        numTurns: 3,
        totalCostUsd: 0.05,
        usage: { inputTokens: 1000, outputTokens: 500 },
      });
    });

    it('handles result message with error', () => {
      const resultSpy = vi.fn<[ResultEvent], void>();
      parser.on('result', resultSpy);

      const resultMsg = {
        type: 'result',
        result: { is_error: true },
      };
      parser.parseLine(JSON.stringify(resultMsg));

      expect(resultSpy).toHaveBeenCalledWith({
        type: 'result',
        durationMs: undefined,
        isError: true,
        numTurns: undefined,
        totalCostUsd: undefined,
        usage: undefined,
      });
    });

    it('handles result message with minimal fields', () => {
      const resultSpy = vi.fn<[ResultEvent], void>();
      parser.on('result', resultSpy);

      parser.parseLine('{"type": "result"}');

      expect(resultSpy).toHaveBeenCalledWith({
        type: 'result',
        durationMs: undefined,
        isError: false,
        numTurns: undefined,
        totalCostUsd: undefined,
        usage: undefined,
      });
    });
  });

  describe('tool use correlation', () => {
    it('tracks pending tool uses', () => {
      const assistantMsg = {
        type: 'assistant',
        message: {
          id: 'msg-1',
          role: 'assistant',
          content: [
            { type: 'tool_use', id: 'tool-1', name: 'Read', input: {} },
            { type: 'tool_use', id: 'tool-2', name: 'Grep', input: {} },
          ],
        },
      };
      parser.parseLine(JSON.stringify(assistantMsg));

      const pending = parser.getPendingToolUses();
      expect(pending.size).toBe(2);
      expect(pending.has('tool-1')).toBe(true);
      expect(pending.has('tool-2')).toBe(true);
    });

    it('removes tool from pending on tool_result', () => {
      const assistantMsg = {
        type: 'assistant',
        message: {
          id: 'msg-1',
          role: 'assistant',
          content: [{ type: 'tool_use', id: 'tool-1', name: 'Read', input: {} }],
        },
      };
      parser.parseLine(JSON.stringify(assistantMsg));
      expect(parser.getPendingToolUses().size).toBe(1);

      const userMsg = {
        type: 'user',
        message: {
          id: 'msg-2',
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: 'tool-1', content: 'result' }],
        },
      };
      parser.parseLine(JSON.stringify(userMsg));
      expect(parser.getPendingToolUses().size).toBe(0);
    });

    it('handles tool_result for unknown tool_use_id gracefully', () => {
      const toolEndSpy = vi.fn<[ToolEndEvent], void>();
      parser.on('tool_end', toolEndSpy);

      const userMsg = {
        type: 'user',
        message: {
          id: 'msg-2',
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: 'unknown-id', content: 'result' }],
        },
      };
      parser.parseLine(JSON.stringify(userMsg));

      expect(toolEndSpy).toHaveBeenCalledWith({
        type: 'tool_end',
        toolUseId: 'unknown-id',
        content: 'result',
        isError: false,
      });
    });
  });

  describe('parseChunk', () => {
    it('handles chunk with complete lines', () => {
      const eventSpy = vi.fn<[ParserEvent], void>();
      parser.on('event', eventSpy);

      parser.parseChunk('{"type": "system"}\n{"type": "result"}\n');

      expect(eventSpy).toHaveBeenCalledTimes(2);
      expect(eventSpy.mock.calls[0][0].type).toBe('init');
      expect(eventSpy.mock.calls[1][0].type).toBe('result');
    });

    it('buffers incomplete lines across chunks', () => {
      const eventSpy = vi.fn<[ParserEvent], void>();
      parser.on('event', eventSpy);

      parser.parseChunk('{"type": ');
      expect(eventSpy).not.toHaveBeenCalled();

      parser.parseChunk('"system"}\n');
      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect(eventSpy.mock.calls[0][0].type).toBe('init');
    });

    it('handles mixed complete and incomplete lines', () => {
      const eventSpy = vi.fn<[ParserEvent], void>();
      parser.on('event', eventSpy);

      parser.parseChunk('{"type": "system"}\n{"type": "res');
      expect(eventSpy).toHaveBeenCalledTimes(1);

      parser.parseChunk('ult"}\n');
      expect(eventSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('flush', () => {
    it('processes remaining buffer content', () => {
      const eventSpy = vi.fn<[ParserEvent], void>();
      parser.on('event', eventSpy);

      parser.parseChunk('{"type": "system"}');
      expect(eventSpy).not.toHaveBeenCalled();

      parser.flush();
      expect(eventSpy).toHaveBeenCalledTimes(1);
    });

    it('handles empty buffer', () => {
      const eventSpy = vi.fn();
      parser.on('event', eventSpy);

      parser.flush();
      expect(eventSpy).not.toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('clears pending tool uses and buffer', () => {
      const assistantMsg = {
        type: 'assistant',
        message: {
          id: 'msg-1',
          role: 'assistant',
          content: [{ type: 'tool_use', id: 'tool-1', name: 'Read', input: {} }],
        },
      };
      parser.parseLine(JSON.stringify(assistantMsg));
      parser.parseChunk('partial line');

      parser.reset();

      expect(parser.getPendingToolUses().size).toBe(0);
    });
  });

  describe('event emitter', () => {
    it('emits both specific and generic events', () => {
      const initSpy = vi.fn();
      const eventSpy = vi.fn();
      parser.on('init', initSpy);
      parser.on('event', eventSpy);

      parser.parseLine('{"type": "system"}');

      expect(initSpy).toHaveBeenCalledTimes(1);
      expect(eventSpy).toHaveBeenCalledTimes(1);
    });
  });
});
