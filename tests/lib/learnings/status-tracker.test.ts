import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  recordTaskStatuses,
  detectFailedToPassedTasks,
  clearStatusHistory,
} from '../../../src/lib/learnings/status-tracker.js';
import type { TaskStatus } from '../../../src/lib/spec-parser-v2.js';

describe('learnings/status-tracker', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'ralphie-test-'));
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('recordTaskStatuses', () => {
    it('should record task statuses to file', () => {
      const tasks = [
        { id: 'T001', status: 'passed' as TaskStatus },
        { id: 'T002', status: 'in_progress' as TaskStatus },
        { id: 'T003', status: 'pending' as TaskStatus },
      ];

      recordTaskStatuses(testDir, tasks);

      const statusFile = join(testDir, '.ralphie', '.task-status.json');
      expect(existsSync(statusFile)).toBe(true);
    });

    it('should update existing task statuses', () => {
      const tasks1 = [
        { id: 'T001', status: 'in_progress' as TaskStatus },
        { id: 'T002', status: 'pending' as TaskStatus },
      ];

      recordTaskStatuses(testDir, tasks1);

      const tasks2 = [
        { id: 'T001', status: 'passed' as TaskStatus },
        { id: 'T002', status: 'in_progress' as TaskStatus },
      ];

      recordTaskStatuses(testDir, tasks2);

      // Verify T001 status was updated
      const result = detectFailedToPassedTasks(testDir, [
        { id: 'T001', status: 'passed' as TaskStatus },
        { id: 'T002', status: 'passed' as TaskStatus },
      ]);

      // T001 went from in_progress to passed (not failed->passed)
      expect(result).not.toContain('T001');
    });
  });

  describe('detectFailedToPassedTasks', () => {
    it('should detect tasks that transitioned from failed to passed', () => {
      // Record initial statuses
      const initialTasks = [
        { id: 'T001', status: 'failed' as TaskStatus },
        { id: 'T002', status: 'pending' as TaskStatus },
        { id: 'T003', status: 'passed' as TaskStatus },
      ];

      recordTaskStatuses(testDir, initialTasks);

      // Update statuses
      const currentTasks = [
        { id: 'T001', status: 'passed' as TaskStatus }, // failed → passed
        { id: 'T002', status: 'in_progress' as TaskStatus },
        { id: 'T003', status: 'passed' as TaskStatus },
      ];

      const result = detectFailedToPassedTasks(testDir, currentTasks);

      expect(result).toContain('T001');
      expect(result).not.toContain('T002');
      expect(result).not.toContain('T003');
    });

    it('should detect multiple failed→passed transitions', () => {
      const initialTasks = [
        { id: 'T001', status: 'failed' as TaskStatus },
        { id: 'T002', status: 'failed' as TaskStatus },
        { id: 'T003', status: 'pending' as TaskStatus },
      ];

      recordTaskStatuses(testDir, initialTasks);

      const currentTasks = [
        { id: 'T001', status: 'passed' as TaskStatus },
        { id: 'T002', status: 'passed' as TaskStatus },
        { id: 'T003', status: 'passed' as TaskStatus },
      ];

      const result = detectFailedToPassedTasks(testDir, currentTasks);

      expect(result).toContain('T001');
      expect(result).toContain('T002');
      expect(result).not.toContain('T003'); // Was never failed
    });

    it('should not detect pending→passed transitions', () => {
      const initialTasks = [
        { id: 'T001', status: 'pending' as TaskStatus },
      ];

      recordTaskStatuses(testDir, initialTasks);

      const currentTasks = [
        { id: 'T001', status: 'passed' as TaskStatus },
      ];

      const result = detectFailedToPassedTasks(testDir, currentTasks);

      expect(result).not.toContain('T001');
    });

    it('should not detect in_progress→passed transitions', () => {
      const initialTasks = [
        { id: 'T001', status: 'in_progress' as TaskStatus },
      ];

      recordTaskStatuses(testDir, initialTasks);

      const currentTasks = [
        { id: 'T001', status: 'passed' as TaskStatus },
      ];

      const result = detectFailedToPassedTasks(testDir, currentTasks);

      expect(result).not.toContain('T001');
    });

    it('should return empty array when no history exists', () => {
      const currentTasks = [
        { id: 'T001', status: 'passed' as TaskStatus },
      ];

      const result = detectFailedToPassedTasks(testDir, currentTasks);

      expect(result).toEqual([]);
    });

    it('should handle tasks not in history', () => {
      const initialTasks = [
        { id: 'T001', status: 'failed' as TaskStatus },
      ];

      recordTaskStatuses(testDir, initialTasks);

      const currentTasks = [
        { id: 'T001', status: 'passed' as TaskStatus },
        { id: 'T002', status: 'passed' as TaskStatus }, // New task
      ];

      const result = detectFailedToPassedTasks(testDir, currentTasks);

      expect(result).toContain('T001');
      expect(result).not.toContain('T002'); // No history for T002
    });
  });

  describe('clearStatusHistory', () => {
    it('should clear status history', () => {
      const tasks = [
        { id: 'T001', status: 'passed' as TaskStatus },
      ];

      recordTaskStatuses(testDir, tasks);

      clearStatusHistory(testDir);

      const result = detectFailedToPassedTasks(testDir, [
        { id: 'T001', status: 'passed' as TaskStatus },
      ]);

      expect(result).toEqual([]);
    });

    it('should handle missing status file', () => {
      // Should not throw
      expect(() => clearStatusHistory(testDir)).not.toThrow();
    });
  });

  describe('integration', () => {
    it('should track status across multiple iterations', () => {
      // Iteration 1: Tasks start
      const iter1 = [
        { id: 'T001', status: 'in_progress' as TaskStatus },
        { id: 'T002', status: 'pending' as TaskStatus },
      ];
      recordTaskStatuses(testDir, iter1);

      // Iteration 2: T001 fails
      const iter2 = [
        { id: 'T001', status: 'failed' as TaskStatus },
        { id: 'T002', status: 'pending' as TaskStatus },
      ];
      recordTaskStatuses(testDir, iter2);

      // Iteration 3: T001 gets fixed
      const iter3 = [
        { id: 'T001', status: 'passed' as TaskStatus },
        { id: 'T002', status: 'in_progress' as TaskStatus },
      ];

      const result = detectFailedToPassedTasks(testDir, iter3);

      expect(result).toContain('T001');
      expect(result.length).toBe(1);
    });
  });
});
