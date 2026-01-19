import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { isSpecCompleteV2, getProgressV2, parseSpecV2 } from './spec-parser-v2.js';
import { locateActiveSpec, SpecLocatorError } from './spec-locator.js';
import { getToolCategory } from './tool-categories.js';
import type { HeadlessIterationResult } from './types.js';
import type { HarnessName, HarnessEvent } from './harness/types.js';
import { getHarness } from './harness/index.js';
import {
  emitStarted,
  emitIteration,
  emitTool,
  emitCommit,
  emitTaskComplete,
  emitIterationDone,
  emitStuck,
  emitComplete,
  emitFailed,
  emitWarning,
} from './headless-emitter.js';

export interface HeadlessRunOptions {
  prompt: string;
  cwd: string;
  iterations: number;
  stuckThreshold: number;
  idleTimeoutMs: number;
  saveJsonl?: string;
  model?: string;
  harness?: HarnessName;
}

// Re-export for backwards compatibility
export type { HeadlessIterationResult as IterationResult } from './types.js';

export const EXIT_CODE_COMPLETE = 0;
export const EXIT_CODE_STUCK = 1;
export const EXIT_CODE_MAX_ITERATIONS = 2;
export const EXIT_CODE_ERROR = 3;

/**
 * @deprecated Use getProgressV2() from spec-parser-v2.ts instead.
 * Kept for backward compatibility with V1 SPEC.md checkbox format.
 */
export function getCompletedTaskTexts(cwd: string): string[] {
  const specPath = join(cwd, 'SPEC.md');
  if (!existsSync(specPath)) return [];

  const content = readFileSync(specPath, 'utf-8');
  const lines = content.split('\n');
  const completedTasks: string[] = [];

  for (const line of lines) {
    const match = line.match(/^-\s*\[x\]\s+(.+)$/i);
    if (match) {
      completedTasks.push(match[1].trim());
    }
  }

  return completedTasks;
}

/**
 * @deprecated Use getProgressV2() from spec-parser-v2.ts instead.
 * Kept for backward compatibility with V1 SPEC.md checkbox format.
 */
export function getTotalTaskCount(cwd: string): number {
  const specPath = join(cwd, 'SPEC.md');
  if (!existsSync(specPath)) return 0;

  const content = readFileSync(specPath, 'utf-8');
  const allTasks = content.match(/^-\s*\[[x\s]\]\s+/gim);
  return allTasks ? allTasks.length : 0;
}

const TODO_PATTERNS = [
  /\/\/\s*TODO:/i,
  /\/\/\s*FIXME:/i,
  /#\s*TODO:/i,
  /#\s*FIXME:/i,
  /throw new Error\(['"]Not implemented/i,
  /raise NotImplementedError/i,
];

export function detectTodoStubs(cwd: string): string[] {
  const filesWithStubs: string[] = [];

  try {
    const { execSync } = require('child_process');
    const gitDiff = execSync('git diff --name-only HEAD~1 HEAD 2>/dev/null || git diff --name-only HEAD', {
      cwd,
      encoding: 'utf-8',
    });

    const changedFiles = gitDiff
      .split('\n')
      .filter((f: string) => f.trim())
      .filter((f: string) => /\.(ts|tsx|js|jsx|py)$/.test(f));

    for (const file of changedFiles) {
      const filePath = join(cwd, file);
      if (!existsSync(filePath)) continue;

      try {
        const content = readFileSync(filePath, 'utf-8');
        const hasTodo = TODO_PATTERNS.some((pattern) => pattern.test(content));
        if (hasTodo) {
          filesWithStubs.push(file);
        }
      } catch {
        continue;
      }
    }
  } catch {
    return [];
  }

  return filesWithStubs;
}

/**
 * Run a single iteration using a harness (Claude SDK or Codex SDK).
 */
export async function runSingleIteration(
  options: HeadlessRunOptions,
  iteration: number,
): Promise<HeadlessIterationResult> {
  const startTime = Date.now();
  const harnessName = options.harness ?? 'claude';
  const harness = getHarness(harnessName);

  const stats = {
    toolsStarted: 0,
    toolsCompleted: 0,
    toolsErrored: 0,
    reads: 0,
    writes: 0,
    commands: 0,
    metaOps: 0,
  };

  let commitHash: string | undefined;
  let commitMessage: string | undefined;
  let lastError: Error | undefined;

  const handleEvent = (event: HarnessEvent) => {
    switch (event.type) {
      case 'tool_start': {
        stats.toolsStarted++;
        const category = getToolCategory(event.name);
        if (category === 'read') stats.reads++;
        else if (category === 'write') stats.writes++;
        else if (category === 'command') stats.commands++;
        else stats.metaOps++;

        const toolType = category === 'read' ? 'read'
          : category === 'write' ? 'write'
          : 'bash';
        emitTool(toolType as 'read' | 'write' | 'bash', event.input);
        break;
      }
      case 'tool_end': {
        stats.toolsCompleted++;
        if (event.error) stats.toolsErrored++;

        // Check for git commit in Bash output
        if (event.name === 'Bash' && event.output) {
          const commitMatch = event.output.match(/\[[\w-]+\s+([a-f0-9]{7,40})\]\s+(.+)/);
          if (commitMatch) {
            commitHash = commitMatch[1];
            commitMessage = commitMatch[2];
            emitCommit(commitHash, commitMessage);
          }
        }
        break;
      }
      case 'error': {
        lastError = new Error(event.message);
        break;
      }
    }
  };

  try {
    const result = await harness.run(
      options.prompt,
      {
        cwd: options.cwd,
        model: options.model,
      },
      handleEvent
    );

    if (!result.success && result.error) {
      lastError = new Error(result.error);
    }

    return {
      iteration,
      durationMs: result.durationMs || Date.now() - startTime,
      stats,
      error: lastError,
      commitHash,
      commitMessage,
    };
  } catch (err) {
    return {
      iteration,
      durationMs: Date.now() - startTime,
      stats,
      error: err instanceof Error ? err : new Error(String(err)),
      commitHash,
      commitMessage,
    };
  }
}

export async function executeHeadlessRun(
  options: HeadlessRunOptions,
): Promise<number> {
  const harnessName = options.harness ?? 'claude';

  // Try to locate V2 spec first, fall back to V1 for progress tracking
  let specPath: string;
  let isV2Spec = false;
  try {
    const located = locateActiveSpec(options.cwd);
    specPath = located.path;
    isV2Spec = !located.isLegacy;
  } catch {
    // Fall back to V1 SPEC.md path
    specPath = join(options.cwd, 'SPEC.md');
  }

  // Get initial progress using V2 parser if available, otherwise V1
  let initialProgress = { completed: 0, total: 0 };
  if (isV2Spec) {
    const progress = getProgressV2(specPath);
    if (progress) {
      initialProgress = { completed: progress.completed, total: progress.total };
    }
  } else {
    // Fall back to V1 checkbox counting
    initialProgress = {
      completed: getCompletedTaskTexts(options.cwd).length,
      total: getTotalTaskCount(options.cwd),
    };
  }

  emitStarted(specPath, initialProgress.total, options.model, harnessName);

  let iterationsWithoutProgress = 0;
  let lastCompletedCount = initialProgress.completed;
  const totalStartTime = Date.now();

  for (let i = 1; i <= options.iterations; i++) {
    emitIteration(i, 'starting');

    const result = await runSingleIteration(options, i);

    if (result.error) {
      emitFailed(result.error.message);
      return EXIT_CODE_ERROR;
    }

    // Check for newly completed tasks using appropriate parser
    let currentCompleted = 0;
    if (isV2Spec) {
      const progress = getProgressV2(specPath);
      if (progress) {
        currentCompleted = progress.completed;
      }
    } else {
      currentCompleted = getCompletedTaskTexts(options.cwd).length;
    }

    const newlyCompletedCount = currentCompleted - lastCompletedCount;

    // Emit task completion events
    for (let j = 0; j < newlyCompletedCount; j++) {
      emitTaskComplete(lastCompletedCount + j + 1, `Task ${lastCompletedCount + j + 1}`);
    }

    if (newlyCompletedCount > 0) {
      const filesWithStubs = detectTodoStubs(options.cwd);
      if (filesWithStubs.length > 0) {
        emitWarning(
          'todo_stub',
          'Completed tasks contain TODO/FIXME stubs',
          filesWithStubs
        );
      }
      iterationsWithoutProgress = 0;
      lastCompletedCount = currentCompleted;
    } else {
      iterationsWithoutProgress++;
    }

    // Emit commit if one happened
    if (result.commitHash && result.commitMessage) {
      emitCommit(result.commitHash, result.commitMessage);
    }

    emitIterationDone(i, result.durationMs, result.stats);

    // Check for stuck condition
    if (iterationsWithoutProgress >= options.stuckThreshold) {
      emitStuck('No task progress', iterationsWithoutProgress);
      return EXIT_CODE_STUCK;
    }

    // Check if spec is complete (V2 format)
    if (isV2Spec && isSpecCompleteV2(specPath)) {
      emitComplete(currentCompleted, Date.now() - totalStartTime);
      return EXIT_CODE_COMPLETE;
    }
  }

  // Max iterations reached without completion
  return EXIT_CODE_MAX_ITERATIONS;
}
