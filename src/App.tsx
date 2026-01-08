import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useApp } from 'ink';
import { IterationHeader } from './components/IterationHeader.js';
import { TaskTitle } from './components/TaskTitle.js';
import { ToolList } from './components/ToolList.js';
import { StatusBar } from './components/StatusBar.js';
import { useClaudeStream, type UseClaudeStreamOptions, type ClaudeStreamState } from './hooks/useClaudeStream.js';
import type { Stats } from './lib/state-machine.js';

export interface IterationResult {
  iteration: number;
  durationMs: number;
  stats: Stats;
  error: Error | null;
  taskText: string | null;
}

export interface AppProps {
  prompt: string;
  iteration?: number;
  totalIterations?: number;
  cwd?: string;
  idleTimeoutMs?: number;
  saveJsonl?: string | boolean;
  _mockState?: ClaudeStreamState;
  onIterationComplete?: (result: IterationResult) => void;
}

export function App({
  prompt,
  iteration = 1,
  totalIterations = 1,
  cwd,
  idleTimeoutMs,
  saveJsonl,
  _mockState,
  onIterationComplete,
}: AppProps): React.ReactElement {
  const streamOptions: UseClaudeStreamOptions = {
    prompt,
    iteration,
    totalIterations,
    cwd,
    idleTimeoutMs,
    saveJsonl,
  };

  const liveState = useClaudeStream(streamOptions);
  const state = _mockState ?? liveState;

  const elapsedSeconds = Math.floor(state.elapsedMs / 1000);

  useEffect(() => {
    if (state.phase === 'done' && !state.isRunning && onIterationComplete) {
      onIterationComplete({
        iteration,
        durationMs: state.elapsedMs,
        stats: state.stats,
        error: state.error,
        taskText: state.taskText,
      });
    }
  }, [state.phase, state.isRunning, iteration, state.elapsedMs, state.stats, state.error, state.taskText, onIterationComplete]);

  return (
    <Box flexDirection="column">
      <IterationHeader
        current={iteration}
        total={totalIterations}
        elapsedSeconds={elapsedSeconds}
      />
      <TaskTitle text={state.taskText ?? undefined} />
      <Box>
        <Text color="cyan">│</Text>
      </Box>
      <ToolList toolGroups={state.toolGroups} activeTools={state.activeTools} />
      {state.error && (
        <Box>
          <Text color="cyan">│ </Text>
          <Text color="red">✗ Error: {state.error.message}</Text>
        </Box>
      )}
      <Box>
        <Text color="cyan">│</Text>
      </Box>
      <StatusBar phase={state.phase} elapsedSeconds={elapsedSeconds} />
    </Box>
  );
}

export interface IterationRunnerProps {
  prompt: string;
  totalIterations: number;
  cwd?: string;
  idleTimeoutMs?: number;
  saveJsonl?: string | boolean;
  _mockResults?: IterationResult[];
  _mockCurrentIteration?: number;
  _mockIsComplete?: boolean;
  _mockState?: ClaudeStreamState;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function aggregateStats(results: IterationResult[]): Stats {
  return results.reduce(
    (acc, result) => ({
      toolsStarted: acc.toolsStarted + result.stats.toolsStarted,
      toolsCompleted: acc.toolsCompleted + result.stats.toolsCompleted,
      toolsErrored: acc.toolsErrored + result.stats.toolsErrored,
      reads: acc.reads + result.stats.reads,
      writes: acc.writes + result.stats.writes,
      commands: acc.commands + result.stats.commands,
      metaOps: acc.metaOps + result.stats.metaOps,
    }),
    {
      toolsStarted: 0,
      toolsCompleted: 0,
      toolsErrored: 0,
      reads: 0,
      writes: 0,
      commands: 0,
      metaOps: 0,
    }
  );
}

export function IterationRunner({
  prompt,
  totalIterations,
  cwd,
  idleTimeoutMs,
  saveJsonl,
  _mockResults,
  _mockCurrentIteration,
  _mockIsComplete,
  _mockState,
}: IterationRunnerProps): React.ReactElement {
  const { exit } = useApp();
  const [currentIteration, setCurrentIteration] = useState(_mockCurrentIteration ?? 1);
  const [results, setResults] = useState<IterationResult[]>(_mockResults ?? []);
  const [isComplete, setIsComplete] = useState(_mockIsComplete ?? false);
  const [iterationKey, setIterationKey] = useState(0);

  const handleIterationComplete = useCallback((result: IterationResult) => {
    setResults((prev) => [...prev, result]);

    if (result.error) {
      setIsComplete(true);
      return;
    }

    if (currentIteration < totalIterations) {
      setCurrentIteration((prev) => prev + 1);
      setIterationKey((prev) => prev + 1);
    } else {
      setIsComplete(true);
    }
  }, [currentIteration, totalIterations]);

  useEffect(() => {
    if (isComplete && !_mockIsComplete) {
      const timer = setTimeout(() => {
        exit();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isComplete, exit, _mockIsComplete]);

  if (isComplete) {
    const totalDuration = results.reduce((acc, r) => acc + r.durationMs, 0);
    const successCount = results.filter((r) => !r.error).length;
    const errorCount = results.filter((r) => r.error).length;
    const stats = aggregateStats(results);

    return (
      <Box flexDirection="column">
        <Box>
          <Text color="cyan">╔═══════════════════════════════════════════════════════╗</Text>
        </Box>
        <Box>
          <Text color="cyan">║</Text>
          <Text color="green" bold> ✓ All iterations complete</Text>
          <Text color="cyan">                              ║</Text>
        </Box>
        <Box>
          <Text color="cyan">╠═══════════════════════════════════════════════════════╣</Text>
        </Box>
        <Box>
          <Text color="cyan">║</Text>
          <Text> Iterations: </Text>
          <Text color="green">{successCount} succeeded</Text>
          {errorCount > 0 && (
            <>
              <Text>, </Text>
              <Text color="red">{errorCount} failed</Text>
            </>
          )}
          <Text color="cyan">                          ║</Text>
        </Box>
        <Box>
          <Text color="cyan">║</Text>
          <Text> Duration:   </Text>
          <Text color="yellow">{formatDuration(totalDuration)}</Text>
          <Text color="cyan">                                        ║</Text>
        </Box>
        <Box>
          <Text color="cyan">║</Text>
          <Text> Tools:      </Text>
          <Text>{stats.reads} reads, {stats.writes} writes, {stats.commands} commands</Text>
          <Text color="cyan">    ║</Text>
        </Box>
        <Box>
          <Text color="cyan">╚═══════════════════════════════════════════════════════╝</Text>
        </Box>
        {results.map((result, idx) => (
          <Box key={idx}>
            <Text color={result.error ? 'red' : 'green'}>
              {result.error ? '✗' : '✓'}
            </Text>
            <Text> Iteration {result.iteration}: </Text>
            <Text color="gray">
              {result.taskText ? result.taskText.slice(0, 40) + (result.taskText.length > 40 ? '...' : '') : 'No task'}
            </Text>
            <Text color="gray"> ({formatDuration(result.durationMs)})</Text>
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <App
      key={iterationKey}
      prompt={prompt}
      iteration={currentIteration}
      totalIterations={totalIterations}
      cwd={cwd}
      idleTimeoutMs={idleTimeoutMs}
      saveJsonl={saveJsonl}
      onIterationComplete={handleIterationComplete}
      _mockState={_mockState}
    />
  );
}
