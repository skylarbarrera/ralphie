import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { isSpecCompleteV2, getProgressV2, parseSpecV2 } from './spec-parser-v2.js';
import { locateActiveSpec } from './spec-locator.js';
import { getToolCategory } from './tool-categories.js';
import type { HeadlessIterationResult } from './types.js';
import type { HarnessName, HarnessEvent } from './harness/types.js';
import { getHarness } from './harness/index.js';
import { injectLearnings } from './prompts.js';
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
import {
  recordTaskStatuses,
  detectFailedToPassedTasks,
  generateLearningFromFailure,
  createLearning,
  generateLearningCaptureInstructions,
} from './learnings/index.js';

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

  // Search for learnings and inject into prompt
  let promptToUse = options.prompt;
  try {
    const specResult = locateActiveSpec(options.cwd);
    if (specResult && specResult.path) {
      const spec = parseSpecV2(specResult.path);

      // Check if we need to capture learnings from failed→passed tasks
      const tasks = spec.tasks.map((t) => ({ id: t.id, status: t.status }));
      const failedToPassedTasks = detectFailedToPassedTasks(options.cwd, tasks);

      if (failedToPassedTasks.length > 0) {
        // Inject learning capture instructions for the first failed→passed task
        const taskId = failedToPassedTasks[0];
        const task = spec.tasks.find((t) => t.id === taskId);

        if (task) {
          // Create stub learning file
          const learningInput = generateLearningFromFailure({
            taskId: task.id,
            taskTitle: task.title,
            errorMessage: 'Task failed in previous iteration',
          });

          const learningResult = createLearning(learningInput, options.cwd);

          // Inject instructions to complete the learning
          const instructions = generateLearningCaptureInstructions(
            task.id,
            task.title,
            learningResult.path
          );

          promptToUse = `${options.prompt}\n\n${instructions}`;
        }
      }

      // Find the first pending task to extract context for learnings search
      const pendingTask = spec.tasks.find((t) => t.status === 'pending');

      if (pendingTask) {
        const deliverables = pendingTask.deliverables?.join('\n') || '';
        promptToUse = injectLearnings(promptToUse, pendingTask.title, deliverables, options.cwd);
      }
    }
  } catch (error) {
    // If learnings search fails, just use the original prompt
    // This is not critical to the iteration, so we continue
  }

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
      promptToUse,
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

  // Locate active spec
  const located = locateActiveSpec(options.cwd);
  const specPath = located.path;

  // Get initial progress
  const initialProgress = getProgressV2(specPath) ?? { completed: 0, total: 0 };

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

    // Check for newly completed tasks
    const progress = getProgressV2(specPath);
    const currentCompleted = progress?.completed ?? 0;

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

    // Record task statuses for next iteration (to detect failed→passed transitions)
    try {
      const spec = parseSpecV2(specPath);
      const tasks = spec.tasks.map((t) => ({ id: t.id, status: t.status }));
      recordTaskStatuses(options.cwd, tasks);
    } catch (error) {
      // Status tracking is not critical - log but continue
      console.warn('[status-tracker] Failed to track task statuses:', error);
    }

    // Check for stuck condition
    if (iterationsWithoutProgress >= options.stuckThreshold) {
      emitStuck('No task progress', iterationsWithoutProgress);
      return EXIT_CODE_STUCK;
    }

    // Check if spec is complete
    if (isSpecCompleteV2(specPath)) {
      emitComplete(currentCompleted, Date.now() - totalStartTime);
      return EXIT_CODE_COMPLETE;
    }
  }

  // Max iterations reached without completion
  return EXIT_CODE_MAX_ITERATIONS;
}
