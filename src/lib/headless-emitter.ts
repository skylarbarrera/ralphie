import type { Stats } from './types.js';

export interface StartedEvent {
  event: 'started';
  spec: string;
  tasks: number;
  model?: string;
  harness?: string;
  timestamp: string;
}

export interface IterationEvent {
  event: 'iteration';
  n: number;
  phase: string;
}

export interface ToolEvent {
  event: 'tool';
  type: 'read' | 'write' | 'bash';
  path?: string;
}

export interface CommitEvent {
  event: 'commit';
  hash: string;
  message: string;
}

export interface TaskCompleteEvent {
  event: 'task_complete';
  index: number;
  text: string;
}

export interface IterationDoneEvent {
  event: 'iteration_done';
  n: number;
  duration_ms: number;
  stats: Stats;
}

export interface StuckEvent {
  event: 'stuck';
  reason: string;
  iterations_without_progress: number;
}

export interface CompleteEvent {
  event: 'complete';
  tasks_done: number;
  total_duration_ms: number;
}

export interface FailedEvent {
  event: 'failed';
  error: string;
}

export interface WarningEvent {
  event: 'warning';
  type: 'todo_stub' | 'quality';
  message: string;
  files?: string[];
}

export type RalphEvent =
  | StartedEvent
  | IterationEvent
  | ToolEvent
  | CommitEvent
  | TaskCompleteEvent
  | IterationDoneEvent
  | StuckEvent
  | CompleteEvent
  | FailedEvent
  | WarningEvent;

export function emit(event: RalphEvent): void {
  console.log(JSON.stringify(event));
}

export function emitStarted(spec: string, tasks: number, model?: string, harness?: string): void {
  emit({
    event: 'started',
    spec,
    tasks,
    model,
    harness,
    timestamp: new Date().toISOString(),
  });
}

export function emitIteration(n: number, phase: string): void {
  emit({ event: 'iteration', n, phase });
}

export function emitTool(type: 'read' | 'write' | 'bash', path?: string): void {
  emit({ event: 'tool', type, path });
}

export function emitCommit(hash: string, message: string): void {
  emit({ event: 'commit', hash, message });
}

export function emitTaskComplete(index: number, text: string): void {
  emit({ event: 'task_complete', index, text });
}

export function emitIterationDone(n: number, duration_ms: number, stats: Stats): void {
  emit({ event: 'iteration_done', n, duration_ms, stats });
}

export function emitStuck(reason: string, iterations_without_progress: number): void {
  emit({ event: 'stuck', reason, iterations_without_progress });
}

export function emitComplete(tasks_done: number, total_duration_ms: number): void {
  emit({ event: 'complete', tasks_done, total_duration_ms });
}

export function emitFailed(error: string): void {
  emit({ event: 'failed', error });
}

export function emitWarning(type: 'todo_stub' | 'quality', message: string, files?: string[]): void {
  emit({ event: 'warning', type, message, files });
}
