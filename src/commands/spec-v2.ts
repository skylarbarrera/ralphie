import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import {
  locateActiveSpec,
  getActiveSpecsDirectory,
  getCompletedSpecsDirectory,
  getLessonsPath,
  hasActiveSpec,
} from '../lib/spec-locator.js';
import { parseSpecV2, getSpecProgress, type SpecV2 } from '../lib/spec-parser-v2.js';
import { archiveSpec, type ArchiveResult } from '../lib/spec-archiver.js';
import { calculateBudget, formatBudgetSummary } from '../lib/budget-calculator.js';

export interface StatusResult {
  specPath: string;
  title: string;
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
  sizePoints: {
    completed: number;
    pending: number;
    total: number;
  };
  nextTasks: string[];
  warning?: string;
}

export function runStatus(cwd: string): StatusResult {
  const located = locateActiveSpec(cwd);
  const spec = parseSpecV2(located.path);
  const progress = getSpecProgress(spec);
  const budget = calculateBudget(spec, { budget: 4 });

  return {
    specPath: located.path,
    title: spec.title,
    progress,
    sizePoints: {
      completed: spec.completedSizePoints,
      pending: spec.pendingSizePoints,
      total: spec.totalSizePoints,
    },
    nextTasks: budget.selectedTasks.map((t) => `${t.id}: ${t.title} [${t.size}]`),
  };
}

export function formatStatus(result: StatusResult): string {
  const lines: string[] = [];

  lines.push(`Spec: ${result.title}`);
  lines.push(`Path: ${result.specPath}`);
  lines.push('');

  const bar = createProgressBar(result.progress.percentage);
  lines.push(`Progress: ${bar} ${result.progress.completed}/${result.progress.total} tasks (${result.progress.percentage}%)`);
  lines.push(`Points:   ${result.sizePoints.completed}/${result.sizePoints.total} completed, ${result.sizePoints.pending} pending`);
  lines.push('');

  if (result.nextTasks.length > 0) {
    lines.push('Next tasks (budget 4):');
    for (const task of result.nextTasks) {
      lines.push(`  → ${task}`);
    }
  } else {
    lines.push('✓ All tasks completed!');
  }

  if (result.warning) {
    lines.push('');
    lines.push(`⚠️  ${result.warning}`);
  }

  return lines.join('\n');
}

function createProgressBar(percentage: number, width: number = 20): string {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

export interface ListResult {
  active: { name: string; path: string }[];
  completed: { name: string; path: string; date?: string }[];
}

export function runList(cwd: string): ListResult {
  const activeDir = getActiveSpecsDirectory(cwd);
  const completedDir = getCompletedSpecsDirectory(cwd);

  const active: ListResult['active'] = [];
  const completed: ListResult['completed'] = [];

  if (existsSync(activeDir)) {
    const files = readdirSync(activeDir).filter((f) => f.endsWith('.md') && !f.startsWith('.'));
    for (const file of files) {
      active.push({
        name: basename(file, '.md'),
        path: join(activeDir, file),
      });
    }
  }

  if (existsSync(completedDir)) {
    const files = readdirSync(completedDir).filter((f) => f.endsWith('.md') && !f.startsWith('.'));
    for (const file of files) {
      const dateMatch = file.match(/^(\d{4}-\d{2}-\d{2})-/);
      completed.push({
        name: basename(file, '.md'),
        path: join(completedDir, file),
        date: dateMatch?.[1],
      });
    }
  }

  return { active, completed };
}

export function formatList(result: ListResult): string {
  const lines: string[] = [];

  lines.push('Active specs:');
  if (result.active.length === 0) {
    lines.push('  (none)');
  } else {
    for (const spec of result.active) {
      lines.push(`  → ${spec.name}`);
    }
  }

  lines.push('');
  lines.push('Completed specs:');
  if (result.completed.length === 0) {
    lines.push('  (none)');
  } else {
    for (const spec of result.completed.slice(-5)) {
      lines.push(`  ✓ ${spec.name}${spec.date ? ` (${spec.date})` : ''}`);
    }
    if (result.completed.length > 5) {
      lines.push(`  ... and ${result.completed.length - 5} more`);
    }
  }

  return lines.join('\n');
}

export function runArchive(cwd: string): ArchiveResult {
  const located = locateActiveSpec(cwd);
  return archiveSpec(located.path, cwd);
}

export function formatArchive(result: ArchiveResult): string {
  const lines: string[] = [];
  lines.push(`Archived: ${basename(result.archivedPath)}`);
  lines.push(`Location: ${result.archivedPath}`);
  if (result.tasksUpdated > 0) {
    lines.push(`Updated ${result.tasksUpdated} task(s) to passed`);
  }
  return lines.join('\n');
}

export function runLessons(cwd: string, add?: string): string {
  const lessonsPath = getLessonsPath(cwd);

  if (!existsSync(lessonsPath)) {
    return 'No lessons.md file found. Run `ralphie init` to create one.';
  }

  if (add) {
    const today = new Date().toISOString().split('T')[0];
    const entry = `\n### ${today}: ${add}\n**Context:** Manual entry\n**Lesson:** ${add}\n**Apply when:** As needed\n`;

    let content = readFileSync(lessonsPath, 'utf-8');
    content = content.replace(
      /<!-- Add lessons below this line -->/,
      `<!-- Add lessons below this line -->\n${entry}`
    );
    writeFileSync(lessonsPath, content);

    return `Added lesson: "${add}"`;
  }

  return readFileSync(lessonsPath, 'utf-8');
}
