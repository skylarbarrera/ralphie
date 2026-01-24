import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  detectLanguages,
  selectReviewers,
  loadReviewPrompt,
  parseSeverity,
  parseFindings,
  runReviewer,
  REVIEW_AGENTS,
} from '../../src/lib/review.js';
import type { Harness } from '../../src/lib/harness/types.js';

describe('review', () => {
  describe('detectLanguages', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'ralphie-test-'));
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('detects TypeScript projects', () => {
      writeFileSync(join(tempDir, 'tsconfig.json'), '{}');
      const languages = detectLanguages(tempDir);
      expect(languages).toContain('typescript');
      expect(languages).toContain('ts');
      expect(languages).toContain('tsx');
    });

    it('detects TypeScript via package.json', () => {
      writeFileSync(join(tempDir, 'package.json'), '{}');
      const languages = detectLanguages(tempDir);
      expect(languages).toContain('typescript');
    });

    it('detects Python projects via pyproject.toml', () => {
      writeFileSync(join(tempDir, 'pyproject.toml'), '');
      const languages = detectLanguages(tempDir);
      expect(languages).toContain('python');
      expect(languages).toContain('py');
    });

    it('detects Python projects via requirements.txt', () => {
      writeFileSync(join(tempDir, 'requirements.txt'), '');
      const languages = detectLanguages(tempDir);
      expect(languages).toContain('python');
    });

    it('detects Python projects via setup.py', () => {
      writeFileSync(join(tempDir, 'setup.py'), '');
      const languages = detectLanguages(tempDir);
      expect(languages).toContain('python');
    });

    it('detects both TypeScript and Python', () => {
      writeFileSync(join(tempDir, 'tsconfig.json'), '{}');
      writeFileSync(join(tempDir, 'requirements.txt'), '');
      const languages = detectLanguages(tempDir);
      expect(languages).toContain('typescript');
      expect(languages).toContain('python');
    });

    it('returns empty array for unrecognized projects', () => {
      const languages = detectLanguages(tempDir);
      expect(languages).toEqual([]);
    });
  });

  describe('selectReviewers', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'ralphie-test-'));
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('selects general + TypeScript reviewers for TypeScript projects', () => {
      writeFileSync(join(tempDir, 'tsconfig.json'), '{}');
      const reviewers = selectReviewers(tempDir);

      const reviewerNames = reviewers.map((r) => r.name);
      expect(reviewerNames).toContain('security-sentinel');
      expect(reviewerNames).toContain('performance-oracle');
      expect(reviewerNames).toContain('architecture-strategist');
      expect(reviewerNames).toContain('typescript-reviewer');
      expect(reviewerNames).not.toContain('python-reviewer');
    });

    it('selects general + Python reviewers for Python projects', () => {
      writeFileSync(join(tempDir, 'requirements.txt'), '');
      const reviewers = selectReviewers(tempDir);

      const reviewerNames = reviewers.map((r) => r.name);
      expect(reviewerNames).toContain('security-sentinel');
      expect(reviewerNames).toContain('python-reviewer');
      expect(reviewerNames).not.toContain('typescript-reviewer');
    });

    it('selects all reviewers when no language detected', () => {
      const reviewers = selectReviewers(tempDir);
      expect(reviewers.length).toBe(REVIEW_AGENTS.length);
    });

    it('selects both language reviewers for polyglot projects', () => {
      writeFileSync(join(tempDir, 'tsconfig.json'), '{}');
      writeFileSync(join(tempDir, 'requirements.txt'), '');
      const reviewers = selectReviewers(tempDir);

      const reviewerNames = reviewers.map((r) => r.name);
      expect(reviewerNames).toContain('typescript-reviewer');
      expect(reviewerNames).toContain('python-reviewer');
    });
  });

  describe('loadReviewPrompt', () => {
    it('loads a review agent prompt from agents directory', () => {
      // Use actual agents directory
      const prompt = loadReviewPrompt('security-sentinel.md');
      expect(prompt).toContain('Security Sentinel');
      expect(prompt.length).toBeGreaterThan(100);
    });

    it('throws error for non-existent agent', () => {
      expect(() => loadReviewPrompt('non-existent-agent.md')).toThrow(
        'Review agent prompt not found'
      );
    });

    it('loads from custom agents directory', () => {
      const tempDir = mkdtempSync(join(tmpdir(), 'ralphie-test-'));
      const customPrompt = '# Custom Agent\nTest prompt';
      writeFileSync(join(tempDir, 'test-agent.md'), customPrompt);

      const prompt = loadReviewPrompt('test-agent.md', tempDir);
      expect(prompt).toBe(customPrompt);

      rmSync(tempDir, { recursive: true, force: true });
    });
  });

  describe('parseSeverity', () => {
    it('parses Critical severity', () => {
      expect(parseSeverity('Severity: Critical')).toBe('Critical');
      expect(parseSeverity('🔴 CRITICAL ISSUE')).toBe('Critical');
      expect(parseSeverity('critical security flaw')).toBe('Critical');
    });

    it('parses High severity', () => {
      expect(parseSeverity('Severity: High')).toBe('High');
      expect(parseSeverity('🟠 High priority')).toBe('High');
      expect(parseSeverity('high risk vulnerability')).toBe('High');
    });

    it('parses Medium severity', () => {
      expect(parseSeverity('Severity: Medium')).toBe('Medium');
      expect(parseSeverity('🟡 Medium concern')).toBe('Medium');
      expect(parseSeverity('medium priority issue')).toBe('Medium');
    });

    it('defaults to Low severity', () => {
      expect(parseSeverity('Severity: Low')).toBe('Low');
      expect(parseSeverity('minor issue')).toBe('Low');
      expect(parseSeverity('no severity specified')).toBe('Low');
    });
  });

  describe('parseFindings', () => {
    it('parses findings with severity, risk, and fix', () => {
      const output = `
### Input Validation Issues
- **[src/api.ts:42]**: Missing validation on user input
  - Severity: High
  - Risk: SQL injection vulnerability
  - Fix: Add input sanitization

- **[src/auth.ts:15]**: Weak password requirements
  - Severity: Medium
  - Risk: Brute force attacks possible
  - Fix: Enforce minimum 12 characters
`;

      const findings = parseFindings(output);
      expect(findings.length).toBe(2);

      expect(findings[0].location).toBe('src/api.ts:42');
      expect(findings[0].description).toBe('Missing validation on user input');
      expect(findings[0].severity).toBe('High');
      expect(findings[0].risk).toBe('SQL injection vulnerability');
      expect(findings[0].fix).toBe('Add input sanitization');

      expect(findings[1].location).toBe('src/auth.ts:15');
      expect(findings[1].severity).toBe('Medium');
    });

    it('handles findings without risk or fix', () => {
      const output = `
### Issues
- **[file.ts:10]**: Some issue
  - Severity: Critical
`;

      const findings = parseFindings(output);
      expect(findings.length).toBe(1);
      expect(findings[0].location).toBe('file.ts:10');
      expect(findings[0].severity).toBe('Critical');
      expect(findings[0].risk).toBeUndefined();
      expect(findings[0].fix).toBeUndefined();
    });

    it('returns empty array for output with no findings', () => {
      const output = 'No issues found in the codebase.';
      const findings = parseFindings(output);
      expect(findings.length).toBe(0);
    });

    it('handles alternate bullet point syntax', () => {
      const output = `
### Issues
* **[file.ts:5]**: Issue with asterisk bullet
  * Severity: Low
`;

      const findings = parseFindings(output);
      expect(findings.length).toBe(1);
      expect(findings[0].location).toBe('file.ts:5');
    });
  });

  describe('runReviewer', () => {
    let tempDir: string;
    let agentsDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'ralphie-test-'));
      agentsDir = mkdtempSync(join(tmpdir(), 'ralphie-agents-'));

      // Create a simple test agent
      writeFileSync(
        join(agentsDir, 'test-agent.md'),
        '# Test Agent\nReview the code for issues.'
      );
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
      rmSync(agentsDir, { recursive: true, force: true });
    });

    it('runs a reviewer and returns results', async () => {
      const mockHarness: Harness = {
        name: 'test',
        run: vi.fn().mockResolvedValue({
          success: true,
          output: `
### Security Issues
- **[src/app.ts:10]**: SQL injection risk
  - Severity: Critical
  - Risk: Attacker can access database
  - Fix: Use parameterized queries
`,
          durationMs: 1000,
          usage: {
            inputTokens: 1000,
            outputTokens: 500,
          },
          costUsd: 0.05,
        }),
      };

      const agent = {
        name: 'test-agent',
        fileName: 'test-agent.md',
        description: 'Test reviewer',
      };

      const result = await runReviewer(mockHarness, agent, tempDir, 'sonnet', agentsDir);

      expect(result.agent).toBe('test-agent');
      expect(result.findings.length).toBe(1);
      expect(result.findings[0].severity).toBe('Critical');
      expect(result.costUsd).toBe(0.05);
      expect(result.usage?.inputTokens).toBe(1000);
      expect(result.error).toBeUndefined();
    });

    it('handles reviewer errors gracefully', async () => {
      const mockHarness: Harness = {
        name: 'test',
        run: vi.fn().mockRejectedValue(new Error('Agent failed')),
      };

      const agent = {
        name: 'test-agent',
        fileName: 'test-agent.md',
        description: 'Test reviewer',
      };

      const result = await runReviewer(mockHarness, agent, tempDir, 'sonnet', agentsDir);

      expect(result.agent).toBe('test-agent');
      expect(result.findings.length).toBe(0);
      expect(result.error).toBe('Agent failed');
    });

    it('calculates cost if not provided by harness', async () => {
      const mockHarness: Harness = {
        name: 'test',
        run: vi.fn().mockResolvedValue({
          success: true,
          output: 'No issues found',
          durationMs: 1000,
          usage: {
            inputTokens: 10_000,
            outputTokens: 5_000,
          },
          // No costUsd provided
        }),
      };

      const agent = {
        name: 'test-agent',
        fileName: 'test-agent.md',
        description: 'Test reviewer',
      };

      const result = await runReviewer(mockHarness, agent, tempDir, 'claude-sonnet', agentsDir);

      // Should calculate cost: (10k / 1M) * 3 + (5k / 1M) * 15 = 0.03 + 0.075 = 0.105
      expect(result.costUsd).toBeCloseTo(0.105, 4);
    });
  });
});
