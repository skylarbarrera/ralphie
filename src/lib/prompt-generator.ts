import { parseSpecV2, type TaskV2 } from './spec-parser-v2.js';
import { calculateBudget } from './budget-calculator.js';

const DEFAULT_BUDGET = 4;

/**
 * Format a single task for prompt context.
 * Format: "T001(S): Task title"
 */
function formatTask(task: TaskV2): string {
  return `${task.id}(${task.size}): ${task.title}`;
}

/**
 * Format verify command for a task.
 */
function formatVerify(task: TaskV2): string {
  if (!task.verify) return '';
  return `  Verify: \`${task.verify}\``;
}

export interface TaskContextOptions {
  budget?: number;
  includeVerify?: boolean;
}

/**
 * Generate task context for prompt injection.
 *
 * Returns formatted string with selected tasks based on budget.
 * Returns empty string if spec parsing fails or specPath is undefined.
 *
 * @param specPath - Path to the V2 spec file
 * @param options - Budget and formatting options
 * @returns Formatted task context string
 */
export function generateTaskContext(
  specPath: string | undefined,
  options: TaskContextOptions = {}
): string {
  if (!specPath) {
    return '';
  }

  const budget = options.budget ?? DEFAULT_BUDGET;
  const includeVerify = options.includeVerify ?? true;

  try {
    const spec = parseSpecV2(specPath);
    const budgetResult = calculateBudget(spec, { budget });

    if (budgetResult.selectedTasks.length === 0) {
      if (spec.tasks.every((t) => t.status === 'passed' || t.status === 'failed')) {
        return '## Task Selection\n\nAll tasks completed! Run `ralphie archive` to archive this spec.';
      }
      return `## Task Selection\n\nWarning: No tasks fit in budget ${budget}. Smallest pending task requires ${
        spec.tasks
          .filter((t) => t.status === 'pending' || t.status === 'in_progress')
          .sort((a, b) => a.sizePoints - b.sizePoints)[0]?.sizePoints ?? 'unknown'
      } points.`;
    }

    const lines: string[] = [
      '## Task Selection',
      '',
      `Selected tasks (${budgetResult.totalPoints} points, budget ${budget}):`,
    ];

    for (const task of budgetResult.selectedTasks) {
      lines.push(`- ${formatTask(task)}`);
      if (includeVerify && task.verify) {
        lines.push(formatVerify(task));
      }
    }

    if (budgetResult.remainingBudget > 0 && budgetResult.skippedTasks.length > 0) {
      lines.push('');
      lines.push(`Remaining budget: ${budgetResult.remainingBudget} points`);
    }

    return lines.join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[prompt-generator] Failed to parse spec: ${message}`);
    return '';
  }
}

/**
 * Check if task context is a warning (no tasks selected).
 */
export function isTaskContextWarning(context: string): boolean {
  return context.includes('Warning:') || context.includes('All tasks completed');
}

/**
 * Get selected task IDs from generated context.
 * Useful for logging/debugging.
 */
export function getTaskIdsFromContext(context: string): string[] {
  const matches = context.match(/T\d{3}/g);
  return matches ? [...new Set(matches)] : [];
}
