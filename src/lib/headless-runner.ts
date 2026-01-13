import { spawn, type ChildProcess, type SpawnOptionsWithoutStdio } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { StreamParser } from './stream-parser.js';
import { StateMachine, type Stats } from './state-machine.js';
import { JsonlLogger } from './logger.js';
import { isSpecComplete } from './spec-parser.js';
import { getToolCategory } from './tool-categories.js';
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
} from './headless-emitter.js';

export interface HeadlessRunOptions {
  prompt: string;
  cwd: string;
  iterations: number;
  stuckThreshold: number;
  idleTimeoutMs: number;
  saveJsonl?: string;
}

export interface IterationResult {
  iteration: number;
  durationMs: number;
  stats: Stats;
  error?: Error;
  commitHash?: string;
  commitMessage?: string;
}

export type SpawnFn = (
  command: string,
  args: readonly string[],
  options?: SpawnOptionsWithoutStdio
) => ChildProcess;

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

export async function runSingleIteration(
  options: HeadlessRunOptions,
  iteration: number,
  totalIterations: number,
  _spawnFn: SpawnFn = spawn
): Promise<IterationResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const machine = new StateMachine(iteration, totalIterations);
    const parser = new StreamParser();

    let logger: JsonlLogger | null = null;
    if (options.saveJsonl) {
      logger = new JsonlLogger({ filename: options.saveJsonl });
    }

    let idleTimer: NodeJS.Timeout | null = null;
    let resolved = false;

    const finish = (error?: Error) => {
      if (resolved) return;
      resolved = true;

      if (idleTimer) {
        clearTimeout(idleTimer);
      }
      if (logger) {
        logger.close();
      }

      const state = machine.getState();
      resolve({
        iteration,
        durationMs: Date.now() - startTime,
        stats: state.stats,
        error,
        commitHash: state.lastCommit?.hash,
        commitMessage: state.lastCommit?.message,
      });
    };

    const resetIdleTimer = () => {
      if (idleTimer) {
        clearTimeout(idleTimer);
      }
      idleTimer = setTimeout(() => {
        proc.kill('SIGTERM');
        finish(new Error(`Idle timeout: no output for ${options.idleTimeoutMs / 1000}s`));
      }, options.idleTimeoutMs);
    };

    // Wire up parser events to emit headless events
    parser.on('tool_start', (event) => {
      machine.handleToolStart(event);
      const category = getToolCategory(event.toolName);
      const toolType = category === 'read' ? 'read'
        : category === 'write' ? 'write'
        : category === 'command' ? 'bash'
        : 'bash';
      const path = event.input?.file_path || event.input?.path || event.input?.pattern;
      emitTool(toolType as 'read' | 'write' | 'bash', typeof path === 'string' ? path : undefined);
    });

    parser.on('tool_end', (event) => {
      machine.handleToolEnd(event);

      // Check for git commit
      const state = machine.getState();
      if (state.lastCommit) {
        emitCommit(state.lastCommit.hash, state.lastCommit.message);
      }
    });

    parser.on('text', (event) => {
      machine.handleText(event);
    });

    parser.on('result', (event) => {
      machine.handleResult(event);
      finish();
    });

    parser.on('error', (event) => {
      finish(event.error);
    });

    const args = [
      '--dangerously-skip-permissions',
      '--output-format',
      'stream-json',
      '--verbose',
      '-p',
      options.prompt,
    ];

    const proc = _spawnFn('claude', args, {
      cwd: options.cwd,
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    resetIdleTimer();

    proc.stdout?.on('data', (chunk: Buffer) => {
      resetIdleTimer();
      const text = chunk.toString('utf-8');
      if (logger) {
        for (const line of text.split('\n')) {
          if (line.trim()) {
            logger.log(line);
          }
        }
      }
      parser.parseChunk(text);
    });

    proc.stderr?.on('data', () => {
      resetIdleTimer();
    });

    proc.on('error', (err) => {
      finish(err);
    });

    proc.on('close', () => {
      parser.flush();
      finish();
    });
  });
}

export async function executeHeadlessRun(
  options: HeadlessRunOptions,
  _spawnFn: SpawnFn = spawn
): Promise<number> {
  const totalTasks = getTotalTaskCount(options.cwd);
  emitStarted('SPEC.md', totalTasks);

  let iterationsWithoutProgress = 0;
  let tasksBefore = getCompletedTaskTexts(options.cwd);
  const totalStartTime = Date.now();
  let lastCompletedCount = tasksBefore.length;

  for (let i = 1; i <= options.iterations; i++) {
    emitIteration(i, 'starting');

    const result = await runSingleIteration(options, i, options.iterations, _spawnFn);

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
