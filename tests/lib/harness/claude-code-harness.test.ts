import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClaudeCodeHarness } from '../../../src/lib/harness/claude-code-harness.js';
import * as child_process from 'child_process';
import { ChildProcess } from 'child_process';

vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

describe('ClaudeCodeHarness', () => {
  let harness: ClaudeCodeHarness;

  beforeEach(() => {
    harness = new ClaudeCodeHarness();
    vi.clearAllMocks();
  });

  describe('name', () => {
    it('should have name "claude-code"', () => {
      expect(harness.name).toBe('claude-code');
    });
  });

  describe('spawn', () => {
    it('should spawn claude process with given args', () => {
      const args = ['--help'];
      const options = { cwd: '/tmp', stdio: 'pipe' as const };

      const mockChildProcess = {
        pid: 12345,
      } as ChildProcess;

      vi.mocked(child_process.spawn).mockReturnValue(mockChildProcess);

      const result = harness.spawn(args, options);

      expect(child_process.spawn).toHaveBeenCalledWith('claude', args, options);
      expect(result).toBe(mockChildProcess);
    });
  });

  describe('runSkill', () => {
    it('should run skill and return success result', async () => {
      const context = {
        prompt: 'Test prompt',
        cwd: '/tmp',
      };

      const mockChildProcess = {
        stdout: {
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              callback(Buffer.from('output data'));
            }
          }),
        },
        stderr: {
          on: vi.fn(),
        },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            callback(0);
          }
        }),
        kill: vi.fn(),
      } as unknown as ChildProcess;

      vi.mocked(child_process.spawn).mockReturnValue(mockChildProcess);

      const result = await harness.runSkill(context);

      expect(result.success).toBe(true);
      expect(result.output).toBe('output data');
      expect(result.exitCode).toBe(0);
      expect(child_process.spawn).toHaveBeenCalledWith(
        'claude',
        [
          '--dangerously-skip-permissions',
          '--output-format',
          'stream-json',
          '--verbose',
          '-p',
          'Test prompt',
        ],
        {
          cwd: '/tmp',
          stdio: ['ignore', 'pipe', 'pipe'],
        }
      );
    });

    it('should return failure result on non-zero exit code', async () => {
      const context = {
        prompt: 'Test prompt',
        cwd: '/tmp',
      };

      const mockChildProcess = {
        stdout: {
          on: vi.fn(),
        },
        stderr: {
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              callback(Buffer.from('error message'));
            }
          }),
        },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            callback(1);
          }
        }),
        kill: vi.fn(),
      } as unknown as ChildProcess;

      vi.mocked(child_process.spawn).mockReturnValue(mockChildProcess);

      const result = await harness.runSkill(context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('error message');
      expect(result.exitCode).toBe(1);
    });

    it('should handle spawn error', async () => {
      const context = {
        prompt: 'Test prompt',
        cwd: '/tmp',
      };

      const mockChildProcess = {
        stdout: {
          on: vi.fn(),
        },
        stderr: {
          on: vi.fn(),
        },
        on: vi.fn((event, callback) => {
          if (event === 'error') {
            callback(new Error('spawn error'));
          }
        }),
        kill: vi.fn(),
      } as unknown as ChildProcess;

      vi.mocked(child_process.spawn).mockReturnValue(mockChildProcess);

      const result = await harness.runSkill(context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('spawn error');
      expect(result.exitCode).toBe(-1);
    });

    it('should handle timeout', async () => {
      vi.useFakeTimers();

      const context = {
        prompt: 'Test prompt',
        cwd: '/tmp',
        timeout: 1000,
      };

      const mockChildProcess = {
        stdout: {
          on: vi.fn(),
        },
        stderr: {
          on: vi.fn(),
        },
        on: vi.fn(),
        kill: vi.fn(),
      } as unknown as ChildProcess;

      vi.mocked(child_process.spawn).mockReturnValue(mockChildProcess);

      const promise = harness.runSkill(context);

      await vi.advanceTimersByTimeAsync(1000);

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toBe('Timeout after 1000ms');
      expect(result.exitCode).toBe(-1);
      expect(mockChildProcess.kill).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });
});
