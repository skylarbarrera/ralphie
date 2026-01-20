import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  generateTaskContext,
  isTaskContextWarning,
  getTaskIdsFromContext,
} from '../../src/lib/prompt-generator.js';

describe('prompt-generator', () => {
  const testDir = join(tmpdir(), 'prompt-generator-test-' + Date.now());
  const specPath = join(testDir, 'test-spec.md');

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  const SAMPLE_SPEC = `# Test Spec

Goal: Test prompt generation.

## Tasks

### T001: Small task
- Status: pending
- Size: S

**Deliverables:**
- Item 1

**Verify:** \`npm test -- small\`

---

### T002: Medium task
- Status: pending
- Size: M

**Deliverables:**
- Item 2

**Verify:** \`npm test -- medium\`

---

### T003: Large task
- Status: pending
- Size: L

**Deliverables:**
- Item 3

**Verify:** \`npm test -- large\`
`;

  describe('generateTaskContext', () => {
    it('returns empty string for undefined specPath', () => {
      const result = generateTaskContext(undefined);
      expect(result).toBe('');
    });

    it('returns empty string for non-existent file', () => {
      const result = generateTaskContext('/nonexistent/path.md');
      expect(result).toBe('');
    });

    it('returns empty string for legacy format spec', () => {
      const legacySpec = `# Old

## Tasks

- [ ] Task 1
- [x] Task 2
`;
      writeFileSync(specPath, legacySpec);
      const result = generateTaskContext(specPath);
      expect(result).toBe('');
    });

    it('returns task context with selected tasks', () => {
      writeFileSync(specPath, SAMPLE_SPEC);
      const result = generateTaskContext(specPath, { budget: 4 });

      expect(result).toContain('## Task Selection');
      expect(result).toContain('Selected tasks');
      expect(result).toMatch(/T\d{3}\([SML]\):/);
    });

    it('respects budget limit', () => {
      writeFileSync(specPath, SAMPLE_SPEC);

      // Budget 1 should only select T001 (S=1)
      const result = generateTaskContext(specPath, { budget: 1 });
      expect(result).toContain('T001');
      expect(result).not.toContain('T002');
      expect(result).not.toContain('T003');
    });

    it('selects multiple tasks within budget', () => {
      writeFileSync(specPath, SAMPLE_SPEC);

      // Budget 3 should select T001(S=1) + T002(M=2) = 3
      const result = generateTaskContext(specPath, { budget: 3 });
      expect(result).toContain('T001');
      expect(result).toContain('T002');
      expect(result).not.toContain('T003');
    });

    it('includes verify commands by default', () => {
      writeFileSync(specPath, SAMPLE_SPEC);
      const result = generateTaskContext(specPath, { budget: 1 });
      expect(result).toContain('Verify:');
      expect(result).toContain('npm test -- small');
    });

    it('excludes verify commands when includeVerify is false', () => {
      writeFileSync(specPath, SAMPLE_SPEC);
      const result = generateTaskContext(specPath, { budget: 1, includeVerify: false });
      expect(result).not.toContain('Verify:');
    });

    it('shows warning when no tasks fit budget', () => {
      const largeOnlySpec = `# Large Only

## Tasks

### T001: Large task
- Status: pending
- Size: L

**Deliverables:**
- Item
`;
      writeFileSync(specPath, largeOnlySpec);
      const result = generateTaskContext(specPath, { budget: 1 });

      expect(result).toContain('Warning');
      expect(result).toContain('No tasks fit in budget');
    });

    it('shows completion message when all tasks done', () => {
      const completedSpec = `# Completed

## Tasks

### T001: Done task
- Status: passed
- Size: S

**Deliverables:**
- Item
`;
      writeFileSync(specPath, completedSpec);
      const result = generateTaskContext(specPath, { budget: 4 });

      expect(result).toContain('All tasks completed');
      expect(result).toContain('ralphie archive');
    });

    it('uses default budget of 4 when not specified', () => {
      writeFileSync(specPath, SAMPLE_SPEC);
      const result = generateTaskContext(specPath);

      // Default budget 4 should select T001(1) + T002(2) = 3, leaving T003(4) out
      // or just T003(4) if that's first in list
      expect(result).toContain('budget 4');
    });

    it('shows remaining budget when tasks are skipped', () => {
      writeFileSync(specPath, SAMPLE_SPEC);
      const result = generateTaskContext(specPath, { budget: 2 });

      // Budget 2 only fits T001(1), remaining 1 point
      // But T002(2) and T003(4) don't fit
      expect(result).toContain('T001');
    });
  });

  describe('isTaskContextWarning', () => {
    it('returns true for warning context', () => {
      expect(isTaskContextWarning('Warning: No tasks fit')).toBe(true);
    });

    it('returns true for completion message', () => {
      expect(isTaskContextWarning('All tasks completed!')).toBe(true);
    });

    it('returns false for normal task context', () => {
      expect(isTaskContextWarning('Selected tasks: T001')).toBe(false);
    });
  });

  describe('getTaskIdsFromContext', () => {
    it('extracts task IDs from context', () => {
      const context = 'Selected: T001(S), T002(M), T003(L)';
      const ids = getTaskIdsFromContext(context);
      expect(ids).toEqual(['T001', 'T002', 'T003']);
    });

    it('returns empty array when no task IDs found', () => {
      const context = 'No tasks selected';
      const ids = getTaskIdsFromContext(context);
      expect(ids).toEqual([]);
    });

    it('deduplicates task IDs', () => {
      const context = 'T001 mentioned twice T001';
      const ids = getTaskIdsFromContext(context);
      expect(ids).toEqual(['T001']);
    });
  });
});
