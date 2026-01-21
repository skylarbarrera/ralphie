import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateSpec, type SpecGeneratorOptions } from '../../src/lib/spec-generator.js';
import * as fs from 'fs';
import * as harnessModule from '../../src/lib/harness/index.js';
import * as specValidatorModule from '../../src/lib/spec-validator.js';
import type { HarnessResult, HarnessRunOptions, HarnessEvent } from '../../src/lib/harness/types.js';

vi.mock('fs');
vi.mock('../../src/lib/harness/index.js');
vi.mock('../../src/lib/spec-validator.js');

describe('spec-generator', () => {
  let harnessRunMock: ReturnType<typeof vi.fn<[string, HarnessRunOptions, (event: HarnessEvent) => void], Promise<HarnessResult>>>;

  beforeEach(() => {
    vi.clearAllMocks();

    harnessRunMock = vi.fn<[string, HarnessRunOptions, (event: HarnessEvent) => void], Promise<HarnessResult>>();
    vi.mocked(harnessModule.getHarness).mockReturnValue({
      name: 'claude',
      run: harnessRunMock,
    });

    vi.mocked(specValidatorModule.validateSpecInDir).mockReturnValue({
      valid: true,
      violations: [],
      warnings: [],
    });
    vi.mocked(specValidatorModule.formatValidationResult).mockReturnValue('✓ Valid');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateSpec', () => {
    it('uses harness with autonomous prompt containing description', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('# Test Spec\n\n### T001: Task 1\n- Status: pending');

      harnessRunMock.mockImplementation(async (prompt, opts, onEvent) => {
        onEvent({ type: 'message', text: 'SPEC_COMPLETE' });
        return { success: true, durationMs: 1000 } as HarnessResult;
      });

      const options: SpecGeneratorOptions = {
        description: 'Build a REST API for user management',
        cwd: '/test/path',
        headless: false,
        timeoutMs: 5000,
        skipResearch: true,
      };

      await generateSpec(options);

      expect(harnessModule.getHarness).toHaveBeenCalledWith('claude');
      expect(harnessRunMock).toHaveBeenCalledWith(
        expect.stringContaining('Build a REST API for user management'),
        expect.objectContaining({ cwd: '/test/path' }),
        expect.any(Function)
      );

      const prompt = harnessRunMock.mock.calls[0][0] as string;
      expect(prompt).toContain('V2 format');
      expect(prompt).toContain('specs/active/');
    });

    it('always passes interactive: false (CLI is headless by definition)', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('# Test Spec\n\n### T001: Task 1\n- Status: pending');

      harnessRunMock.mockImplementation(async (prompt, opts, onEvent) => {
        onEvent({ type: 'message', text: 'SPEC_COMPLETE' });
        return { success: true, durationMs: 1000 } as HarnessResult;
      });

      const options: SpecGeneratorOptions = {
        description: 'Build a CLI tool',
        cwd: '/test/path',
        headless: false,
        timeoutMs: 5000,
        skipResearch: true,
      };

      await generateSpec(options);

      const runOptions = harnessRunMock.mock.calls[0][1] as HarnessRunOptions;
      expect(runOptions.interactive).toBe(false);
    });

    it('respects model option', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('# Test Spec\n\n### T001: Task 1\n- Status: pending');

      harnessRunMock.mockImplementation(async (prompt, opts, onEvent) => {
        onEvent({ type: 'message', text: 'SPEC_COMPLETE' });
        return { success: true, durationMs: 1000 } as HarnessResult;
      });

      const options: SpecGeneratorOptions = {
        description: 'Test',
        cwd: '/test',
        headless: true,
        timeoutMs: 5000,
        model: 'opus',
        skipResearch: true,
      };

      await generateSpec(options);

      const runOptions = harnessRunMock.mock.calls[0][1] as HarnessRunOptions;
      expect(runOptions.model).toBe('opus');
    });
  });

  describe('result handling', () => {
    it('returns success when SPEC_COMPLETE marker is present', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        '# Test Spec\n\n### T001: Task 1\n- Status: pending\n\n### T002: Task 2\n- Status: pending\n\n### T003: Task 3\n- Status: pending'
      );

      harnessRunMock.mockImplementation(async (prompt, opts, onEvent) => {
        onEvent({ type: 'message', text: 'Creating spec...' });
        onEvent({ type: 'message', text: 'SPEC_COMPLETE\n\nSpec created.' });
        return { success: true, durationMs: 1000 } as HarnessResult;
      });

      const options: SpecGeneratorOptions = {
        description: 'Test',
        cwd: '/test',
        headless: true,
        timeoutMs: 5000,
        skipResearch: true,
      };

      const result = await generateSpec(options);

      expect(result.success).toBe(true);
      expect(result.taskCount).toBe(3);
    });

    it('returns failure when SPEC_COMPLETE marker is missing', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        '# Test Spec\n\n### T001: Task 1\n- Status: pending'
      );

      harnessRunMock.mockImplementation(async (prompt, opts, onEvent) => {
        onEvent({ type: 'message', text: 'Creating spec...' });
        // No SPEC_COMPLETE marker
        return { success: true, durationMs: 1000 } as HarnessResult;
      });

      const options: SpecGeneratorOptions = {
        description: 'Test',
        cwd: '/test',
        headless: true,
        timeoutMs: 5000,
        skipResearch: true,
      };

      const result = await generateSpec(options);

      expect(result.success).toBe(false);
      expect(result.taskCount).toBe(1);
    });

    it('returns failure when spec is not created', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      harnessRunMock.mockResolvedValue({
        success: true,
        durationMs: 1000,
      } as HarnessResult);

      const options: SpecGeneratorOptions = {
        description: 'Test',
        cwd: '/test',
        headless: true,
        timeoutMs: 5000,
        skipResearch: true,
      };

      const result = await generateSpec(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Spec was not created');
    });

    it('validates spec and returns validation result', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('# Test Spec\n\n### T001: Task 1\n- Status: pending');
      vi.mocked(specValidatorModule.validateSpecInDir).mockReturnValue({
        valid: false,
        violations: [{ type: 'code_snippet', line: 1, content: '```code```', message: 'Code not allowed' }],
        warnings: [],
      });
      vi.mocked(specValidatorModule.formatValidationResult).mockReturnValue('✗ Invalid');

      harnessRunMock.mockImplementation(async (prompt, opts, onEvent) => {
        onEvent({ type: 'message', text: 'SPEC_COMPLETE' });
        return { success: true, durationMs: 1000 } as HarnessResult;
      });

      const options: SpecGeneratorOptions = {
        description: 'Test',
        cwd: '/test',
        headless: true,
        timeoutMs: 5000,
        skipResearch: true,
      };

      const result = await generateSpec(options);

      expect(result.validationPassed).toBe(false);
      expect(result.validationOutput).toBe('✗ Invalid');
    });

    it('returns failure when taskCount is 0', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('# Empty Spec\n\nNo tasks here');

      harnessRunMock.mockImplementation(async (prompt, opts, onEvent) => {
        onEvent({ type: 'message', text: 'SPEC_COMPLETE' });
        return { success: true, durationMs: 1000 } as HarnessResult;
      });

      const options: SpecGeneratorOptions = {
        description: 'Test',
        cwd: '/test',
        headless: true,
        timeoutMs: 5000,
        skipResearch: true,
      };

      const result = await generateSpec(options);

      expect(result.success).toBe(false);
      expect(result.taskCount).toBe(0);
    });

    it('returns failure when harness fails', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('# Test Spec\n\n### T001: Task 1\n- Status: pending');

      harnessRunMock.mockImplementation(async (prompt, opts, onEvent) => {
        onEvent({ type: 'message', text: 'SPEC_COMPLETE' });
        return { success: false, durationMs: 1000, error: 'Harness error' } as HarnessResult;
      });

      const options: SpecGeneratorOptions = {
        description: 'Test',
        cwd: '/test',
        headless: true,
        timeoutMs: 5000,
        skipResearch: true,
      };

      const result = await generateSpec(options);

      expect(result.success).toBe(false);
    });
  });

  describe('error handling', () => {
    it('returns error when harness throws', async () => {
      harnessRunMock.mockRejectedValue(new Error('Connection failed'));

      const options: SpecGeneratorOptions = {
        description: 'Test',
        cwd: '/test',
        headless: true,
        timeoutMs: 5000,
        skipResearch: true,
      };

      const result = await generateSpec(options);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection failed');
    });

    it('handles non-Error exceptions', async () => {
      harnessRunMock.mockRejectedValue('String error');

      const options: SpecGeneratorOptions = {
        description: 'Test',
        cwd: '/test',
        headless: true,
        timeoutMs: 5000,
        skipResearch: true,
      };

      const result = await generateSpec(options);

      expect(result.success).toBe(false);
      expect(result.error).toBe('String error');
    });
  });
});
