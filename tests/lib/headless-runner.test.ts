import { describe, it, expect, vi, beforeEach } from 'vitest';
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
} from '../../src/lib/headless-runner.js';
import * as headlessEmitter from '../../src/lib/headless-emitter.js';
import * as harnessModule from '../../src/lib/harness/index.js';
import * as specParserV2 from '../../src/lib/spec-parser-v2.js';
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

vi.mock('../../src/lib/harness/index.js', () => ({
  getHarness: vi.fn(),
}));

vi.mock('../../src/lib/spec-locator.js', () => ({
  locateActiveSpec: vi.fn(() => ({ path: '/test/specs/active/test.md', isLegacy: false })),
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

    it('returns EXIT_CODE_COMPLETE when all tasks done', async () => {
      let readCount = 0;
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        readCount++;
        if (readCount <= 2) {
          return '- [ ] Task\n- [x] Done';
        }
        return '- [x] Task\n- [x] Done';
      });

      // Mock V2 spec completion - return true after first iteration
      let iterCount = 0;
      vi.mocked(specParserV2.isSpecCompleteV2).mockImplementation(() => {
        iterCount++;
        return iterCount > 1;
      });

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

      expect(exitCode).toBe(EXIT_CODE_COMPLETE);
      expect(headlessEmitter.emitComplete).toHaveBeenCalled();
    });

    it('returns EXIT_CODE_MAX_ITERATIONS when iterations exhausted', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      let readCount = 0;
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        readCount++;
        const completed = '- [x] Done'.repeat(readCount);
        return `${completed}\n- [ ] Always incomplete`;
      });

      // V2 spec never completes
      vi.mocked(specParserV2.isSpecCompleteV2).mockReturnValue(false);

      const mockHarness = {
        name: 'claude' as const,
        run: vi.fn().mockResolvedValue({ success: true, durationMs: 100 }),
      };
      vi.mocked(harnessModule.getHarness).mockReturnValue(mockHarness);

      const options: HeadlessRunOptions = {
        prompt: 'Test prompt',
        cwd: '/test',
        iterations: 2,
        stuckThreshold: 5,
        idleTimeoutMs: 5000,
      };

      const exitCode = await executeHeadlessRun(options);

      expect(exitCode).toBe(EXIT_CODE_MAX_ITERATIONS);
    });

    it('uses specified harness', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('- [x] Done');

      const mockHarness = {
        name: 'codex' as const,
        run: vi.fn().mockResolvedValue({ success: true, durationMs: 100 }),
      };
      vi.mocked(harnessModule.getHarness).mockReturnValue(mockHarness);

      const options: HeadlessRunOptions = {
        prompt: 'Test prompt',
        cwd: '/test',
        iterations: 1,
        stuckThreshold: 3,
        idleTimeoutMs: 5000,
        harness: 'codex',
      };

      await executeHeadlessRun(options);

      expect(harnessModule.getHarness).toHaveBeenCalledWith('codex');
      expect(headlessEmitter.emitStarted).toHaveBeenCalledWith('/test/specs/active/test.md', 1, undefined, 'codex');
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
