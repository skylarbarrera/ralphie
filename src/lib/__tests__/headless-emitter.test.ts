import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import {
  emit,
  emitStarted,
  emitIteration,
  emitTool,
  emitCommit,
  emitTaskComplete,
  emitIterationDone,
  emitStuck,
  emitComplete,
  emitFailed,
  emitWarning,
  type RalphieEvent,
} from '../headless-emitter.js';

describe('headless-emitter', () => {
  let consoleSpy: MockInstance;
  let output: string[];

  beforeEach(() => {
    output = [];
    consoleSpy = vi.spyOn(console, 'log').mockImplementation((msg: string) => {
      output.push(msg);
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('emit', () => {
    it('writes JSON to stdout', () => {
      const event: RalphieEvent = {
        event: 'started',
        spec: 'SPEC.md',
        tasks: 5,
        timestamp: '2026-01-12T12:00:00.000Z',
      };

      emit(event);

      expect(output).toHaveLength(1);
      expect(JSON.parse(output[0])).toEqual(event);
    });

    it('outputs valid JSON for each event type', () => {
      const events: RalphieEvent[] = [
        { event: 'started', spec: 'SPEC.md', tasks: 3, timestamp: '2026-01-12T12:00:00.000Z' },
        { event: 'iteration', n: 1, phase: 'reading' },
        { event: 'tool', type: 'read', path: 'src/index.ts' },
        { event: 'tool', type: 'write', path: 'src/lib/foo.ts' },
        { event: 'tool', type: 'bash' },
        { event: 'commit', hash: 'abc1234', message: 'feat: add feature' },
        { event: 'task_complete', index: 0, text: 'Add feature X' },
        { event: 'iteration_done', n: 1, duration_ms: 5000, stats: {
          toolsStarted: 10,
          toolsCompleted: 10,
          toolsErrored: 0,
          reads: 5,
          writes: 3,
          commands: 2,
          metaOps: 0,
        }},
        { event: 'stuck', reason: 'No task progress', iterations_without_progress: 3 },
        { event: 'complete', tasks_done: 5, total_duration_ms: 30000 },
        { event: 'failed', error: 'Something went wrong' },
      ];

      for (const event of events) {
        emit(event);
      }

      expect(output).toHaveLength(events.length);
      output.forEach((line, i) => {
        expect(() => JSON.parse(line)).not.toThrow();
        expect(JSON.parse(line)).toEqual(events[i]);
      });
    });
  });

  describe('emitStarted', () => {
    it('emits started event with ISO timestamp', () => {
      const before = new Date().toISOString();
      emitStarted('SPEC.md', 5);
      const after = new Date().toISOString();

      expect(output).toHaveLength(1);
      const parsed = JSON.parse(output[0]);

      expect(parsed.event).toBe('started');
      expect(parsed.spec).toBe('SPEC.md');
      expect(parsed.tasks).toBe(5);
      expect(parsed.timestamp >= before).toBe(true);
      expect(parsed.timestamp <= after).toBe(true);
    });
  });

  describe('emitIteration', () => {
    it('emits iteration event', () => {
      emitIteration(2, 'editing');

      expect(output).toHaveLength(1);
      expect(JSON.parse(output[0])).toEqual({
        event: 'iteration',
        n: 2,
        phase: 'editing',
      });
    });
  });

  describe('emitTool', () => {
    it('emits tool event with path', () => {
      emitTool('read', 'src/index.ts');

      expect(output).toHaveLength(1);
      expect(JSON.parse(output[0])).toEqual({
        event: 'tool',
        type: 'read',
        path: 'src/index.ts',
      });
    });

    it('emits tool event without path', () => {
      emitTool('bash');

      expect(output).toHaveLength(1);
      expect(JSON.parse(output[0])).toEqual({
        event: 'tool',
        type: 'bash',
      });
    });

    it('emits write tool event', () => {
      emitTool('write', 'package.json');

      expect(JSON.parse(output[0])).toEqual({
        event: 'tool',
        type: 'write',
        path: 'package.json',
      });
    });
  });

  describe('emitCommit', () => {
    it('emits commit event', () => {
      emitCommit('abc1234', 'feat: add new feature');

      expect(output).toHaveLength(1);
      expect(JSON.parse(output[0])).toEqual({
        event: 'commit',
        hash: 'abc1234',
        message: 'feat: add new feature',
      });
    });
  });

  describe('emitTaskComplete', () => {
    it('emits task_complete event', () => {
      emitTaskComplete(2, 'Implement login flow');

      expect(output).toHaveLength(1);
      expect(JSON.parse(output[0])).toEqual({
        event: 'task_complete',
        index: 2,
        text: 'Implement login flow',
      });
    });
  });

  describe('emitIterationDone', () => {
    it('emits iteration_done event with stats', () => {
      const stats = {
        toolsStarted: 15,
        toolsCompleted: 14,
        toolsErrored: 1,
        reads: 8,
        writes: 4,
        commands: 3,
        metaOps: 0,
      };

      emitIterationDone(3, 12500, stats);

      expect(output).toHaveLength(1);
      expect(JSON.parse(output[0])).toEqual({
        event: 'iteration_done',
        n: 3,
        duration_ms: 12500,
        stats,
      });
    });
  });

  describe('emitStuck', () => {
    it('emits stuck event', () => {
      emitStuck('No task progress', 3);

      expect(output).toHaveLength(1);
      expect(JSON.parse(output[0])).toEqual({
        event: 'stuck',
        reason: 'No task progress',
        iterations_without_progress: 3,
      });
    });
  });

  describe('emitComplete', () => {
    it('emits complete event', () => {
      emitComplete(10, 45000);

      expect(output).toHaveLength(1);
      expect(JSON.parse(output[0])).toEqual({
        event: 'complete',
        tasks_done: 10,
        total_duration_ms: 45000,
      });
    });
  });

  describe('emitFailed', () => {
    it('emits failed event', () => {
      emitFailed('Process crashed');

      expect(output).toHaveLength(1);
      expect(JSON.parse(output[0])).toEqual({
        event: 'failed',
        error: 'Process crashed',
      });
    });
  });

  describe('emitWarning', () => {
    it('emits warning event with files', () => {
      emitWarning('todo_stub', 'Completed tasks contain TODO stubs', ['src/foo.ts', 'src/bar.ts']);

      expect(output).toHaveLength(1);
      expect(JSON.parse(output[0])).toEqual({
        event: 'warning',
        type: 'todo_stub',
        message: 'Completed tasks contain TODO stubs',
        files: ['src/foo.ts', 'src/bar.ts'],
      });
    });

    it('emits warning event without files', () => {
      emitWarning('quality', 'Code quality issues detected');

      expect(output).toHaveLength(1);
      expect(JSON.parse(output[0])).toEqual({
        event: 'warning',
        type: 'quality',
        message: 'Code quality issues detected',
      });
    });
  });
});
