import { useState, useEffect, useRef, useCallback } from 'react';
import type { HarnessEvent, HarnessName } from '../lib/harness/types.js';
import { getHarness } from '../lib/harness/index.js';
import type { ActivityItem, LastCommit } from '../lib/types.js';
import type { Phase, Stats, ToolGroup, ActiveTool } from '../lib/state-machine.js';
import { getToolCategory } from '../lib/tool-categories.js';

export interface UseHarnessStreamOptions {
  prompt: string;
  cwd?: string;
  harness?: HarnessName;
  model?: string;
  iteration?: number;
  totalIterations?: number;
}

export interface HarnessStreamState {
  phase: Phase;
  taskText: string | null;
  activeTools: ActiveTool[];
  toolGroups: ToolGroup[];
  stats: Stats;
  elapsedMs: number;
  result: { totalCostUsd?: number; usage?: { inputTokens: number; outputTokens: number } } | null;
  error: Error | null;
  isRunning: boolean;
  activityLog: ActivityItem[];
  lastCommit: LastCommit | null;
}

/**
 * React hook for running iterations using the harness abstraction.
 *
 * This is a simpler alternative to useClaudeStream that uses the
 * official SDKs via the harness layer instead of parsing CLI output.
 */
export function useHarnessStream(options: UseHarnessStreamOptions): HarnessStreamState {
  const {
    prompt,
    cwd,
    harness: harnessName = 'claude',
    model,
    iteration = 1,
    totalIterations = 1,
  } = options;

  const [state, setState] = useState<HarnessStreamState>(() => ({
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

  const mountedRef = useRef(true);
  const startTimeRef = useRef(Date.now());
  const toolIdRef = useRef(0);
  const activeToolsMapRef = useRef(new Map<string, ActiveTool>());

  const handleEvent = useCallback((event: HarnessEvent) => {
    if (!mountedRef.current) return;

    setState((prev) => {
      switch (event.type) {
        case 'tool_start': {
          const toolId = `tool-${toolIdRef.current++}`;
          const category = getToolCategory(event.name);
          const displayName = event.input ?? event.name;

          const activeTool: ActiveTool = {
            id: toolId,
            name: event.name,
            category,
            startTime: Date.now(),
            input: event.input ? { raw: event.input } : {},
          };

          activeToolsMapRef.current.set(toolId, activeTool);

          const newStats = { ...prev.stats, toolsStarted: prev.stats.toolsStarted + 1 };
          if (category === 'read') newStats.reads++;
          else if (category === 'write') newStats.writes++;
          else if (category === 'command') newStats.commands++;
          else newStats.metaOps++;

          const newActivity: ActivityItem = {
            type: 'tool_start',
            toolUseId: toolId,
            toolName: event.name,
            displayName,
            timestamp: Date.now(),
          };

          return {
            ...prev,
            phase: category === 'read' ? 'reading' : category === 'write' ? 'editing' : 'running',
            activeTools: Array.from(activeToolsMapRef.current.values()),
            stats: newStats,
            activityLog: [...prev.activityLog, newActivity],
          };
        }

        case 'tool_end': {
          const completedTool = Array.from(activeToolsMapRef.current.values())
            .find(t => t.name === event.name);

          const toolUseId = completedTool?.id ?? `tool-unknown-${Date.now()}`;

          if (completedTool) {
            activeToolsMapRef.current.delete(completedTool.id);
          }

          const newStats = {
            ...prev.stats,
            toolsCompleted: prev.stats.toolsCompleted + 1,
            toolsErrored: event.error ? prev.stats.toolsErrored + 1 : prev.stats.toolsErrored,
          };

          const newActivity: ActivityItem = {
            type: 'tool_complete',
            toolUseId,
            toolName: event.name,
            displayName: event.name,
            durationMs: completedTool ? Date.now() - completedTool.startTime : 0,
            isError: event.error ?? false,
            timestamp: Date.now(),
          };

          // Check for git commit in bash output
          let newCommit = prev.lastCommit;
          if (event.name === 'Bash' && event.output) {
            const commitMatch = event.output.match(/\[[\w-]+\s+([a-f0-9]{7,40})\]\s+(.+)/);
            if (commitMatch) {
              newCommit = { hash: commitMatch[1], message: commitMatch[2] };
            }
          }

          return {
            ...prev,
            phase: activeToolsMapRef.current.size > 0 ? prev.phase : 'thinking',
            activeTools: Array.from(activeToolsMapRef.current.values()),
            stats: newStats,
            activityLog: [...prev.activityLog, newActivity],
            lastCommit: newCommit,
          };
        }

        case 'thinking': {
          const newActivity: ActivityItem = {
            type: 'thought',
            text: event.text,
            timestamp: Date.now(),
          };

          return {
            ...prev,
            phase: 'thinking',
            taskText: prev.taskText ?? event.text.slice(0, 100),
            activityLog: [...prev.activityLog, newActivity],
          };
        }

        case 'message': {
          return {
            ...prev,
            taskText: prev.taskText ?? event.text.slice(0, 100),
          };
        }

        case 'error': {
          return {
            ...prev,
            error: new Error(event.message),
          };
        }

        default:
          return prev;
      }
    });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    startTimeRef.current = Date.now();
    toolIdRef.current = 0;
    activeToolsMapRef.current.clear();

    const harness = getHarness(harnessName);

    setState((prev) => ({ ...prev, isRunning: true, phase: 'idle' }));

    // Elapsed time ticker
    const tickerInterval = setInterval(() => {
      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          elapsedMs: Date.now() - startTimeRef.current,
        }));
      }
    }, 1000);

    // Run the harness
    harness
      .run(
        prompt,
        {
          cwd: cwd ?? process.cwd(),
          model,
        },
        handleEvent
      )
      .then((result) => {
        if (!mountedRef.current) return;

        setState((prev) => ({
          ...prev,
          phase: 'done',
          isRunning: false,
          elapsedMs: result.durationMs,
          result: {
            totalCostUsd: result.costUsd,
            usage: result.usage,
          },
          error: result.error ? new Error(result.error) : prev.error,
        }));
      })
      .catch((err) => {
        if (!mountedRef.current) return;

        setState((prev) => ({
          ...prev,
          phase: 'done',
          isRunning: false,
          error: err instanceof Error ? err : new Error(String(err)),
        }));
      });

    return () => {
      mountedRef.current = false;
      clearInterval(tickerInterval);
    };
  }, [prompt, cwd, harnessName, model, handleEvent]);

  return state;
}
