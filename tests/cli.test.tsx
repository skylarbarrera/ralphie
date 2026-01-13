import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolvePrompt, DEFAULT_PROMPT, type CliOptions } from '../src/cli.js';
import { existsSync, readFileSync } from 'fs';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

describe('cli', () => {
  describe('resolvePrompt', () => {
    beforeEach(() => {
      vi.mocked(existsSync).mockReset();
      vi.mocked(readFileSync).mockReset();
    });

    it('returns prompt option when provided', () => {
      const options: CliOptions = {
        iterations: 1,
        all: false,
        prompt: 'Custom prompt text',
        cwd: '/test',
        timeoutIdle: 120,
        quiet: false,
        noBranch: false,
        headless: false,
        stuckThreshold: 3,
      };

      expect(resolvePrompt(options)).toBe('Custom prompt text');
    });

    it('reads prompt from file when promptFile is provided', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('Prompt from file content');

      const options: CliOptions = {
        iterations: 1,
        all: false,
        promptFile: './prompt.txt',
        cwd: '/test',
        timeoutIdle: 120,
        quiet: false,
        noBranch: false,
        headless: false,
        stuckThreshold: 3,
      };

      expect(resolvePrompt(options)).toBe('Prompt from file content');
      expect(existsSync).toHaveBeenCalledWith('/test/prompt.txt');
      expect(readFileSync).toHaveBeenCalledWith('/test/prompt.txt', 'utf-8');
    });

    it('throws error when promptFile does not exist', () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const options: CliOptions = {
        iterations: 1,
        all: false,
        promptFile: './missing.txt',
        cwd: '/test',
        timeoutIdle: 120,
        quiet: false,
        noBranch: false,
        headless: false,
        stuckThreshold: 3,
      };

      expect(() => resolvePrompt(options)).toThrow('Prompt file not found: /test/missing.txt');
    });

    it('returns DEFAULT_PROMPT when no prompt options are provided', () => {
      const options: CliOptions = {
        iterations: 1,
        all: false,
        cwd: '/test',
        timeoutIdle: 120,
        quiet: false,
        noBranch: false,
        headless: false,
        stuckThreshold: 3,
      };

      expect(resolvePrompt(options)).toBe(DEFAULT_PROMPT);
    });

    it('prioritizes prompt over promptFile', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('File content');

      const options: CliOptions = {
        iterations: 1,
        all: false,
        prompt: 'Direct prompt',
        promptFile: './prompt.txt',
        cwd: '/test',
        timeoutIdle: 120,
        quiet: false,
        noBranch: false,
        headless: false,
        stuckThreshold: 3,
      };

      expect(resolvePrompt(options)).toBe('Direct prompt');
      expect(readFileSync).not.toHaveBeenCalled();
    });
  });

  describe('DEFAULT_PROMPT', () => {
    it('contains Ralph loop instructions', () => {
      expect(DEFAULT_PROMPT).toContain('Ralph');
      expect(DEFAULT_PROMPT).toContain('SPEC.md');
      expect(DEFAULT_PROMPT).toContain('STATE.txt');
      expect(DEFAULT_PROMPT).toContain('task');
      expect(DEFAULT_PROMPT.toLowerCase()).toContain('commit');
    });

    it('instructs to work on one task per iteration', () => {
      expect(DEFAULT_PROMPT).toContain('ONE CHECKBOX = ONE ITERATION');
    });
  });
});
