/**
 * Task status tracker for detecting failed→passed transitions
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import type { TaskStatus } from '../spec-parser-v2.js';

export interface TaskStatusEntry {
  taskId: string;
  status: TaskStatus;
  timestamp: string;
}

/**
 * Get path to task status tracking file
 */
function getStatusTrackingPath(cwd: string): string {
  return join(cwd, '.ralphie', '.task-status.json');
}

/**
 * Load task status history
 */
function loadStatusHistory(cwd: string): Map<string, TaskStatusEntry> {
  const path = getStatusTrackingPath(cwd);

  if (!existsSync(path)) {
    return new Map();
  }

  try {
    const content = readFileSync(path, 'utf-8');
    const entries: TaskStatusEntry[] = JSON.parse(content);
    return new Map(entries.map((e) => [e.taskId, e]));
  } catch {
    return new Map();
  }
}

/**
 * Save task status history
 */
function saveStatusHistory(cwd: string, history: Map<string, TaskStatusEntry>): void {
  const path = getStatusTrackingPath(cwd);

  // Ensure directory exists
  mkdirSync(dirname(path), { recursive: true });

  const entries = Array.from(history.values());
  writeFileSync(path, JSON.stringify(entries, null, 2), 'utf-8');
}

/**
 * Record current task statuses
 */
export function recordTaskStatuses(
  cwd: string,
  tasks: Array<{ id: string; status: TaskStatus }>
): void {
  const history = loadStatusHistory(cwd);

  for (const task of tasks) {
    history.set(task.id, {
      taskId: task.id,
      status: task.status,
      timestamp: new Date().toISOString(),
    });
  }

  saveStatusHistory(cwd, history);
}

/**
 * Detect tasks that transitioned from failed to passed
 *
 * @returns Array of task IDs that failed→passed since last check
 */
export function detectFailedToPassedTasks(
  cwd: string,
  currentTasks: Array<{ id: string; status: TaskStatus }>
): string[] {
  const history = loadStatusHistory(cwd);
  const failedToPassedTasks: string[] = [];

  for (const task of currentTasks) {
    const previous = history.get(task.id);

    // Check if task was failed before and is now passed
    if (previous && previous.status === 'failed' && task.status === 'passed') {
      failedToPassedTasks.push(task.id);
    }
  }

  return failedToPassedTasks;
}

/**
 * Check if we need to capture learnings for any tasks
 *
 * This should be called BEFORE starting an iteration to inject learning capture instructions
 */
export function shouldCaptureLearnings(cwd: string): {
  shouldCapture: boolean;
  taskIds: string[];
} {
  const history = loadStatusHistory(cwd);

  // Look for tasks that are marked for learning capture
  // This is a placeholder - we'll need to track this separately
  // For now, we'll just return false
  return {
    shouldCapture: false,
    taskIds: [],
  };
}

/**
 * Clear task status history (useful for testing)
 */
export function clearStatusHistory(cwd: string): void {
  const path = getStatusTrackingPath(cwd);

  if (existsSync(path)) {
    writeFileSync(path, JSON.stringify([], null, 2), 'utf-8');
  }
}
