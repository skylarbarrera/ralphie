import { readFileSync, existsSync } from 'fs';

export type TaskStatus = 'pending' | 'in_progress' | 'passed' | 'failed';
export type TaskSize = 'S' | 'M' | 'L';

export const SIZE_POINTS: Record<TaskSize, number> = {
  S: 1,
  M: 2,
  L: 4,
};

export interface TaskV2 {
  id: string;
  title: string;
  status: TaskStatus;
  size: TaskSize;
  sizePoints: number;
  deliverables: string[];
  verify: string | null;
  rawContent: string;
}

export interface SpecV2 {
  title: string;
  goal: string;
  context: string;
  tasks: TaskV2[];
  acceptanceCriteria: string[];
  notes: string;
  totalSizePoints: number;
  completedSizePoints: number;
  pendingSizePoints: number;
  isV2Format: true;
}

export interface LegacySpecWarning {
  isV2Format: false;
  warning: string;
}

export type ParseResult = SpecV2 | LegacySpecWarning;

/**
 * Normalize spec content to handle common format variations.
 * This allows lenient parsing of AI-generated specs that may have
 * minor formatting inconsistencies.
 */
export function normalizeSpec(content: string): string {
  return (
    content
      // Normalize Status line: handle missing spaces, asterisks, etc.
      // "- Status:pending" or "-Status: pending" or "* Status: pending" → "- Status: pending"
      .replace(/^[-*]\s*Status\s*:\s*/gim, '- Status: ')
      // Normalize Size line similarly
      .replace(/^[-*]\s*Size\s*:\s*/gim, '- Size: ')
      // Ensure space after task ID colon: "### T001:Title" → "### T001: Title"
      .replace(/^(###\s+T\d{3}):(\S)/gm, '$1: $2')
      // Normalize Deliverables header
      .replace(/\*\*\s*Deliverables\s*:\s*\*\*/gi, '**Deliverables:**')
      // Normalize Verify header
      .replace(/\*\*\s*Verify\s*:\s*\*\*/gi, '**Verify:**')
  );
}

export function parseSpecV2(specPath: string): ParseResult {
  if (!existsSync(specPath)) {
    throw new Error(`Spec file not found: ${specPath}`);
  }

  const content = readFileSync(specPath, 'utf-8');
  return parseSpecV2Content(content);
}

export function parseSpecV2Content(content: string): ParseResult {
  // Normalize content to handle format variations before parsing
  const normalized = normalizeSpec(content);

  if (isLegacyFormat(normalized)) {
    return {
      isV2Format: false,
      warning:
        'Legacy SPEC format detected (checkbox tasks). Please migrate to v2 format with task IDs (T001, T002, etc.)',
    };
  }

  const title = parseTitle(normalized);
  const goal = parseGoal(normalized);
  const context = parseContext(normalized);
  const tasks = parseTasks(normalized);
  const acceptanceCriteria = parseAcceptanceCriteria(normalized);
  const notes = parseNotes(normalized);

  const totalSizePoints = tasks.reduce((sum, t) => sum + t.sizePoints, 0);
  const completedSizePoints = tasks
    .filter((t) => t.status === 'passed')
    .reduce((sum, t) => sum + t.sizePoints, 0);
  const pendingSizePoints = tasks
    .filter((t) => t.status === 'pending' || t.status === 'in_progress')
    .reduce((sum, t) => sum + t.sizePoints, 0);

  return {
    title,
    goal,
    context,
    tasks,
    acceptanceCriteria,
    notes,
    totalSizePoints,
    completedSizePoints,
    pendingSizePoints,
    isV2Format: true,
  };
}

function isLegacyFormat(content: string): boolean {
  const hasCheckboxTasks = /^-\s*\[\s*[x ]?\s*\]\s+/m.test(content);
  const hasTaskIds = /^###\s+T\d{3}:/m.test(content);

  return hasCheckboxTasks && !hasTaskIds;
}

function parseTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : 'Untitled Spec';
}

function parseGoal(content: string): string {
  const match = content.match(/^Goal:\s*(.+)$/m);
  return match ? match[1].trim() : '';
}

function parseContext(content: string): string {
  const match = content.match(/## Context\s*\n([\s\S]*?)(?=\n## |\n---|\$)/);
  return match ? match[1].trim() : '';
}

function parseTasks(content: string): TaskV2[] {
  const tasks: TaskV2[] = [];

  const taskHeaderRegex = /^###\s+(T\d{3}):\s*(.+)$/gm;
  let match;

  const taskSections: { id: string; title: string; startIndex: number }[] = [];

  while ((match = taskHeaderRegex.exec(content)) !== null) {
    taskSections.push({
      id: match[1],
      title: match[2].trim(),
      startIndex: match.index,
    });
  }

  for (let i = 0; i < taskSections.length; i++) {
    const section = taskSections[i];
    const nextIndex = taskSections[i + 1]?.startIndex ?? content.length;
    const taskContent = content.slice(section.startIndex, nextIndex);

    const task = parseTaskContent(section.id, section.title, taskContent);
    tasks.push(task);
  }

  return tasks;
}

function parseTaskContent(id: string, title: string, content: string): TaskV2 {
  const statusMatch = content.match(/^-\s*Status:\s*(pending|in_progress|passed|failed)/m);
  const status: TaskStatus = (statusMatch?.[1] as TaskStatus) || 'pending';

  const sizeMatch = content.match(/^-\s*Size:\s*([SML])/m);
  const size: TaskSize = (sizeMatch?.[1] as TaskSize) || 'M';
  const sizePoints = SIZE_POINTS[size];

  const deliverables = parseDeliverables(content);
  const verify = parseVerify(content);

  return {
    id,
    title,
    status,
    size,
    sizePoints,
    deliverables,
    verify,
    rawContent: content,
  };
}

function parseDeliverables(content: string): string[] {
  const deliverables: string[] = [];

  const match = content.match(/\*\*Deliverables:\*\*\s*\n([\s\S]*?)(?=\n\*\*|\n---|\n###|$)/);
  if (!match) return deliverables;

  const lines = match[1].split('\n');
  for (const line of lines) {
    const bulletMatch = line.match(/^-\s+(.+)$/);
    if (bulletMatch) {
      deliverables.push(bulletMatch[1].trim());
    }
  }

  return deliverables;
}

function parseVerify(content: string): string | null {
  const match = content.match(/\*\*Verify:\*\*\s*(.+)$/m);
  if (!match) return null;

  const verifyText = match[1].trim();
  const codeMatch = verifyText.match(/`(.+?)`/);
  return codeMatch ? codeMatch[1] : verifyText;
}

function parseAcceptanceCriteria(content: string): string[] {
  const criteria: string[] = [];

  const match = content.match(/## Acceptance Criteria\s*\n([\s\S]*?)(?=\n## |$)/);
  if (!match) return criteria;

  const lines = match[1].split('\n');
  for (const line of lines) {
    const bulletMatch = line.match(/^-\s+(.+)$/);
    if (bulletMatch) {
      criteria.push(bulletMatch[1].trim());
    }
  }

  return criteria;
}

function parseNotes(content: string): string {
  const match = content.match(/## Notes\s*\n([\s\S]*)$/);
  return match ? match[1].trim() : '';
}

export function getNextPendingTasks(spec: SpecV2, budget: number = 4): TaskV2[] {
  const pending = spec.tasks.filter(
    (t) => t.status === 'pending' || t.status === 'in_progress'
  );

  const selected: TaskV2[] = [];
  let remaining = budget;

  for (const task of pending) {
    if (task.sizePoints <= remaining) {
      selected.push(task);
      remaining -= task.sizePoints;
    }
  }

  return selected;
}

export function getTaskById(spec: SpecV2, taskId: string): TaskV2 | undefined {
  return spec.tasks.find((t) => t.id === taskId);
}

export function getSpecProgress(spec: SpecV2): {
  completed: number;
  total: number;
  percentage: number;
} {
  const completed = spec.tasks.filter((t) => t.status === 'passed').length;
  const total = spec.tasks.length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { completed, total, percentage };
}

/**
 * Check if spec is complete (all tasks are passed or failed).
 * Failed tasks count as "done" - they won't be retried.
 */
export function isSpecV2Complete(spec: SpecV2): boolean {
  if (spec.tasks.length === 0) return true;
  return spec.tasks.every((t) => t.status === 'passed' || t.status === 'failed');
}

/**
 * Check if spec at path is complete.
 * Returns false if spec doesn't exist or is legacy format.
 */
export function isSpecCompleteV2(specPath: string): boolean {
  if (!existsSync(specPath)) return false;

  const result = parseSpecV2(specPath);
  if (!result.isV2Format) return false;

  return isSpecV2Complete(result);
}

/**
 * Get progress for spec at path.
 * Returns null if spec doesn't exist or is legacy format.
 */
export function getProgressV2(specPath: string): { completed: number; total: number; percentage: number } | null {
  if (!existsSync(specPath)) return null;

  const result = parseSpecV2(specPath);
  if (!result.isV2Format) return null;

  return getSpecProgress(result);
}

/**
 * Get count of tasks that are done (passed or failed).
 */
export function getDoneTaskCount(spec: SpecV2): number {
  return spec.tasks.filter((t) => t.status === 'passed' || t.status === 'failed').length;
}

/**
 * Get title for spec at path.
 * Returns null if spec doesn't exist or is legacy format.
 */
export function getSpecTitleV2(specPath: string): string | null {
  if (!existsSync(specPath)) return null;

  const result = parseSpecV2(specPath);
  if (!result.isV2Format) return null;

  return result.title;
}

/**
 * Get task for iteration (V2 compatibility bridge for IterationRunner).
 * Returns the first pending/in_progress task, ignoring iteration number
 * (V2 tasks are ordered, unlike V1's iteration-based approach).
 *
 * @param spec - The V2 spec
 * @param iteration - Iteration number (ignored in V2, kept for API compatibility)
 * @returns Task info matching V1 return type, or null if no pending tasks
 */
export function getTaskForIterationV2(
  spec: SpecV2,
  iteration: number
): { taskNumber: string; phaseName: string | null; taskText: string } | null {
  // Find first pending or in_progress task
  const currentTask = spec.tasks.find(
    (t) => t.status === 'pending' || t.status === 'in_progress'
  );

  if (!currentTask) {
    return null;
  }

  // Build taskText: title + first deliverable (if exists)
  const firstDeliverable = currentTask.deliverables[0] || '';
  const taskText = firstDeliverable
    ? `${currentTask.title}\n- ${firstDeliverable}`
    : currentTask.title;

  return {
    taskNumber: currentTask.id,
    phaseName: null, // V2 doesn't have phases
    taskText,
  };
}
