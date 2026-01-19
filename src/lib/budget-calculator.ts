import { type SpecV2, type TaskV2, SIZE_POINTS } from './spec-parser-v2.js';

export interface BudgetOptions {
  budget?: number;
  conservative?: boolean;
}

export interface BudgetResult {
  selectedTasks: TaskV2[];
  totalPoints: number;
  remainingBudget: number;
  skippedTasks: TaskV2[];
  warnings: string[];
}

const DEFAULT_BUDGET = 4;

export function calculateBudget(
  spec: SpecV2,
  options: BudgetOptions = {}
): BudgetResult {
  const budget = options.budget ?? DEFAULT_BUDGET;
  const conservative = options.conservative ?? false;

  const pendingTasks = spec.tasks.filter(
    (t) => t.status === 'pending' || t.status === 'in_progress'
  );

  const selected: TaskV2[] = [];
  const skipped: TaskV2[] = [];
  const warnings: string[] = [];
  let remaining = budget;

  const inProgressTasks = pendingTasks.filter((t) => t.status === 'in_progress');
  for (const task of inProgressTasks) {
    if (task.sizePoints <= remaining) {
      selected.push(task);
      remaining -= task.sizePoints;
    } else {
      warnings.push(
        `In-progress task ${task.id} (${task.size}=${task.sizePoints}pts) exceeds remaining budget`
      );
    }
  }

  const trulyPending = pendingTasks.filter((t) => t.status === 'pending');

  for (const task of trulyPending) {
    if (conservative && selected.length > 0) {
      const lastSelected = selected[selected.length - 1];
      if (lastSelected.size === 'M' || lastSelected.size === 'L') {
        skipped.push(task);
        continue;
      }
    }

    const hasDependency = checkDependencies(task, spec.tasks);
    if (hasDependency.blocked) {
      skipped.push(task);
      if (hasDependency.reason) {
        warnings.push(hasDependency.reason);
      }
      continue;
    }

    if (task.sizePoints <= remaining) {
      selected.push(task);
      remaining -= task.sizePoints;

      if (conservative && (task.size === 'M' || task.size === 'L')) {
        break;
      }
    } else {
      skipped.push(task);
    }
  }

  const totalPoints = selected.reduce((sum, t) => sum + t.sizePoints, 0);

  return {
    selectedTasks: selected,
    totalPoints,
    remainingBudget: remaining,
    skippedTasks: skipped,
    warnings,
  };
}

interface DependencyCheck {
  blocked: boolean;
  reason?: string;
}

function checkDependencies(
  task: TaskV2,
  allTasks: TaskV2[]
): DependencyCheck {
  const dependencyMatch = task.rawContent.match(/depends on:\s*(T\d{3}(?:,\s*T\d{3})*)/i);
  if (!dependencyMatch) {
    return { blocked: false };
  }

  const dependencies = dependencyMatch[1].split(/,\s*/).map((d) => d.trim());

  for (const depId of dependencies) {
    const depTask = allTasks.find((t) => t.id === depId);
    if (!depTask) {
      return {
        blocked: true,
        reason: `${task.id} depends on unknown task ${depId}`,
      };
    }

    if (depTask.status !== 'passed') {
      return {
        blocked: true,
        reason: `${task.id} blocked: depends on ${depId} (${depTask.status})`,
      };
    }
  }

  return { blocked: false };
}

export function getPointsForSize(size: string): number {
  return SIZE_POINTS[size as keyof typeof SIZE_POINTS] ?? 2;
}

export function formatBudgetSummary(result: BudgetResult): string {
  const lines: string[] = [];

  if (result.selectedTasks.length === 0) {
    lines.push('No tasks selected within budget.');
  } else {
    lines.push(`Selected ${result.selectedTasks.length} task(s) (${result.totalPoints} points):`);
    for (const task of result.selectedTasks) {
      const statusIcon = task.status === 'in_progress' ? '🔄' : '📋';
      lines.push(`  ${statusIcon} ${task.id}: ${task.title} [${task.size}]`);
    }
  }

  if (result.remainingBudget > 0 && result.skippedTasks.length > 0) {
    lines.push(`\nRemaining budget: ${result.remainingBudget} points`);
  }

  for (const warning of result.warnings) {
    lines.push(`⚠️  ${warning}`);
  }

  return lines.join('\n');
}
