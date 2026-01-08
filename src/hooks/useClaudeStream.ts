import { useState, useEffect, useRef, useCallback } from 'react';
import { spawn, type ChildProcess } from 'child_process';
import { StreamParser } from '../lib/stream-parser.js';
import {
  StateMachine,
  type Phase,
  type ActiveTool,
  type ToolGroup,
  type Stats,
} from '../lib/state-machine.js';
import type { ResultEvent, ActivityItem, LastCommit } from '../lib/types.js';
import { JsonlLogger } from '../lib/logger.js';

export type SpawnFn = (
  command: string,
  args: string[],
  options: { cwd: string; stdio: ['ignore', 'pipe', 'pipe'] }
) => ChildProcess;

export interface UseClaudeStreamOptions {
  prompt: string;
  cwd?: string;
  idleTimeoutMs?: number;
  saveJsonl?: string | boolean;
  iteration?: number;
  totalIterations?: number;
  _spawnFn?: SpawnFn;
}

export interface ClaudeStreamState {
  phase: Phase;
  taskText: string | null;
  activeTools: ActiveTool[];
  toolGroups: ToolGroup[];
  stats: Stats;
  elapsedMs: number;
  result: ResultEvent | null;
  error: Error | null;
  isRunning: boolean;
  activityLog: ActivityItem[];
  lastCommit: LastCommit | null;
}

const DEFAULT_IDLE_TIMEOUT_MS = 120_000;

export function useClaudeStream(options: UseClaudeStreamOptions): ClaudeStreamState {
  const {
    prompt,
    cwd,
    idleTimeoutMs = DEFAULT_IDLE_TIMEOUT_MS,
    saveJsonl,
    iteration = 1,
    totalIterations = 1,
    _spawnFn = spawn,
  } = options;

  const [state, setState] = useState<ClaudeStreamState>(() => ({
    phase: 'idle',
    taskText: null,
    activeTools: [],
    toolGroups: [],
    stats: {
      toolsStarted: 0,
      toolsCompleted: 0,
      toolsErrored: 0,
      reads: 0,
      writes: 0,
      commands: 0,
      metaOps: 0,
    },
    elapsedMs: 0,
    result: null,
    error: null,
    isRunning: false,
    activityLog: [],
    lastCommit: null,
  }));

  const processRef = useRef<ChildProcess | null>(null);
  const parserRef = useRef<StreamParser | null>(null);
  const machineRef = useRef<StateMachine | null>(null);
  const loggerRef = useRef<JsonlLogger | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(() => {
      if (processRef.current && mountedRef.current) {
        processRef.current.kill('SIGTERM');
        setState((prev) => ({
          ...prev,
          error: new Error(`Idle timeout: no output for ${idleTimeoutMs / 1000}s`),
          isRunning: false,
          phase: 'done',
        }));
      }
    }, idleTimeoutMs);
  }, [idleTimeoutMs]);

  const updateStateFromMachine = useCallback(() => {
    const machine = machineRef.current;
    if (!machine || !mountedRef.current) return;

    const machineState = machine.getState();
    setState((prev) => ({
      ...prev,
      phase: machineState.phase,
      taskText: machineState.taskText,
      activeTools: Array.from(machineState.activeTools.values()),
      toolGroups: machineState.toolGroups,
      stats: machineState.stats,
      elapsedMs: machine.getElapsedMs(),
      result: machineState.result,
      activityLog: machineState.activityLog,
      lastCommit: machineState.lastCommit,
    }));
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const machine = new StateMachine(iteration, totalIterations);
    machineRef.current = machine;

    const parser = new StreamParser();
    parserRef.current = parser;

    let logger: JsonlLogger | null = null;
    if (saveJsonl) {
      const loggerOpts = typeof saveJsonl === 'string' ? { filename: saveJsonl } : {};
      logger = new JsonlLogger(loggerOpts);
      loggerRef.current = logger;
    }

    parser.on('init', () => {
      updateStateFromMachine();
    });

    parser.on('text', (event) => {
      machine.handleText(event);
      updateStateFromMachine();
    });

    parser.on('tool_start', (event) => {
      machine.handleToolStart(event);
      updateStateFromMachine();
    });

    parser.on('tool_end', (event) => {
      machine.handleToolEnd(event);
      updateStateFromMachine();
    });

    parser.on('result', (event) => {
      machine.handleResult(event);
      updateStateFromMachine();
      setState((prev) => ({ ...prev, isRunning: false }));
    });

    parser.on('error', (event) => {
      if (mountedRef.current) {
        setState((prev) => ({ ...prev, error: event.error }));
      }
    });

    const args = [
      '--dangerously-skip-permissions',
      '--output-format',
      'stream-json',
      '--verbose',
      '-p',
      prompt,
    ];

    const proc = _spawnFn('claude', args, {
      cwd: cwd ?? process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    processRef.current = proc;
    setState((prev) => ({ ...prev, isRunning: true }));

    elapsedTimerRef.current = setInterval(() => {
      if (mountedRef.current && machineRef.current) {
        setState((prev) => ({
          ...prev,
          elapsedMs: machineRef.current!.getElapsedMs(),
        }));
      }
    }, 1000);

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
      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          error: err,
          isRunning: false,
          phase: 'done',
        }));
      }
    });

    proc.on('close', () => {
      if (mountedRef.current) {
        parser.flush();
        if (idleTimerRef.current) {
          clearTimeout(idleTimerRef.current);
        }
        if (elapsedTimerRef.current) {
          clearInterval(elapsedTimerRef.current);
        }
        setState((prev) => ({
          ...prev,
          isRunning: false,
          phase: prev.phase === 'done' ? 'done' : 'done',
        }));
      }
    });

    return () => {
      mountedRef.current = false;
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
      }
      if (processRef.current) {
        processRef.current.kill('SIGTERM');
      }
      if (loggerRef.current) {
        loggerRef.current.close();
      }
    };
  }, [prompt, cwd, idleTimeoutMs, saveJsonl, iteration, totalIterations, _spawnFn, resetIdleTimer, updateStateFromMachine]);

  return state;
}
