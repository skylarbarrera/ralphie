import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StreamParser } from '../src/lib/stream-parser.js';
import { StateMachine } from '../src/lib/state-machine.js';

describe('useClaudeStream integration', () => {
  describe('StreamParser and StateMachine integration', () => {
    let parser: StreamParser;
    let machine: StateMachine;

    beforeEach(() => {
      vi.useFakeTimers();
      parser = new StreamParser();
      machine = new StateMachine(1, 5);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('updates state from text event', () => {
      parser.on('text', (event) => {
        machine.handleText(event);
      });

      const textMsg = JSON.stringify({
        type: 'assistant',
        message: {
          id: 'msg-1',
          role: 'assistant',
          content: [{ type: 'text', text: 'Working on your task...' }],
        },
      });

      parser.parseLine(textMsg);

      expect(machine.getState().taskText).toBe('Working on your task...');
      expect(machine.getState().phase).toBe('thinking');
    });

    it('updates phase to reading on Read tool start', () => {
      parser.on('tool_start', (event) => {
        machine.handleToolStart(event);
      });

      const toolMsg = JSON.stringify({
        type: 'assistant',
        message: {
          id: 'msg-1',
          role: 'assistant',
          content: [{
            type: 'tool_use',
            id: 'tool-1',
            name: 'Read',
            input: { file_path: '/path/file.ts' },
          }],
        },
      });

      parser.parseLine(toolMsg);

      expect(machine.getState().phase).toBe('reading');
      expect(machine.getState().activeTools.size).toBe(1);
    });

    it('updates phase to editing on Edit tool start', () => {
      parser.on('tool_start', (event) => {
        machine.handleToolStart(event);
      });

      const toolMsg = JSON.stringify({
        type: 'assistant',
        message: {
          id: 'msg-1',
          role: 'assistant',
          content: [{
            type: 'tool_use',
            id: 'tool-1',
            name: 'Edit',
            input: { file_path: '/path/file.ts' },
          }],
        },
      });

      parser.parseLine(toolMsg);

      expect(machine.getState().phase).toBe('editing');
    });

    it('updates phase to running on Bash tool start', () => {
      parser.on('tool_start', (event) => {
        machine.handleToolStart(event);
      });

      const toolMsg = JSON.stringify({
        type: 'assistant',
        message: {
          id: 'msg-1',
          role: 'assistant',
          content: [{
            type: 'tool_use',
            id: 'tool-1',
            name: 'Bash',
            input: { command: 'npm test' },
          }],
        },
      });

      parser.parseLine(toolMsg);

      expect(machine.getState().phase).toBe('running');
    });

    it('updates toolGroups on tool end', () => {
      parser.on('tool_start', (event) => {
        machine.handleToolStart(event);
      });
      parser.on('tool_end', (event) => {
        machine.handleToolEnd(event);
      });

      const toolStartMsg = JSON.stringify({
        type: 'assistant',
        message: {
          id: 'msg-1',
          role: 'assistant',
          content: [{
            type: 'tool_use',
            id: 'tool-1',
            name: 'Read',
            input: { file_path: '/path/file.ts' },
          }],
        },
      });

      const toolEndMsg = JSON.stringify({
        type: 'user',
        message: {
          id: 'msg-2',
          role: 'user',
          content: [{
            type: 'tool_result',
            tool_use_id: 'tool-1',
            content: 'file contents',
          }],
        },
      });

      parser.parseLine(toolStartMsg);
      parser.parseLine(toolEndMsg);

      const state = machine.getState();
      expect(state.activeTools.size).toBe(0);
      expect(state.toolGroups).toHaveLength(1);
      expect(state.toolGroups[0].category).toBe('read');
      expect(state.stats.toolsCompleted).toBe(1);
    });

    it('sets phase to done on result event', () => {
      parser.on('result', (event) => {
        machine.handleResult(event);
      });

      const resultMsg = JSON.stringify({
        type: 'result',
        result: {
          duration_ms: 5000,
          is_error: false,
          num_turns: 3,
        },
      });

      parser.parseLine(resultMsg);

      expect(machine.getState().phase).toBe('done');
      expect(machine.getState().result).not.toBeNull();
      expect(machine.getState().result!.numTurns).toBe(3);
    });

    it('tracks multiple tools in sequence', () => {
      parser.on('tool_start', (event) => {
        machine.handleToolStart(event);
      });
      parser.on('tool_end', (event) => {
        machine.handleToolEnd(event);
      });

      const messages = [
        {
          type: 'assistant',
          message: {
            id: 'msg-1',
            role: 'assistant',
            content: [
              { type: 'tool_use', id: 'tool-1', name: 'Read', input: { file_path: '/a.ts' } },
              { type: 'tool_use', id: 'tool-2', name: 'Read', input: { file_path: '/b.ts' } },
            ],
          },
        },
        {
          type: 'user',
          message: {
            id: 'msg-2',
            role: 'user',
            content: [
              { type: 'tool_result', tool_use_id: 'tool-1', content: 'a content' },
              { type: 'tool_result', tool_use_id: 'tool-2', content: 'b content' },
            ],
          },
        },
        {
          type: 'assistant',
          message: {
            id: 'msg-3',
            role: 'assistant',
            content: [
              { type: 'tool_use', id: 'tool-3', name: 'Edit', input: { file_path: '/a.ts' } },
            ],
          },
        },
        {
          type: 'user',
          message: {
            id: 'msg-4',
            role: 'user',
            content: [
              { type: 'tool_result', tool_use_id: 'tool-3', content: 'edited' },
            ],
          },
        },
      ];

      for (const msg of messages) {
        parser.parseLine(JSON.stringify(msg));
      }

      const state = machine.getState();
      expect(state.toolGroups).toHaveLength(2);
      expect(state.toolGroups[0].category).toBe('read');
      expect(state.toolGroups[0].tools).toHaveLength(2);
      expect(state.toolGroups[1].category).toBe('write');
      expect(state.toolGroups[1].tools).toHaveLength(1);
      expect(state.stats.reads).toBe(2);
      expect(state.stats.writes).toBe(1);
    });

    it('handles error in tool result', () => {
      parser.on('tool_start', (event) => {
        machine.handleToolStart(event);
      });
      parser.on('tool_end', (event) => {
        machine.handleToolEnd(event);
      });

      const toolStartMsg = JSON.stringify({
        type: 'assistant',
        message: {
          id: 'msg-1',
          role: 'assistant',
          content: [{
            type: 'tool_use',
            id: 'tool-1',
            name: 'Read',
            input: { file_path: '/nonexistent.ts' },
          }],
        },
      });

      const toolEndMsg = JSON.stringify({
        type: 'user',
        message: {
          id: 'msg-2',
          role: 'user',
          content: [{
            type: 'tool_result',
            tool_use_id: 'tool-1',
            content: 'File not found',
            is_error: true,
          }],
        },
      });

      parser.parseLine(toolStartMsg);
      parser.parseLine(toolEndMsg);

      const state = machine.getState();
      expect(state.toolGroups[0].tools[0].isError).toBe(true);
      expect(state.stats.toolsErrored).toBe(1);
    });
  });

  describe('chunk parsing', () => {
    it('handles chunked input correctly', () => {
      const parser = new StreamParser();
      const machine = new StateMachine();

      parser.on('text', (event) => {
        machine.handleText(event);
      });

      const fullMsg = JSON.stringify({
        type: 'assistant',
        message: {
          id: 'msg-1',
          role: 'assistant',
          content: [{ type: 'text', text: 'Hello world' }],
        },
      });

      parser.parseChunk(fullMsg.slice(0, 20));
      expect(machine.getState().taskText).toBeNull();

      parser.parseChunk(fullMsg.slice(20) + '\n');
      expect(machine.getState().taskText).toBe('Hello world');
    });
  });

  describe('elapsed time calculation', () => {
    it('calculates elapsed time correctly', () => {
      vi.useFakeTimers();
      const machine = new StateMachine();

      expect(machine.getElapsedMs()).toBe(0);

      vi.advanceTimersByTime(5000);
      expect(machine.getElapsedMs()).toBe(5000);

      vi.advanceTimersByTime(2500);
      expect(machine.getElapsedMs()).toBe(7500);

      vi.useRealTimers();
    });
  });

  describe('coalesced summary', () => {
    it('generates correct summary for active tools', () => {
      const machine = new StateMachine();

      machine.handleToolStart({
        type: 'tool_start',
        toolUseId: 'tool-1',
        toolName: 'Read',
        input: { file_path: '/a.ts' },
      });

      expect(machine.getCoalescedSummary()).toContain('Reading');
      expect(machine.getCoalescedSummary()).toContain('a.ts');
    });

    it('shows waiting when idle', () => {
      const machine = new StateMachine();
      expect(machine.getCoalescedSummary()).toBe('Waiting...');
    });

    it('shows thinking when no active tools after tool completes', () => {
      const machine = new StateMachine();

      machine.handleToolStart({
        type: 'tool_start',
        toolUseId: 'tool-1',
        toolName: 'Read',
        input: { file_path: '/a.ts' },
      });
      machine.handleToolEnd({
        type: 'tool_end',
        toolUseId: 'tool-1',
        content: 'file content',
        isError: false,
      });

      expect(machine.getCoalescedSummary()).toBe('Thinking...');
    });
  });
});

describe('useClaudeStream hook exports', () => {
  it('exports SpawnFn type', async () => {
    const module = await import('../src/hooks/useClaudeStream.js');
    expect(module.useClaudeStream).toBeDefined();
  });

  it('hook can be imported', async () => {
    const { useClaudeStream } = await import('../src/hooks/useClaudeStream.js');
    expect(typeof useClaudeStream).toBe('function');
  });
});
