import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import { Readable } from 'stream';
import type { ChildProcess } from 'child_process';
import {
  runSingleIteration,
  executeHeadlessRun,
  getCompletedTaskTexts,
  getTotalTaskCount,
  detectTodoStubs,
  EXIT_CODE_COMPLETE,
  EXIT_CODE_STUCK,
  EXIT_CODE_MAX_ITERATIONS,
  EXIT_CODE_ERROR,
  type HeadlessRunOptions,
  type SpawnFn,
} from '../../src/lib/headless-runner.js';
import * as headlessEmitter from '../../src/lib/headless-emitter.js';
import * as fs from 'fs';

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
}));

vi.mock('../../src/lib/headless-emitter.js', () => ({
  emitStarted: vi.fn(),
  emitIteration: vi.fn(),
  emitTool: vi.fn(),
  emitCommit: vi.fn(),
  emitTaskComplete: vi.fn(),
  emitIterationDone: vi.fn(),
  emitStuck: vi.fn(),
  emitComplete: vi.fn(),
  emitFailed: vi.fn(),
  emitWarning: vi.fn(),
}));

function createMockProcess(): ChildProcess & {
  stdout: Readable;
  stderr: Readable;
  emitData: (data: string) => void;
  emitClose: () => void;
  emitError: (err: Error) => void;
} {
  const proc = new EventEmitter() as ChildProcess & {
    stdout: Readable;
    stderr: Readable;
    emitData: (data: string) => void;
    emitClose: () => void;
    emitError: (err: Error) => void;
  };
  proc.stdout = new Readable({ read() {} });
  proc.stderr = new Readable({ read() {} });
  proc.kill = vi.fn();

  proc.emitData = (data: string) => {
    proc.stdout.emit('data', Buffer.from(data));
  };

  proc.emitClose = () => {
    proc.emit('close', 0);
  };

  proc.emitError = (err: Error) => {
    proc.emit('error', err);
  };

  return proc;
}

describe('headless-runner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getCompletedTaskTexts', () => {
    it('returns empty array when SPEC.md does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = getCompletedTaskTexts('/test');

      expect(result).toEqual([]);
    });

    it('returns completed task texts', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(`
# SPEC

## Phase 1
- [x] Task one completed
- [ ] Task two pending
- [X] Task three also completed
      `);

      const result = getCompletedTaskTexts('/test');

      expect(result).toEqual(['Task one completed', 'Task three also completed']);
    });
  });

  describe('getTotalTaskCount', () => {
    it('returns 0 when SPEC.md does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = getTotalTaskCount('/test');

      expect(result).toBe(0);
    });

    it('counts both completed and incomplete tasks', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(`
# SPEC

- [x] Completed task
- [ ] Incomplete task
- [X] Another completed
- [ ] Another incomplete
      `);

      const result = getTotalTaskCount('/test');

      expect(result).toBe(4);
    });
  });

  describe('detectTodoStubs', () => {
    it('returns empty array when git command fails', () => {
      const result = detectTodoStubs('/nonexistent-path');
      expect(result).toEqual([]);
    });
  });

  describe('runSingleIteration', () => {
    it('returns iteration result on successful completion', async () => {
      const mockProc = createMockProcess();
      const mockSpawn: SpawnFn = vi.fn().mockReturnValue(mockProc);

      const options: HeadlessRunOptions = {
        prompt: 'Test prompt',
        cwd: '/test',
        iterations: 1,
        stuckThreshold: 3,
        idleTimeoutMs: 5000,
      };

      const resultPromise = runSingleIteration(options, 1, 1, mockSpawn);

      // Simulate Claude output
      const systemMsg = JSON.stringify({ type: 'system', result: { session_id: 'test' } });
      const textMsg = JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'Working...' }] } });
      const resultMsg = JSON.stringify({ type: 'result', result: { is_error: false, duration_ms: 1000 } });

      mockProc.emitData(systemMsg + '\n');
      mockProc.emitData(textMsg + '\n');
      mockProc.emitData(resultMsg + '\n');
      mockProc.emitClose();

      const result = await resultPromise;

      expect(result.iteration).toBe(1);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    });

    it('emits tool events for Read operations', async () => {
      const mockProc = createMockProcess();
      const mockSpawn: SpawnFn = vi.fn().mockReturnValue(mockProc);

      const options: HeadlessRunOptions = {
        prompt: 'Test prompt',
        cwd: '/test',
        iterations: 1,
        stuckThreshold: 3,
        idleTimeoutMs: 5000,
      };

      const resultPromise = runSingleIteration(options, 1, 1, mockSpawn);

      const toolStartMsg = JSON.stringify({
        type: 'assistant',
        message: {
          content: [{
            type: 'tool_use',
            id: 'tool-1',
            name: 'Read',
            input: { file_path: '/test/file.ts' }
          }]
        }
      });
      const toolEndMsg = JSON.stringify({
        type: 'user',
        message: {
          content: [{
            type: 'tool_result',
            tool_use_id: 'tool-1',
            content: 'file contents'
          }]
        }
      });
      const resultMsg = JSON.stringify({ type: 'result', result: { is_error: false } });

      mockProc.emitData(toolStartMsg + '\n');
      mockProc.emitData(toolEndMsg + '\n');
      mockProc.emitData(resultMsg + '\n');
      mockProc.emitClose();

      await resultPromise;

      expect(headlessEmitter.emitTool).toHaveBeenCalledWith('read', '/test/file.ts');
    });

    it('emits tool events for Write operations', async () => {
      const mockProc = createMockProcess();
      const mockSpawn: SpawnFn = vi.fn().mockReturnValue(mockProc);

      const options: HeadlessRunOptions = {
        prompt: 'Test prompt',
        cwd: '/test',
        iterations: 1,
        stuckThreshold: 3,
        idleTimeoutMs: 5000,
      };

      const resultPromise = runSingleIteration(options, 1, 1, mockSpawn);

      const toolStartMsg = JSON.stringify({
        type: 'assistant',
        message: {
          content: [{
            type: 'tool_use',
            id: 'tool-1',
            name: 'Write',
            input: { file_path: '/test/new-file.ts' }
          }]
        }
      });
      const toolEndMsg = JSON.stringify({
        type: 'user',
        message: {
          content: [{
            type: 'tool_result',
            tool_use_id: 'tool-1',
            content: 'success'
          }]
        }
      });
      const resultMsg = JSON.stringify({ type: 'result', result: { is_error: false } });

      mockProc.emitData(toolStartMsg + '\n');
      mockProc.emitData(toolEndMsg + '\n');
      mockProc.emitData(resultMsg + '\n');
      mockProc.emitClose();

      await resultPromise;

      expect(headlessEmitter.emitTool).toHaveBeenCalledWith('write', '/test/new-file.ts');
    });

    it('emits tool events for Bash commands', async () => {
      const mockProc = createMockProcess();
      const mockSpawn: SpawnFn = vi.fn().mockReturnValue(mockProc);

      const options: HeadlessRunOptions = {
        prompt: 'Test prompt',
        cwd: '/test',
        iterations: 1,
        stuckThreshold: 3,
        idleTimeoutMs: 5000,
      };

      const resultPromise = runSingleIteration(options, 1, 1, mockSpawn);

      const toolStartMsg = JSON.stringify({
        type: 'assistant',
        message: {
          content: [{
            type: 'tool_use',
            id: 'tool-1',
            name: 'Bash',
            input: { command: 'npm test' }
          }]
        }
      });
      const toolEndMsg = JSON.stringify({
        type: 'user',
        message: {
          content: [{
            type: 'tool_result',
            tool_use_id: 'tool-1',
            content: 'All tests passed'
          }]
        }
      });
      const resultMsg = JSON.stringify({ type: 'result', result: { is_error: false } });

      mockProc.emitData(toolStartMsg + '\n');
      mockProc.emitData(toolEndMsg + '\n');
      mockProc.emitData(resultMsg + '\n');
      mockProc.emitClose();

      await resultPromise;

      expect(headlessEmitter.emitTool).toHaveBeenCalledWith('bash', undefined);
    });

    it('returns error on process error', async () => {
      const mockProc = createMockProcess();
      const mockSpawn: SpawnFn = vi.fn().mockReturnValue(mockProc);

      const options: HeadlessRunOptions = {
        prompt: 'Test prompt',
        cwd: '/test',
        iterations: 1,
        stuckThreshold: 3,
        idleTimeoutMs: 5000,
      };

      const resultPromise = runSingleIteration(options, 1, 1, mockSpawn);

      mockProc.emitError(new Error('Process failed'));

      const result = await resultPromise;

      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Process failed');
    });

    it('detects git commits', async () => {
      const mockProc = createMockProcess();
      const mockSpawn: SpawnFn = vi.fn().mockReturnValue(mockProc);

      const options: HeadlessRunOptions = {
        prompt: 'Test prompt',
        cwd: '/test',
        iterations: 1,
        stuckThreshold: 3,
        idleTimeoutMs: 5000,
      };

      const resultPromise = runSingleIteration(options, 1, 1, mockSpawn);

      const toolStartMsg = JSON.stringify({
        type: 'assistant',
        message: {
          content: [{
            type: 'tool_use',
            id: 'tool-1',
            name: 'Bash',
            input: { command: 'git commit -m "feat: add feature"' }
          }]
        }
      });
      const toolEndMsg = JSON.stringify({
        type: 'user',
        message: {
          content: [{
            type: 'tool_result',
            tool_use_id: 'tool-1',
            content: '[main abc1234] feat: add feature'
          }]
        }
      });
      const resultMsg = JSON.stringify({ type: 'result', result: { is_error: false } });

      mockProc.emitData(toolStartMsg + '\n');
      mockProc.emitData(toolEndMsg + '\n');
      mockProc.emitData(resultMsg + '\n');
      mockProc.emitClose();

      const result = await resultPromise;

      expect(result.commitHash).toBe('abc1234');
      expect(result.commitMessage).toBe('feat: add feature');
      expect(headlessEmitter.emitCommit).toHaveBeenCalledWith('abc1234', 'feat: add feature');
    });
  });

  describe('executeHeadlessRun', () => {
    it('emits started event with total task count', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(`
- [x] Done
- [ ] Todo
      `);

      const mockProc = createMockProcess();
      const mockSpawn: SpawnFn = vi.fn().mockReturnValue(mockProc);

      const options: HeadlessRunOptions = {
        prompt: 'Test prompt',
        cwd: '/test',
        iterations: 1,
        stuckThreshold: 3,
        idleTimeoutMs: 5000,
      };

      const resultPromise = executeHeadlessRun(options, mockSpawn);

      // Simulate quick completion
      const resultMsg = JSON.stringify({ type: 'result', result: { is_error: false } });
      mockProc.emitData(resultMsg + '\n');
      mockProc.emitClose();

      await resultPromise;

      expect(headlessEmitter.emitStarted).toHaveBeenCalledWith('SPEC.md', 2, undefined);
    });

    it('returns EXIT_CODE_ERROR on iteration error', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('- [ ] Task');

      const mockProc = createMockProcess();
      const mockSpawn: SpawnFn = vi.fn().mockReturnValue(mockProc);

      const options: HeadlessRunOptions = {
        prompt: 'Test prompt',
        cwd: '/test',
        iterations: 1,
        stuckThreshold: 3,
        idleTimeoutMs: 5000,
      };

      const resultPromise = executeHeadlessRun(options, mockSpawn);

      mockProc.emitError(new Error('Claude failed'));

      const exitCode = await resultPromise;

      expect(exitCode).toBe(EXIT_CODE_ERROR);
      expect(headlessEmitter.emitFailed).toHaveBeenCalledWith('Claude failed');
    });

    it('returns EXIT_CODE_STUCK after threshold iterations without progress', async () => {
      let callCount = 0;
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        // Always return the same incomplete task (no progress)
        return '- [ ] Incomplete task';
      });

      const mockSpawn: SpawnFn = vi.fn().mockImplementation(() => {
        callCount++;
        const proc = createMockProcess();
        // Auto-complete each iteration
        setTimeout(() => {
          const resultMsg = JSON.stringify({ type: 'result', result: { is_error: false } });
          proc.emitData(resultMsg + '\n');
          proc.emitClose();
        }, 10);
        return proc;
      });

      const options: HeadlessRunOptions = {
        prompt: 'Test prompt',
        cwd: '/test',
        iterations: 10,
        stuckThreshold: 3,
        idleTimeoutMs: 5000,
      };

      const exitCode = await executeHeadlessRun(options, mockSpawn);

      expect(exitCode).toBe(EXIT_CODE_STUCK);
      expect(headlessEmitter.emitStuck).toHaveBeenCalledWith('No task progress', 3);
    });

    it('returns EXIT_CODE_COMPLETE when all tasks done', async () => {
      let callCount = 0;
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          // First call (task count) and initial state - has incomplete task
          return '- [ ] Task\n- [x] Done';
        }
        // After iteration - all complete
        return '- [x] Task\n- [x] Done';
      });

      const mockSpawn: SpawnFn = vi.fn().mockImplementation(() => {
        const proc = createMockProcess();
        setTimeout(() => {
          const resultMsg = JSON.stringify({ type: 'result', result: { is_error: false } });
          proc.emitData(resultMsg + '\n');
          proc.emitClose();
        }, 10);
        return proc;
      });

      const options: HeadlessRunOptions = {
        prompt: 'Test prompt',
        cwd: '/test',
        iterations: 10,
        stuckThreshold: 3,
        idleTimeoutMs: 5000,
      };

      const exitCode = await executeHeadlessRun(options, mockSpawn);

      expect(exitCode).toBe(EXIT_CODE_COMPLETE);
      expect(headlessEmitter.emitComplete).toHaveBeenCalled();
    });

    it('returns EXIT_CODE_MAX_ITERATIONS when iterations exhausted', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      // Return different tasks to avoid stuck detection, but never complete
      let readCount = 0;
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        readCount++;
        // Add a new completed task each time to avoid stuck detection
        const completed = '- [x] Done'.repeat(readCount);
        return `${completed}\n- [ ] Always incomplete`;
      });

      const mockSpawn: SpawnFn = vi.fn().mockImplementation(() => {
        const proc = createMockProcess();
        setTimeout(() => {
          const resultMsg = JSON.stringify({ type: 'result', result: { is_error: false } });
          proc.emitData(resultMsg + '\n');
          proc.emitClose();
        }, 10);
        return proc;
      });

      const options: HeadlessRunOptions = {
        prompt: 'Test prompt',
        cwd: '/test',
        iterations: 2,
        stuckThreshold: 5,
        idleTimeoutMs: 5000,
      };

      const exitCode = await executeHeadlessRun(options, mockSpawn);

      expect(exitCode).toBe(EXIT_CODE_MAX_ITERATIONS);
    });

    it('emits iteration events', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('- [x] All done');

      const mockSpawn: SpawnFn = vi.fn().mockImplementation(() => {
        const proc = createMockProcess();
        setTimeout(() => {
          const resultMsg = JSON.stringify({ type: 'result', result: { is_error: false } });
          proc.emitData(resultMsg + '\n');
          proc.emitClose();
        }, 10);
        return proc;
      });

      const options: HeadlessRunOptions = {
        prompt: 'Test prompt',
        cwd: '/test',
        iterations: 1,
        stuckThreshold: 3,
        idleTimeoutMs: 5000,
      };

      await executeHeadlessRun(options, mockSpawn);

      expect(headlessEmitter.emitIteration).toHaveBeenCalledWith(1, 'starting');
    });

    it('emits iteration_done events with stats', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('- [x] All done');

      const mockSpawn: SpawnFn = vi.fn().mockImplementation(() => {
        const proc = createMockProcess();
        setTimeout(() => {
          const resultMsg = JSON.stringify({ type: 'result', result: { is_error: false } });
          proc.emitData(resultMsg + '\n');
          proc.emitClose();
        }, 10);
        return proc;
      });

      const options: HeadlessRunOptions = {
        prompt: 'Test prompt',
        cwd: '/test',
        iterations: 1,
        stuckThreshold: 3,
        idleTimeoutMs: 5000,
      };

      await executeHeadlessRun(options, mockSpawn);

      expect(headlessEmitter.emitIterationDone).toHaveBeenCalledWith(
        1,
        expect.any(Number),
        expect.objectContaining({
          toolsStarted: expect.any(Number),
          toolsCompleted: expect.any(Number),
        })
      );
    });

    it('emits task_complete for newly completed tasks', async () => {
      let readCount = 0;
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        readCount++;
        if (readCount <= 2) {
          // Initial state
          return '- [ ] Task A\n- [ ] Task B';
        }
        // After iteration - Task A completed
        return '- [x] Task A\n- [ ] Task B';
      });

      const mockSpawn: SpawnFn = vi.fn().mockImplementation(() => {
        const proc = createMockProcess();
        setTimeout(() => {
          const resultMsg = JSON.stringify({ type: 'result', result: { is_error: false } });
          proc.emitData(resultMsg + '\n');
          proc.emitClose();
        }, 10);
        return proc;
      });

      const options: HeadlessRunOptions = {
        prompt: 'Test prompt',
        cwd: '/test',
        iterations: 1,
        stuckThreshold: 3,
        idleTimeoutMs: 5000,
      };

      await executeHeadlessRun(options, mockSpawn);

      expect(headlessEmitter.emitTaskComplete).toHaveBeenCalledWith(1, 'Task A');
    });
  });

  describe('exit codes', () => {
    it('EXIT_CODE_COMPLETE is 0', () => {
      expect(EXIT_CODE_COMPLETE).toBe(0);
    });

    it('EXIT_CODE_STUCK is 1', () => {
      expect(EXIT_CODE_STUCK).toBe(1);
    });

    it('EXIT_CODE_MAX_ITERATIONS is 2', () => {
      expect(EXIT_CODE_MAX_ITERATIONS).toBe(2);
    });

    it('EXIT_CODE_ERROR is 3', () => {
      expect(EXIT_CODE_ERROR).toBe(3);
    });
  });
});
