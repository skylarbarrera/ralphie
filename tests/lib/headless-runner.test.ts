import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  runSingleIteration,
  executeHeadlessRun,
  detectTodoStubs,
  EXIT_CODE_COMPLETE,
  EXIT_CODE_STUCK,
  EXIT_CODE_MAX_ITERATIONS,
  EXIT_CODE_ERROR,
  type HeadlessRunOptions,
} from '../../src/lib/headless-runner.js';
import * as headlessEmitter from '../../src/lib/headless-emitter.js';
import * as harnessModule from '../../src/lib/harness/index.js';
import * as fs from 'fs';
import * as specParserV2 from '../../src/lib/spec-parser-v2.js';

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

vi.mock('../../src/lib/harness/index.js', () => ({
  getHarness: vi.fn(),
}));

vi.mock('../../src/lib/spec-locator.js', () => ({
  locateActiveSpec: vi.fn(() => ({ path: '/test/specs/active/test.md' })),
  SpecLocatorError: class SpecLocatorError extends Error {
    constructor(message: string, public code: string) {
      super(message);
    }
  },
}));

vi.mock('../../src/lib/spec-parser-v2.js', () => ({
  isSpecCompleteV2: vi.fn(() => false),
  getProgressV2: vi.fn(() => ({ completed: 0, total: 1, percentage: 0 })),
  parseSpecV2: vi.fn(() => ({ isV2Format: true, tasks: [] })),
}));

describe('headless-runner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('detectTodoStubs', () => {
    it('returns empty array when git command fails', () => {
      const result = detectTodoStubs('/nonexistent-path');
      expect(result).toEqual([]);
    });
  });

  describe('runSingleIteration', () => {
    it('returns iteration result on successful completion', async () => {
      const mockHarness = {
        name: 'claude' as const,
        run: vi.fn().mockResolvedValue({
          success: true,
          durationMs: 1000,
        }),
      };
      vi.mocked(harnessModule.getHarness).mockReturnValue(mockHarness);

      const options: HeadlessRunOptions = {
        prompt: 'Test prompt',
        cwd: '/test',
        iterations: 1,
        stuckThreshold: 3,
        idleTimeoutMs: 5000,
      };

      const result = await runSingleIteration(options, 1);

      expect(result.iteration).toBe(1);
      expect(result.durationMs).toBe(1000);
      expect(result.error).toBeUndefined();
    });

    it('tracks tool stats from harness events', async () => {
      const mockHarness = {
        name: 'claude' as const,
        run: vi.fn().mockImplementation(async (_prompt, _options, onEvent) => {
          onEvent({ type: 'tool_start', name: 'Read', input: '/test/file.ts' });
          onEvent({ type: 'tool_end', name: 'Read', output: 'contents' });
          onEvent({ type: 'tool_start', name: 'Write', input: '/test/new.ts' });
          onEvent({ type: 'tool_end', name: 'Write', output: 'success' });
          return { success: true, durationMs: 1000 };
        }),
      };
      vi.mocked(harnessModule.getHarness).mockReturnValue(mockHarness);

      const options: HeadlessRunOptions = {
        prompt: 'Test prompt',
        cwd: '/test',
        iterations: 1,
        stuckThreshold: 3,
        idleTimeoutMs: 5000,
      };

      const result = await runSingleIteration(options, 1);

      expect(result.stats.toolsStarted).toBe(2);
      expect(result.stats.toolsCompleted).toBe(2);
      expect(result.stats.reads).toBe(1);
      expect(result.stats.writes).toBe(1);
    });

    it('detects git commits from Bash output', async () => {
      const mockHarness = {
        name: 'claude' as const,
        run: vi.fn().mockImplementation(async (_prompt, _options, onEvent) => {
          onEvent({ type: 'tool_start', name: 'Bash', input: 'git commit' });
          onEvent({ type: 'tool_end', name: 'Bash', output: '[main abc1234] feat: add feature' });
          return { success: true, durationMs: 1000 };
        }),
      };
      vi.mocked(harnessModule.getHarness).mockReturnValue(mockHarness);

      const options: HeadlessRunOptions = {
        prompt: 'Test prompt',
        cwd: '/test',
        iterations: 1,
        stuckThreshold: 3,
        idleTimeoutMs: 5000,
      };

      const result = await runSingleIteration(options, 1);

      expect(result.commitHash).toBe('abc1234');
      expect(result.commitMessage).toBe('feat: add feature');
      expect(headlessEmitter.emitCommit).toHaveBeenCalledWith('abc1234', 'feat: add feature');
    });

    it('returns error when harness fails', async () => {
      const mockHarness = {
        name: 'claude' as const,
        run: vi.fn().mockResolvedValue({
          success: false,
          error: 'API error',
          durationMs: 100,
        }),
      };
      vi.mocked(harnessModule.getHarness).mockReturnValue(mockHarness);

      const options: HeadlessRunOptions = {
        prompt: 'Test prompt',
        cwd: '/test',
        iterations: 1,
        stuckThreshold: 3,
        idleTimeoutMs: 5000,
      };

      const result = await runSingleIteration(options, 1);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('API error');
    });

    it('handles harness exceptions', async () => {
      const mockHarness = {
        name: 'claude' as const,
        run: vi.fn().mockRejectedValue(new Error('Network error')),
      };
      vi.mocked(harnessModule.getHarness).mockReturnValue(mockHarness);

      const options: HeadlessRunOptions = {
        prompt: 'Test prompt',
        cwd: '/test',
        iterations: 1,
        stuckThreshold: 3,
        idleTimeoutMs: 5000,
      };

      const result = await runSingleIteration(options, 1);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Network error');
    });
  });

  describe('executeHeadlessRun', () => {
    it('emits started event with harness name', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('- [x] Done');

      const mockHarness = {
        name: 'claude' as const,
        run: vi.fn().mockResolvedValue({ success: true, durationMs: 100 }),
      };
      vi.mocked(harnessModule.getHarness).mockReturnValue(mockHarness);

      const options: HeadlessRunOptions = {
        prompt: 'Test prompt',
        cwd: '/test',
        iterations: 1,
        stuckThreshold: 3,
        idleTimeoutMs: 5000,
      };

      await executeHeadlessRun(options);

      expect(headlessEmitter.emitStarted).toHaveBeenCalledWith('/test/specs/active/test.md', 1, undefined, 'claude');
    });

    it('returns EXIT_CODE_ERROR on iteration error', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('- [ ] Task');

      const mockHarness = {
        name: 'claude' as const,
        run: vi.fn().mockResolvedValue({ success: false, error: 'Failed', durationMs: 100 }),
      };
      vi.mocked(harnessModule.getHarness).mockReturnValue(mockHarness);

      const options: HeadlessRunOptions = {
        prompt: 'Test prompt',
        cwd: '/test',
        iterations: 1,
        stuckThreshold: 3,
        idleTimeoutMs: 5000,
      };

      const exitCode = await executeHeadlessRun(options);

      expect(exitCode).toBe(EXIT_CODE_ERROR);
      expect(headlessEmitter.emitFailed).toHaveBeenCalledWith('Failed');
    });

    it('returns EXIT_CODE_STUCK after threshold iterations without progress', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('- [ ] Incomplete task');

      const mockHarness = {
        name: 'claude' as const,
        run: vi.fn().mockResolvedValue({ success: true, durationMs: 100 }),
      };
      vi.mocked(harnessModule.getHarness).mockReturnValue(mockHarness);

      const options: HeadlessRunOptions = {
        prompt: 'Test prompt',
        cwd: '/test',
        iterations: 10,
        stuckThreshold: 3,
        idleTimeoutMs: 5000,
      };

      const exitCode = await executeHeadlessRun(options);

      expect(exitCode).toBe(EXIT_CODE_STUCK);
      expect(headlessEmitter.emitStuck).toHaveBeenCalledWith('No task progress', 3);
    });

    it('returns EXIT_CODE_MAX_ITERATIONS when max iterations reached', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('- [ ] Task');

      const mockHarness = {
        name: 'claude' as const,
        run: vi.fn().mockResolvedValue({ success: true, durationMs: 100 }),
      };
      vi.mocked(harnessModule.getHarness).mockReturnValue(mockHarness);

      // Mock progress to show some progress each iteration (so we don't hit stuck threshold)
      let completedCount = 0;
      vi.mocked(specParserV2.getProgressV2).mockImplementation(() => {
        completedCount++;
        return { completed: completedCount, total: 100, percentage: completedCount };
      });

      const options: HeadlessRunOptions = {
        prompt: 'Test prompt',
        cwd: '/test',
        iterations: 2,
        stuckThreshold: 10,
        idleTimeoutMs: 5000,
      };

      const exitCode = await executeHeadlessRun(options);

      expect(exitCode).toBe(EXIT_CODE_MAX_ITERATIONS);
    });
  });
});
