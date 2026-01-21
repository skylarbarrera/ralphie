import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  loadAnalyzerPrompt,
  runAnalyzer,
  refineSpec,
  analyzeSpec,
  type AnalysisResult,
} from '../../src/lib/spec-analyzer.js';
import type { Harness, HarnessResult } from '../../src/lib/harness/types.js';

// Mock harness for testing
function createMockHarness(mockResult: Partial<HarnessResult>): Harness {
  return {
    name: 'mock-harness',
    run: vi.fn().mockResolvedValue({
      success: true,
      durationMs: 1000,
      output: '',
      ...mockResult,
    }),
  };
}

describe('loadAnalyzerPrompt', () => {
  it('should load the spec-flow-analyzer prompt', () => {
    const prompt = loadAnalyzerPrompt();
    expect(prompt).toContain('Spec Flow Analyzer');
    expect(prompt).toContain('Four-Phase Analysis Methodology');
  });

  it('should throw error if prompt file not found', () => {
    expect(() => loadAnalyzerPrompt('/nonexistent/path')).toThrow('Analyzer prompt not found');
  });

  it('should accept custom agents directory', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'test-agents-'));
    const agentsDir = join(tempDir, 'agents');
    mkdirSync(agentsDir, { recursive: true });
    writeFileSync(join(agentsDir, 'spec-flow-analyzer.md'), '# Test Analyzer');

    const prompt = loadAnalyzerPrompt(agentsDir);
    expect(prompt).toBe('# Test Analyzer');

    rmSync(tempDir, { recursive: true, force: true });
  });
});

describe('runAnalyzer', () => {
  let tempDir: string;
  let specPath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'test-analyzer-'));
    specPath = join(tempDir, 'test-spec.md');
    writeFileSync(specPath, '# Test Spec\n\n### T001: Task\n- Status: pending\n');
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should run analyzer with spec content', async () => {
    const mockOutput = `# Analysis
## Missing Elements
- ❓ What happens if X fails?`;

    const harness = createMockHarness({ output: mockOutput });
    const result = await runAnalyzer(harness, specPath, tempDir);

    expect(result.output).toBe(mockOutput);
    expect(result.hasGaps).toBe(true);
    expect(result.gapCount).toBe(1);
    expect(result.error).toBeUndefined();
    expect(harness.run).toHaveBeenCalledWith(
      expect.stringContaining('Spec Flow Analyzer'),
      expect.objectContaining({ cwd: tempDir, interactive: false }),
      expect.any(Function)
    );
  });

  it('should detect gaps with ❓ indicator', async () => {
    const mockOutput = 'Analysis\n- ❓ Gap 1\n- ❓ Gap 2\n- ❓ Gap 3';
    const harness = createMockHarness({ output: mockOutput });

    const result = await runAnalyzer(harness, specPath, tempDir);

    expect(result.hasGaps).toBe(true);
    expect(result.gapCount).toBe(3);
  });

  it('should detect gaps with "Missing Elements" section', async () => {
    const mockOutput = '# Analysis\n## Missing Elements\nSome gaps here';
    const harness = createMockHarness({ output: mockOutput });

    const result = await runAnalyzer(harness, specPath, tempDir);

    expect(result.hasGaps).toBe(true);
  });

  it('should detect gaps with "Critical Questions" section', async () => {
    const mockOutput = '# Analysis\n## Critical Questions\n### Q1: Something';
    const harness = createMockHarness({ output: mockOutput });

    const result = await runAnalyzer(harness, specPath, tempDir);

    expect(result.hasGaps).toBe(true);
  });

  it('should return no gaps when analysis is clean', async () => {
    const mockOutput = '# Analysis\n## Executive Summary\nNo gaps found. Ready to implement.';
    const harness = createMockHarness({ output: mockOutput });

    const result = await runAnalyzer(harness, specPath, tempDir);

    expect(result.hasGaps).toBe(false);
    expect(result.gapCount).toBe(0);
  });

  it('should handle spec file not found error', async () => {
    const harness = createMockHarness({ output: 'some output' });
    const nonexistentPath = join(tempDir, 'nonexistent.md');

    const result = await runAnalyzer(harness, nonexistentPath, tempDir);

    expect(result.error).toContain('Spec file not found');
    expect(result.output).toBe('');
    expect(result.hasGaps).toBe(false);
  });

  it('should handle harness errors gracefully', async () => {
    const harness = createMockHarness({});
    vi.mocked(harness.run).mockRejectedValue(new Error('Harness failure'));

    const result = await runAnalyzer(harness, specPath, tempDir);

    expect(result.error).toBe('Harness failure');
    expect(result.output).toBe('');
  });
});

describe('refineSpec', () => {
  let tempDir: string;
  let specPath: string;
  const originalSpec = `# Test Spec

## Tasks

### T001: Task
- Status: pending
- Size: M

**Deliverables:**
- Build feature

**Verify:** \`npm test\``;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'test-refine-'));
    specPath = join(tempDir, 'test-spec.md');
    writeFileSync(specPath, originalSpec);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should run refinement with analysis findings', async () => {
    const analysisOutput = '## Gaps\n- ❓ Missing error handling';
    const harness = createMockHarness({ output: 'Updated spec\nREFINEMENT_COMPLETE' });

    const result = await refineSpec(harness, specPath, analysisOutput, tempDir);

    expect(result).toBe(true);
    expect(harness.run).toHaveBeenCalledWith(
      expect.stringContaining('Spec Refinement Task'),
      expect.objectContaining({ cwd: tempDir, interactive: false }),
      expect.any(Function)
    );
    expect(harness.run).toHaveBeenCalledWith(
      expect.stringContaining(originalSpec),
      expect.any(Object),
      expect.any(Function)
    );
    expect(harness.run).toHaveBeenCalledWith(
      expect.stringContaining(analysisOutput),
      expect.any(Object),
      expect.any(Function)
    );
  });

  it('should return false if REFINEMENT_COMPLETE marker missing', async () => {
    const harness = createMockHarness({ output: 'Updated spec but no marker' });

    const result = await refineSpec(harness, specPath, 'gaps', tempDir);

    expect(result).toBe(false);
  });

  it('should return false if harness fails', async () => {
    const harness = createMockHarness({ success: false, output: '' });

    const result = await refineSpec(harness, specPath, 'gaps', tempDir);

    expect(result).toBe(false);
  });

  it('should handle errors gracefully', async () => {
    const harness = createMockHarness({});
    vi.mocked(harness.run).mockRejectedValue(new Error('Refinement error'));

    const result = await refineSpec(harness, specPath, 'gaps', tempDir);

    expect(result).toBe(false);
  });
});

describe('analyzeSpec', () => {
  let tempDir: string;
  let specPath: string;
  let ralphieDir: string;
  let consoleSpy: any;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'test-analyze-'));
    ralphieDir = join(tempDir, '.ralphie');
    mkdirSync(ralphieDir, { recursive: true });
    specPath = join(tempDir, 'test-spec.md');
    writeFileSync(specPath, '# Test Spec\n### T001: Task\n- Status: pending\n');
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    consoleSpy.mockRestore();
  });

  it('should skip analysis when skipAnalyze is true', async () => {
    const harness = createMockHarness({ output: 'should not run' });

    const result = await analyzeSpec(harness, specPath, tempDir, true, false);

    expect(result).toBeNull();
    expect(harness.run).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith('Skipping analysis phase (--skip-analyze flag)');
  });

  it('should run analysis and save output', async () => {
    const analysisOutput = '# Analysis\n- ❓ Gap 1';
    const harness = createMockHarness({ output: analysisOutput });

    const result = await analyzeSpec(harness, specPath, tempDir, false, false);

    expect(result).not.toBeNull();
    expect(result?.output).toBe(analysisOutput);
    expect(result?.hasGaps).toBe(true);
    expect(result?.gapCount).toBe(1);

    // Check output file was created
    const outputPath = join(tempDir, '.ralphie', 'analysis.md');
    expect(existsSync(outputPath)).toBe(true);
    expect(readFileSync(outputPath, 'utf-8')).toBe(analysisOutput);
  });

  it('should run refinement in autonomous mode when gaps found', async () => {
    const analysisOutput = '# Analysis\n- ❓ Gap 1';
    const harness = createMockHarness({ output: analysisOutput });

    // First call for analysis, second call for refinement
    vi.mocked(harness.run)
      .mockResolvedValueOnce({ success: true, durationMs: 1000, output: analysisOutput })
      .mockResolvedValueOnce({ success: true, durationMs: 1000, output: 'Refined\nREFINEMENT_COMPLETE' });

    const result = await analyzeSpec(harness, specPath, tempDir, false, true);

    expect(result?.hasGaps).toBe(true);
    expect(harness.run).toHaveBeenCalledTimes(2); // analysis + refinement
    expect(consoleSpy).toHaveBeenCalledWith('Running automatic refinement...');
    expect(consoleSpy).toHaveBeenCalledWith('Spec refined successfully');
  });

  it('should not run refinement in interactive mode', async () => {
    const analysisOutput = '# Analysis\n- ❓ Gap 1';
    const harness = createMockHarness({ output: analysisOutput });

    const result = await analyzeSpec(harness, specPath, tempDir, false, false);

    expect(result?.hasGaps).toBe(true);
    expect(harness.run).toHaveBeenCalledTimes(1); // analysis only
    expect(consoleSpy).toHaveBeenCalledWith('Review the analysis and address gaps manually (interactive mode)');
  });

  it('should handle analysis errors gracefully', async () => {
    const harness = createMockHarness({});
    vi.mocked(harness.run).mockRejectedValue(new Error('Analysis failed'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await analyzeSpec(harness, specPath, tempDir, false, false);

    expect(result?.error).toBe('Analysis failed');
    expect(errorSpy).toHaveBeenCalledWith('Spec analysis failed: Analysis failed');
    expect(warnSpy).toHaveBeenCalledWith('Continuing without analysis...\n');

    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('should report no gaps when analysis is clean', async () => {
    const analysisOutput = '# Analysis\nNo gaps found.';
    const harness = createMockHarness({ output: analysisOutput });

    const result = await analyzeSpec(harness, specPath, tempDir, false, false);

    expect(result?.hasGaps).toBe(false);
    expect(result?.gapCount).toBe(0);
    expect(consoleSpy).toHaveBeenCalledWith('No significant gaps found in the spec');
  });

  it('should create .ralphie directory if it does not exist', async () => {
    // Remove .ralphie directory
    rmSync(ralphieDir, { recursive: true, force: true });

    const analysisOutput = '# Analysis\nClean';
    const harness = createMockHarness({ output: analysisOutput });

    await analyzeSpec(harness, specPath, tempDir, false, false);

    const outputPath = join(tempDir, '.ralphie', 'analysis.md');
    expect(existsSync(outputPath)).toBe(true);
  });
});
