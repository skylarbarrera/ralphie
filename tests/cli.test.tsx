import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolvePrompt, DEFAULT_PROMPT, GREEDY_PROMPT, type CliOptions } from '../src/cli.js';
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
        greedy: false,
        budget: 4,
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
        greedy: false,
        budget: 4,
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
        greedy: false,
        budget: 4,
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
        greedy: false,
        budget: 4,
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
        greedy: false,
        budget: 4,
      };

      expect(resolvePrompt(options)).toBe('Direct prompt');
      expect(readFileSync).not.toHaveBeenCalled();
    });

    it('returns GREEDY_PROMPT when greedy option is true', () => {
      const options: CliOptions = {
        iterations: 1,
        all: false,
        cwd: '/test',
        timeoutIdle: 120,
        quiet: false,
        noBranch: false,
        headless: false,
        stuckThreshold: 3,
        greedy: true,
        budget: 4,
      };

      expect(resolvePrompt(options)).toBe(GREEDY_PROMPT);
    });
  });

  describe('DEFAULT_PROMPT', () => {
    it('contains Ralphie loop instructions', () => {
      expect(DEFAULT_PROMPT).toContain('Ralphie');
      expect(DEFAULT_PROMPT).toContain('specs/active/');
      expect(DEFAULT_PROMPT).toContain('STATE.txt');
      expect(DEFAULT_PROMPT.toLowerCase()).toContain('commit');
    });

    it('instructs to work on one task per iteration', () => {
      expect(DEFAULT_PROMPT).toContain('Complete ONE task from specs/active/');
    });

    it('includes memory file instructions', () => {
      expect(DEFAULT_PROMPT).toContain('plan.md');
      expect(DEFAULT_PROMPT).toContain('index.md');
    });

    it('references V2 task format', () => {
      expect(DEFAULT_PROMPT).toContain('T001');
      expect(DEFAULT_PROMPT).toContain('Status: pending');
      expect(DEFAULT_PROMPT).toContain('Status: passed');
    });

    it('instructs to run Verify command', () => {
      expect(DEFAULT_PROMPT).toContain('Verify command');
    });
  });

  describe('GREEDY_PROMPT', () => {
    it('contains greedy mode instructions', () => {
      expect(GREEDY_PROMPT).toContain('GREEDY MODE');
      expect(GREEDY_PROMPT).toContain('AS MANY tasks as possible from specs/active/');
    });

    it('instructs to continue to next task', () => {
      expect(GREEDY_PROMPT).toContain('CONTINUE to next task');
    });

    it('includes memory file instructions', () => {
      expect(GREEDY_PROMPT).toContain('plan.md');
      expect(GREEDY_PROMPT).toContain('index.md');
    });
  });
});
