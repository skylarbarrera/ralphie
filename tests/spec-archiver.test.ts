import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { archiveSpec, generateArchiveFilename } from '../src/lib/spec-archiver.js';

describe('spec-archiver', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `spec-archiver-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    mkdirSync(join(testDir, 'specs', 'active'), { recursive: true });
    mkdirSync(join(testDir, 'specs', 'completed'), { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  const SAMPLE_SPEC = `# My Feature

Goal: Do something.

## Tasks

### T001: First task
- Status: passed
- Size: S

**Deliverables:**
- Item

---

### T002: Second task
- Status: pending
- Size: M

**Deliverables:**
- Item

---

### T003: Third task
- Status: in_progress
- Size: S

**Deliverables:**
- Item

## Notes

<!-- AI updates this section -->
`;

  describe('archiveSpec', () => {
    it('moves spec to completed directory', () => {
      const specPath = join(testDir, 'specs', 'active', 'my-feature.md');
      writeFileSync(specPath, SAMPLE_SPEC);

      const result = archiveSpec(specPath, testDir);

      expect(result.archivedPath).toContain('specs/completed');
      expect(existsSync(result.archivedPath)).toBe(true);
      expect(existsSync(specPath)).toBe(false);
    });

    it('updates pending tasks to passed', () => {
      const specPath = join(testDir, 'specs', 'active', 'my-feature.md');
      writeFileSync(specPath, SAMPLE_SPEC);

      const result = archiveSpec(specPath, testDir);
      const content = readFileSync(result.archivedPath, 'utf-8');

      expect(content).not.toContain('Status: pending');
      expect(content).not.toContain('Status: in_progress');
      expect(content.match(/Status: passed/g)?.length).toBe(3);
    });

    it('counts updated tasks', () => {
      const specPath = join(testDir, 'specs', 'active', 'my-feature.md');
      writeFileSync(specPath, SAMPLE_SPEC);

      const result = archiveSpec(specPath, testDir);

      expect(result.tasksUpdated).toBe(2); // pending + in_progress
    });

    it('adds completion timestamp', () => {
      const specPath = join(testDir, 'specs', 'active', 'my-feature.md');
      writeFileSync(specPath, SAMPLE_SPEC);

      const result = archiveSpec(specPath, testDir);
      const content = readFileSync(result.archivedPath, 'utf-8');

      expect(content).toContain('Archived:');
      expect(content).toMatch(/\d{4}-\d{2}-\d{2}T/);
    });

    it('throws if spec file not found', () => {
      const badPath = join(testDir, 'nonexistent.md');
      expect(() => archiveSpec(badPath, testDir)).toThrow('Spec file not found');
    });

    it('creates completed directory if needed', () => {
      rmSync(join(testDir, 'specs', 'completed'), { recursive: true });
      const specPath = join(testDir, 'specs', 'active', 'my-feature.md');
      writeFileSync(specPath, SAMPLE_SPEC);

      const result = archiveSpec(specPath, testDir);

      expect(existsSync(result.archivedPath)).toBe(true);
    });

    it('generates dated filename', () => {
      const specPath = join(testDir, 'specs', 'active', 'my-feature.md');
      writeFileSync(specPath, SAMPLE_SPEC);

      const result = archiveSpec(specPath, testDir);
      const today = new Date().toISOString().split('T')[0];

      expect(result.archivedPath).toContain(today);
      expect(result.archivedPath).toContain('my-feature');
    });
  });

  describe('generateArchiveFilename', () => {
    it('generates dated filename from spec path', () => {
      const filename = generateArchiveFilename('/some/path/cool-feature.md');
      const today = new Date().toISOString().split('T')[0];

      expect(filename).toBe(`${today}-cool-feature.md`);
    });

    it('cleans special characters from name', () => {
      const filename = generateArchiveFilename('/path/My Cool Feature!.md');
      expect(filename).toMatch(/^\d{4}-\d{2}-\d{2}-my-cool-feature-.md$/);
    });

    it('strips existing date prefix', () => {
      const filename = generateArchiveFilename('/path/2024-01-01-old-spec.md');
      const today = new Date().toISOString().split('T')[0];
      expect(filename).toBe(`${today}-old-spec.md`);
    });
  });

  describe('updateAllTaskStatuses', () => {
    it('handles spec with no pending tasks', () => {
      const allPassed = `# Spec

### T001: Task
- Status: passed
- Size: S
`;
      const specPath = join(testDir, 'specs', 'active', 'done.md');
      writeFileSync(specPath, allPassed);

      const result = archiveSpec(specPath, testDir);
      expect(result.tasksUpdated).toBe(0);
    });

    it('handles failed status', () => {
      const withFailed = `# Spec

### T001: Task
- Status: failed
- Size: S
`;
      const specPath = join(testDir, 'specs', 'active', 'failed.md');
      writeFileSync(specPath, withFailed);

      const result = archiveSpec(specPath, testDir);
      const content = readFileSync(result.archivedPath, 'utf-8');

      expect(content).toContain('Status: passed');
      expect(result.tasksUpdated).toBe(1);
    });
  });
});
