import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { isSpecComplete } from './spec-parser.js';
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
  const totalTasks = getTotalTaskCount(options.cwd);
  const harnessName = options.harness ?? 'claude';
  emitStarted('SPEC.md', totalTasks, options.model, harnessName);

  let iterationsWithoutProgress = 0;
  let tasksBefore = getCompletedTaskTexts(options.cwd);
  const totalStartTime = Date.now();
  let lastCompletedCount = tasksBefore.length;

  for (let i = 1; i <= options.iterations; i++) {
    emitIteration(i, 'starting');

    const result = await runSingleIteration(options, i);

    if (result.error) {
      emitFailed(result.error.message);
      return EXIT_CODE_ERROR;
    }

    // Check for newly completed tasks
    const tasksAfter = getCompletedTaskTexts(options.cwd);
    const newlyCompleted = tasksAfter.filter(task => !tasksBefore.includes(task));

    for (let j = 0; j < newlyCompleted.length; j++) {
      emitTaskComplete(lastCompletedCount + j + 1, newlyCompleted[j]);
    }

    if (newlyCompleted.length > 0) {
      const filesWithStubs = detectTodoStubs(options.cwd);
      if (filesWithStubs.length > 0) {
        emitWarning(
          'todo_stub',
          'Completed tasks contain TODO/FIXME stubs',
          filesWithStubs
        );
      }
    }

    if (tasksAfter.length > tasksBefore.length) {
      iterationsWithoutProgress = 0;
      lastCompletedCount = tasksAfter.length;
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

    // Check if SPEC is complete
    const specPath = join(options.cwd, 'SPEC.md');
    if (isSpecComplete(specPath)) {
      emitComplete(tasksAfter.length, Date.now() - totalStartTime);
      return EXIT_CODE_COMPLETE;
    }

    tasksBefore = tasksAfter;
  }

  // Max iterations reached without completion
  return EXIT_CODE_MAX_ITERATIONS;
}
