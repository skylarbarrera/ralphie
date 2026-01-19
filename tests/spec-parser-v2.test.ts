import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  parseSpecV2Content,
  parseSpecV2,
  getNextPendingTasks,
  getTaskById,
  getSpecProgress,
  normalizeSpec,
  isSpecV2Complete,
  isSpecCompleteV2,
  getProgressV2,
  getDoneTaskCount,
  SIZE_POINTS,
  type SpecV2,
  type TaskV2,
} from '../src/lib/spec-parser-v2.js';

const SAMPLE_V2_SPEC = `# SPEC System V2

Goal: Overhaul Ralphie's specification format to use task IDs.

## Context

Ralphie currently uses a flat SPEC.md with checkbox-based task tracking. This works but has limitations:
- No task identification for cross-references
- No machine-readable status

## Tasks

### T001: Create spec folder structure
- Status: passed
- Size: S

**Deliverables:**
- \`specs/active/\` directory for the one active spec
- \`specs/completed/\` directory for archived specs
- \`specs/templates/\` directory for spec templates

**Verify:** \`ls specs/\` shows \`active/ completed/ templates/ lessons.md\`

---

### T002: Implement new spec parser
- Status: in_progress
- Size: L

**Deliverables:**
- Parse task IDs (T001, T002, etc.) from markdown headers
- Parse Status field (pending | in_progress | passed | failed)
- Parse Size field (S=1 | M=2 | L=4 size points)

**Verify:** \`npm test -- spec-parser\` passes with 90%+ coverage

---

### T003: Implement spec locator
- Status: pending
- Size: S

**Deliverables:**
- \`locateActiveSpec()\` function returns path to spec in \`specs/active/\`
- Error if 0 specs in active directory

**Verify:** \`npm test -- spec-locator\` passes

---

### T004: Add CLI commands
- Status: pending
- Size: M

**Deliverables:**
- \`ralphie spec "description"\` creates spec
- \`ralphie status\` shows task progress

**Verify:** Each command shows correct output with \`--help\`

---

## Acceptance Criteria

- WHEN user runs \`ralphie init\`, THEN \`specs/\` folder structure is created
- WHEN user runs \`ralphie spec "description"\`, THEN a v2 format spec is created
- WHEN all tasks pass, THEN \`ralphie archive\` moves spec

## Notes

<!-- AI updates this section during implementation -->

### Research Sources
- Geoffrey Huntley's Ralph: Fresh context per iteration
`;

const LEGACY_SPEC = `# Old Project

## Tasks

- [ ] First task
- [ ] Second task
- [x] Completed task
`;

const MINIMAL_V2_SPEC = `# Minimal Spec

Goal: Test minimal parsing.

## Tasks

### T001: Simple task
- Status: pending
- Size: S

**Deliverables:**
- Just one deliverable

**Verify:** \`npm test\`
`;

describe('spec-parser-v2', () => {
  describe('parseSpecV2Content', () => {
    it('parses a valid v2 spec', () => {
      const result = parseSpecV2Content(SAMPLE_V2_SPEC);
      expect(result.isV2Format).toBe(true);
    });

    it('detects legacy format and returns warning', () => {
      const result = parseSpecV2Content(LEGACY_SPEC);
      expect(result.isV2Format).toBe(false);
      if (!result.isV2Format) {
        expect(result.warning).toContain('Legacy SPEC format');
      }
    });

    it('extracts title from H1', () => {
      const result = parseSpecV2Content(SAMPLE_V2_SPEC);
      expect(result.isV2Format).toBe(true);
      if (result.isV2Format) {
        expect(result.title).toBe('SPEC System V2');
      }
    });

    it('extracts goal from Goal: line', () => {
      const result = parseSpecV2Content(SAMPLE_V2_SPEC);
      if (result.isV2Format) {
        expect(result.goal).toContain('Overhaul Ralphie');
      }
    });

    it('extracts context section', () => {
      const result = parseSpecV2Content(SAMPLE_V2_SPEC);
      if (result.isV2Format) {
        expect(result.context).toContain('checkbox-based task tracking');
      }
    });

    it('parses all tasks', () => {
      const result = parseSpecV2Content(SAMPLE_V2_SPEC);
      if (result.isV2Format) {
        expect(result.tasks).toHaveLength(4);
      }
    });

    it('extracts acceptance criteria', () => {
      const result = parseSpecV2Content(SAMPLE_V2_SPEC);
      if (result.isV2Format) {
        expect(result.acceptanceCriteria).toHaveLength(3);
        expect(result.acceptanceCriteria[0]).toContain('ralphie init');
      }
    });

    it('extracts notes section', () => {
      const result = parseSpecV2Content(SAMPLE_V2_SPEC);
      if (result.isV2Format) {
        expect(result.notes).toContain('Research Sources');
      }
    });

    it('handles minimal v2 spec', () => {
      const result = parseSpecV2Content(MINIMAL_V2_SPEC);
      expect(result.isV2Format).toBe(true);
      if (result.isV2Format) {
        expect(result.tasks).toHaveLength(1);
        expect(result.title).toBe('Minimal Spec');
      }
    });

    it('defaults to "Untitled Spec" if no title', () => {
      const noTitle = `Goal: Something

## Tasks

### T001: Task
- Status: pending
- Size: S

**Deliverables:**
- Item
`;
      const result = parseSpecV2Content(noTitle);
      if (result.isV2Format) {
        expect(result.title).toBe('Untitled Spec');
      }
    });
  });

  describe('task parsing', () => {
    it('parses task IDs correctly', () => {
      const result = parseSpecV2Content(SAMPLE_V2_SPEC);
      if (result.isV2Format) {
        expect(result.tasks.map((t) => t.id)).toEqual(['T001', 'T002', 'T003', 'T004']);
      }
    });

    it('parses task titles', () => {
      const result = parseSpecV2Content(SAMPLE_V2_SPEC);
      if (result.isV2Format) {
        expect(result.tasks[0].title).toBe('Create spec folder structure');
        expect(result.tasks[1].title).toBe('Implement new spec parser');
      }
    });

    it('parses task status', () => {
      const result = parseSpecV2Content(SAMPLE_V2_SPEC);
      if (result.isV2Format) {
        expect(result.tasks[0].status).toBe('passed');
        expect(result.tasks[1].status).toBe('in_progress');
        expect(result.tasks[2].status).toBe('pending');
      }
    });

    it('parses task sizes', () => {
      const result = parseSpecV2Content(SAMPLE_V2_SPEC);
      if (result.isV2Format) {
        expect(result.tasks[0].size).toBe('S');
        expect(result.tasks[1].size).toBe('L');
        expect(result.tasks[2].size).toBe('S');
        expect(result.tasks[3].size).toBe('M');
      }
    });

    it('calculates size points correctly', () => {
      const result = parseSpecV2Content(SAMPLE_V2_SPEC);
      if (result.isV2Format) {
        expect(result.tasks[0].sizePoints).toBe(1); // S
        expect(result.tasks[1].sizePoints).toBe(4); // L
        expect(result.tasks[2].sizePoints).toBe(1); // S
        expect(result.tasks[3].sizePoints).toBe(2); // M
      }
    });

    it('parses deliverables', () => {
      const result = parseSpecV2Content(SAMPLE_V2_SPEC);
      if (result.isV2Format) {
        expect(result.tasks[0].deliverables).toHaveLength(3);
        expect(result.tasks[0].deliverables[0]).toContain('specs/active/');
      }
    });

    it('parses verify commands', () => {
      const result = parseSpecV2Content(SAMPLE_V2_SPEC);
      if (result.isV2Format) {
        expect(result.tasks[0].verify).toBe('ls specs/');
        expect(result.tasks[1].verify).toBe('npm test -- spec-parser');
      }
    });

    it('defaults to pending status if missing', () => {
      const noStatus = `# Spec

## Tasks

### T001: Task
- Size: S

**Deliverables:**
- Item
`;
      const result = parseSpecV2Content(noStatus);
      if (result.isV2Format) {
        expect(result.tasks[0].status).toBe('pending');
      }
    });

    it('defaults to M size if missing', () => {
      const noSize = `# Spec

## Tasks

### T001: Task
- Status: pending

**Deliverables:**
- Item
`;
      const result = parseSpecV2Content(noSize);
      if (result.isV2Format) {
        expect(result.tasks[0].size).toBe('M');
        expect(result.tasks[0].sizePoints).toBe(2);
      }
    });
  });

  describe('size point calculations', () => {
    it('SIZE_POINTS has correct values', () => {
      expect(SIZE_POINTS.S).toBe(1);
      expect(SIZE_POINTS.M).toBe(2);
      expect(SIZE_POINTS.L).toBe(4);
    });

    it('calculates total size points', () => {
      const result = parseSpecV2Content(SAMPLE_V2_SPEC);
      if (result.isV2Format) {
        // S(1) + L(4) + S(1) + M(2) = 8
        expect(result.totalSizePoints).toBe(8);
      }
    });

    it('calculates completed size points', () => {
      const result = parseSpecV2Content(SAMPLE_V2_SPEC);
      if (result.isV2Format) {
        // Only T001 (S=1) is passed
        expect(result.completedSizePoints).toBe(1);
      }
    });

    it('calculates pending size points', () => {
      const result = parseSpecV2Content(SAMPLE_V2_SPEC);
      if (result.isV2Format) {
        // T002 (L=4, in_progress) + T003 (S=1) + T004 (M=2) = 7
        expect(result.pendingSizePoints).toBe(7);
      }
    });
  });

  describe('getNextPendingTasks', () => {
    it('selects tasks within budget', () => {
      const result = parseSpecV2Content(SAMPLE_V2_SPEC);
      if (result.isV2Format) {
        const tasks = getNextPendingTasks(result, 4);
        // T002 (L=4) fills the budget, or we could get T002+nothing
        expect(tasks.length).toBeGreaterThan(0);
        const totalPoints = tasks.reduce((sum, t) => sum + t.sizePoints, 0);
        expect(totalPoints).toBeLessThanOrEqual(4);
      }
    });

    it('selects multiple small tasks if they fit', () => {
      const result = parseSpecV2Content(SAMPLE_V2_SPEC);
      if (result.isV2Format) {
        const tasks = getNextPendingTasks(result, 8);
        // Should be able to select T002(4) + T003(1) + T004(2) = 7 points
        expect(tasks.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('respects default budget of 4', () => {
      const result = parseSpecV2Content(SAMPLE_V2_SPEC);
      if (result.isV2Format) {
        const tasks = getNextPendingTasks(result);
        const totalPoints = tasks.reduce((sum, t) => sum + t.sizePoints, 0);
        expect(totalPoints).toBeLessThanOrEqual(4);
      }
    });

    it('returns empty array when no pending tasks', () => {
      const allPassed = `# Spec

## Tasks

### T001: Task
- Status: passed
- Size: S

**Deliverables:**
- Item
`;
      const result = parseSpecV2Content(allPassed);
      if (result.isV2Format) {
        const tasks = getNextPendingTasks(result, 4);
        expect(tasks).toHaveLength(0);
      }
    });
  });

  describe('getTaskById', () => {
    it('finds task by ID', () => {
      const result = parseSpecV2Content(SAMPLE_V2_SPEC);
      if (result.isV2Format) {
        const task = getTaskById(result, 'T002');
        expect(task).toBeDefined();
        expect(task?.title).toBe('Implement new spec parser');
      }
    });

    it('returns undefined for non-existent ID', () => {
      const result = parseSpecV2Content(SAMPLE_V2_SPEC);
      if (result.isV2Format) {
        const task = getTaskById(result, 'T999');
        expect(task).toBeUndefined();
      }
    });
  });

  describe('getSpecProgress', () => {
    it('calculates progress correctly', () => {
      const result = parseSpecV2Content(SAMPLE_V2_SPEC);
      if (result.isV2Format) {
        const progress = getSpecProgress(result);
        expect(progress.completed).toBe(1); // T001 passed
        expect(progress.total).toBe(4);
        expect(progress.percentage).toBe(25);
      }
    });

    it('returns 0% for no completed tasks', () => {
      const result = parseSpecV2Content(MINIMAL_V2_SPEC);
      if (result.isV2Format) {
        const progress = getSpecProgress(result);
        expect(progress.completed).toBe(0);
        expect(progress.percentage).toBe(0);
      }
    });

    it('returns 100% when all tasks passed', () => {
      const allPassed = `# Spec

## Tasks

### T001: Task
- Status: passed
- Size: S

**Deliverables:**
- Item

---

### T002: Task 2
- Status: passed
- Size: M

**Deliverables:**
- Item
`;
      const result = parseSpecV2Content(allPassed);
      if (result.isV2Format) {
        const progress = getSpecProgress(result);
        expect(progress.completed).toBe(2);
        expect(progress.total).toBe(2);
        expect(progress.percentage).toBe(100);
      }
    });
  });

  describe('edge cases', () => {
    it('handles verify without backticks', () => {
      const spec = `# Spec

## Tasks

### T001: Task
- Status: pending
- Size: S

**Deliverables:**
- Item

**Verify:** Run the tests
`;
      const result = parseSpecV2Content(spec);
      if (result.isV2Format) {
        expect(result.tasks[0].verify).toBe('Run the tests');
      }
    });

    it('handles missing verify section', () => {
      const spec = `# Spec

## Tasks

### T001: Task
- Status: pending
- Size: S

**Deliverables:**
- Item
`;
      const result = parseSpecV2Content(spec);
      if (result.isV2Format) {
        expect(result.tasks[0].verify).toBeNull();
      }
    });

    it('handles empty deliverables', () => {
      const spec = `# Spec

## Tasks

### T001: Task
- Status: pending
- Size: S

**Deliverables:**

**Verify:** test
`;
      const result = parseSpecV2Content(spec);
      if (result.isV2Format) {
        expect(result.tasks[0].deliverables).toHaveLength(0);
      }
    });
  });

  describe('normalizeSpec', () => {
    it('normalizes missing space after Status colon', () => {
      const input = '- Status:pending';
      const output = normalizeSpec(input);
      expect(output).toBe('- Status: pending');
    });

    it('normalizes missing space after dash in Status', () => {
      const input = '-Status: pending';
      const output = normalizeSpec(input);
      expect(output).toBe('- Status: pending');
    });

    it('normalizes asterisk to dash for Status', () => {
      const input = '* Status: pending';
      const output = normalizeSpec(input);
      expect(output).toBe('- Status: pending');
    });

    it('normalizes Size field similarly', () => {
      const input = '-Size:M';
      const output = normalizeSpec(input);
      expect(output).toBe('- Size: M');
    });

    it('normalizes task ID with missing space after colon', () => {
      const input = '### T001:My Task Title';
      const output = normalizeSpec(input);
      expect(output).toBe('### T001: My Task Title');
    });

    it('normalizes Deliverables header spacing', () => {
      const input = '** Deliverables : **';
      const output = normalizeSpec(input);
      expect(output).toBe('**Deliverables:**');
    });

    it('normalizes Verify header spacing', () => {
      const input = '**  Verify:  **';
      const output = normalizeSpec(input);
      expect(output).toBe('**Verify:**');
    });

    it('handles already normalized content', () => {
      const input = '- Status: pending\n- Size: M';
      const output = normalizeSpec(input);
      expect(output).toBe('- Status: pending\n- Size: M');
    });
  });

  describe('parsing with normalization', () => {
    it('parses spec with format variations', () => {
      const spec = `# Spec With Variations

Goal: Test normalization.

## Tasks

### T001:Task without space
-Status:pending
-Size:S

**Deliverables:**
- Item

**Verify:** \`npm test\`
`;
      const result = parseSpecV2Content(spec);
      expect(result.isV2Format).toBe(true);
      if (result.isV2Format) {
        expect(result.tasks[0].id).toBe('T001');
        expect(result.tasks[0].title).toBe('Task without space');
        expect(result.tasks[0].status).toBe('pending');
        expect(result.tasks[0].size).toBe('S');
      }
    });
  });

  describe('isSpecV2Complete', () => {
    it('returns true when all tasks passed', () => {
      const spec = `# Spec

## Tasks

### T001: Task 1
- Status: passed
- Size: S

**Deliverables:**
- Item

---

### T002: Task 2
- Status: passed
- Size: M

**Deliverables:**
- Item
`;
      const result = parseSpecV2Content(spec);
      if (result.isV2Format) {
        expect(isSpecV2Complete(result)).toBe(true);
      }
    });

    it('returns true when all tasks are passed or failed', () => {
      const spec = `# Spec

## Tasks

### T001: Task 1
- Status: passed
- Size: S

**Deliverables:**
- Item

---

### T002: Task 2
- Status: failed
- Size: M

**Deliverables:**
- Item
`;
      const result = parseSpecV2Content(spec);
      if (result.isV2Format) {
        expect(isSpecV2Complete(result)).toBe(true);
      }
    });

    it('returns false when some tasks are pending', () => {
      const spec = `# Spec

## Tasks

### T001: Task 1
- Status: passed
- Size: S

**Deliverables:**
- Item

---

### T002: Task 2
- Status: pending
- Size: M

**Deliverables:**
- Item
`;
      const result = parseSpecV2Content(spec);
      if (result.isV2Format) {
        expect(isSpecV2Complete(result)).toBe(false);
      }
    });

    it('returns false when some tasks are in_progress', () => {
      const spec = `# Spec

## Tasks

### T001: Task 1
- Status: passed
- Size: S

**Deliverables:**
- Item

---

### T002: Task 2
- Status: in_progress
- Size: M

**Deliverables:**
- Item
`;
      const result = parseSpecV2Content(spec);
      if (result.isV2Format) {
        expect(isSpecV2Complete(result)).toBe(false);
      }
    });

    it('returns true for empty task list', () => {
      const spec = `# Spec

## Tasks

## Acceptance Criteria
- None
`;
      const result = parseSpecV2Content(spec);
      if (result.isV2Format) {
        expect(isSpecV2Complete(result)).toBe(true);
      }
    });
  });

  describe('getDoneTaskCount', () => {
    it('counts passed and failed tasks', () => {
      const spec = `# Spec

## Tasks

### T001: Task 1
- Status: passed
- Size: S

**Deliverables:**
- Item

---

### T002: Task 2
- Status: failed
- Size: M

**Deliverables:**
- Item

---

### T003: Task 3
- Status: pending
- Size: S

**Deliverables:**
- Item
`;
      const result = parseSpecV2Content(spec);
      if (result.isV2Format) {
        expect(getDoneTaskCount(result)).toBe(2);
      }
    });
  });

  describe('path-based functions', () => {
    const testDir = join(tmpdir(), 'spec-parser-v2-test-' + Date.now());
    const specPath = join(testDir, 'test-spec.md');

    beforeEach(() => {
      mkdirSync(testDir, { recursive: true });
    });

    afterEach(() => {
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true });
      }
    });

    describe('isSpecCompleteV2', () => {
      it('returns true when all tasks passed', () => {
        const spec = `# Spec

## Tasks

### T001: Task 1
- Status: passed
- Size: S

**Deliverables:**
- Item
`;
        writeFileSync(specPath, spec);
        expect(isSpecCompleteV2(specPath)).toBe(true);
      });

      it('returns true when all tasks passed or failed', () => {
        const spec = `# Spec

## Tasks

### T001: Task 1
- Status: passed
- Size: S

**Deliverables:**
- Item

---

### T002: Task 2
- Status: failed
- Size: M

**Deliverables:**
- Item
`;
        writeFileSync(specPath, spec);
        expect(isSpecCompleteV2(specPath)).toBe(true);
      });

      it('returns false when some tasks pending', () => {
        const spec = `# Spec

## Tasks

### T001: Task 1
- Status: passed
- Size: S

**Deliverables:**
- Item

---

### T002: Task 2
- Status: pending
- Size: M

**Deliverables:**
- Item
`;
        writeFileSync(specPath, spec);
        expect(isSpecCompleteV2(specPath)).toBe(false);
      });

      it('returns false for non-existent file', () => {
        expect(isSpecCompleteV2('/nonexistent/path.md')).toBe(false);
      });

      it('returns false for legacy format spec', () => {
        const legacySpec = `# Old Project

## Tasks

- [ ] First task
- [ ] Second task
- [x] Completed task
`;
        writeFileSync(specPath, legacySpec);
        expect(isSpecCompleteV2(specPath)).toBe(false);
      });
    });

    describe('getProgressV2', () => {
      it('returns progress for valid v2 spec', () => {
        const spec = `# Spec

## Tasks

### T001: Task 1
- Status: passed
- Size: S

**Deliverables:**
- Item

---

### T002: Task 2
- Status: pending
- Size: M

**Deliverables:**
- Item
`;
        writeFileSync(specPath, spec);
        const progress = getProgressV2(specPath);
        expect(progress).not.toBeNull();
        expect(progress?.completed).toBe(1);
        expect(progress?.total).toBe(2);
        expect(progress?.percentage).toBe(50);
      });

      it('returns null for non-existent file', () => {
        expect(getProgressV2('/nonexistent/path.md')).toBeNull();
      });

      it('returns null for legacy format spec', () => {
        const legacySpec = `# Old Project

## Tasks

- [ ] First task
- [x] Completed task
`;
        writeFileSync(specPath, legacySpec);
        expect(getProgressV2(specPath)).toBeNull();
      });

      it('returns 100% for completed spec', () => {
        const spec = `# Spec

## Tasks

### T001: Task 1
- Status: passed
- Size: S

**Deliverables:**
- Item

---

### T002: Task 2
- Status: passed
- Size: M

**Deliverables:**
- Item
`;
        writeFileSync(specPath, spec);
        const progress = getProgressV2(specPath);
        expect(progress?.percentage).toBe(100);
      });
    });
  });
});
