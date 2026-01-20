import { describe, it, expect } from 'vitest';
import {
  calculateBudget,
  getPointsForSize,
  formatBudgetSummary,
} from '../src/lib/budget-calculator.js';
import { parseSpecV2Content, type SpecV2, type TaskV2 } from '../src/lib/spec-parser-v2.js';

const SAMPLE_SPEC = `# Test Spec

Goal: Testing budget calculator.

## Tasks

### T001: Small task A
- Status: pending
- Size: S

**Deliverables:**
- Item

---

### T002: Medium task
- Status: pending
- Size: M

**Deliverables:**
- Item

---

### T003: Large task
- Status: pending
- Size: L

**Deliverables:**
- Item

---

### T004: Small task B
- Status: pending
- Size: S

**Deliverables:**
- Item
`;

const SPEC_WITH_DEPENDENCIES = `# Test Spec

Goal: Testing dependencies.

## Tasks

### T001: Base task
- Status: passed
- Size: S

**Deliverables:**
- Item

---

### T002: Depends on T001
- Status: pending
- Size: S

Depends on: T001

**Deliverables:**
- Item

---

### T003: Depends on T002
- Status: pending
- Size: S

Depends on: T002

**Deliverables:**
- Item

---

### T004: Independent
- Status: pending
- Size: S

**Deliverables:**
- Item
`;

describe('budget-calculator', () => {
  describe('calculateBudget', () => {
    it('selects tasks within default budget (4 points)', () => {
      const result = parseSpecV2Content(SAMPLE_SPEC);
      if (!result.isV2Format) throw new Error('Parse failed');

      const budget = calculateBudget(result);

      expect(budget.totalPoints).toBeLessThanOrEqual(4);
      expect(budget.selectedTasks.length).toBeGreaterThan(0);
    });

    it('respects custom budget', () => {
      const result = parseSpecV2Content(SAMPLE_SPEC);
      if (!result.isV2Format) throw new Error('Parse failed');

      const budget = calculateBudget(result, { budget: 8 });

      // S(1) + M(2) + L(4) + S(1) = 8
      expect(budget.totalPoints).toBeLessThanOrEqual(8);
    });

    it('selects multiple small tasks when possible', () => {
      const result = parseSpecV2Content(SAMPLE_SPEC);
      if (!result.isV2Format) throw new Error('Parse failed');

      const budget = calculateBudget(result, { budget: 4 });

      // Should get S(1) + M(2) + S(1) = 4, or S(1) + M(2) = 3, etc.
      const smallCount = budget.selectedTasks.filter((t) => t.size === 'S').length;
      expect(smallCount).toBeGreaterThanOrEqual(1);
    });

    it('skips tasks that exceed remaining budget', () => {
      const result = parseSpecV2Content(SAMPLE_SPEC);
      if (!result.isV2Format) throw new Error('Parse failed');

      const budget = calculateBudget(result, { budget: 2 });

      expect(budget.skippedTasks.length).toBeGreaterThan(0);
    });

    it('returns remaining budget', () => {
      const result = parseSpecV2Content(SAMPLE_SPEC);
      if (!result.isV2Format) throw new Error('Parse failed');

      const budget = calculateBudget(result, { budget: 10 });

      expect(budget.remainingBudget).toBe(10 - budget.totalPoints);
    });

    describe('conservative mode', () => {
      it('stops after M task in conservative mode', () => {
        const spec = `# Test

## Tasks

### T001: Small
- Status: pending
- Size: S

**Deliverables:**
- Item

---

### T002: Medium
- Status: pending
- Size: M

**Deliverables:**
- Item

---

### T003: Another small
- Status: pending
- Size: S

**Deliverables:**
- Item
`;
        const result = parseSpecV2Content(spec);
        if (!result.isV2Format) throw new Error('Parse failed');

        const budget = calculateBudget(result, { budget: 10, conservative: true });

        // Should stop after first M or L task
        const mediumIndex = budget.selectedTasks.findIndex((t) => t.size === 'M');
        const largeIndex = budget.selectedTasks.findIndex((t) => t.size === 'L');

        if (mediumIndex >= 0) {
          expect(budget.selectedTasks.length).toBe(mediumIndex + 1);
        }
      });

      it('stops after L task in conservative mode', () => {
        const spec = `# Test

## Tasks

### T001: Large
- Status: pending
- Size: L

**Deliverables:**
- Item

---

### T002: Small after
- Status: pending
- Size: S

**Deliverables:**
- Item
`;
        const result = parseSpecV2Content(spec);
        if (!result.isV2Format) throw new Error('Parse failed');

        const budget = calculateBudget(result, { budget: 10, conservative: true });

        expect(budget.selectedTasks).toHaveLength(1);
        expect(budget.selectedTasks[0].size).toBe('L');
      });

      it('allows multiple S tasks in conservative mode', () => {
        const spec = `# Test

## Tasks

### T001: Small A
- Status: pending
- Size: S

**Deliverables:**
- Item

---

### T002: Small B
- Status: pending
- Size: S

**Deliverables:**
- Item

---

### T003: Small C
- Status: pending
- Size: S

**Deliverables:**
- Item
`;
        const result = parseSpecV2Content(spec);
        if (!result.isV2Format) throw new Error('Parse failed');

        const budget = calculateBudget(result, { budget: 10, conservative: true });

        expect(budget.selectedTasks.length).toBe(3);
      });
    });

    describe('dependencies', () => {
      it('skips task with unfinished dependency', () => {
        const result = parseSpecV2Content(SPEC_WITH_DEPENDENCIES);
        if (!result.isV2Format) throw new Error('Parse failed');

        const budget = calculateBudget(result, { budget: 10 });

        // T003 depends on T002 which is pending
        const t003 = budget.selectedTasks.find((t) => t.id === 'T003');
        expect(t003).toBeUndefined();
      });

      it('selects task when dependency is already selected', () => {
        const result = parseSpecV2Content(SPEC_WITH_DEPENDENCIES);
        if (!result.isV2Format) throw new Error('Parse failed');

        const budget = calculateBudget(result, { budget: 10 });

        // T002 depends on T001 (passed) - should be selected
        const t002 = budget.selectedTasks.find((t) => t.id === 'T002');
        expect(t002).toBeDefined();
      });

      it('adds warning for blocked dependencies', () => {
        const result = parseSpecV2Content(SPEC_WITH_DEPENDENCIES);
        if (!result.isV2Format) throw new Error('Parse failed');

        const budget = calculateBudget(result, { budget: 10 });

        const blockWarning = budget.warnings.find((w) => w.includes('blocked'));
        expect(blockWarning).toBeDefined();
      });
    });

    describe('in_progress tasks', () => {
      it('prioritizes in_progress tasks', () => {
        const spec = `# Test

## Tasks

### T001: In progress
- Status: in_progress
- Size: M

**Deliverables:**
- Item

---

### T002: Pending
- Status: pending
- Size: S

**Deliverables:**
- Item
`;
        const result = parseSpecV2Content(spec);
        if (!result.isV2Format) throw new Error('Parse failed');

        const budget = calculateBudget(result, { budget: 4 });

        expect(budget.selectedTasks[0].id).toBe('T001');
      });
    });
  });

  describe('getPointsForSize', () => {
    it('returns 1 for S', () => {
      expect(getPointsForSize('S')).toBe(1);
    });

    it('returns 2 for M', () => {
      expect(getPointsForSize('M')).toBe(2);
    });

    it('returns 4 for L', () => {
      expect(getPointsForSize('L')).toBe(4);
    });

    it('returns 2 for unknown size', () => {
      expect(getPointsForSize('X')).toBe(2);
    });
  });

  describe('formatBudgetSummary', () => {
    it('formats selected tasks', () => {
      const result = parseSpecV2Content(SAMPLE_SPEC);
      if (!result.isV2Format) throw new Error('Parse failed');

      const budget = calculateBudget(result);
      const summary = formatBudgetSummary(budget);

      expect(summary).toContain('Selected');
      expect(summary).toContain('points');
    });

    it('shows message when no tasks selected', () => {
      const summary = formatBudgetSummary({
        selectedTasks: [],
        totalPoints: 0,
        remainingBudget: 4,
        skippedTasks: [],
        warnings: [],
      });

      expect(summary).toContain('No tasks selected');
    });

    it('includes warnings', () => {
      const summary = formatBudgetSummary({
        selectedTasks: [],
        totalPoints: 0,
        remainingBudget: 0,
        skippedTasks: [],
        warnings: ['Something went wrong'],
      });

      expect(summary).toContain('Something went wrong');
    });
  });
});
