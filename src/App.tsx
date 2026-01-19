import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useApp } from 'ink';
import { IterationView } from './components/IterationView.js';
import { useHarnessStream, type HarnessStreamState } from './hooks/useHarnessStream.js';
import { join } from 'path';
import type { UIIterationResult, Stats } from './lib/types.js';
import type { HarnessName } from './lib/harness/types.js';
import { parseSpecV2, getTaskForIterationV2, isSpecCompleteV2, type SpecV2, type ParseResult } from './lib/spec-parser-v2.js';
import { locateActiveSpec, type LocateSpecResult } from './lib/spec-locator.js';

// Alias for backwards compatibility and shorter local usage
type IterationResult = UIIterationResult;
type StreamState = HarnessStreamState;

// Re-export for external consumers
export type { UIIterationResult as IterationResult } from './lib/types.js';

export interface AppProps {
  prompt: string;
  iteration?: number;
  totalIterations?: number;
  cwd?: string;
  idleTimeoutMs?: number;
  saveJsonl?: string | boolean;
  model?: string;
  harness?: HarnessName;
  _mockState?: StreamState;
  onIterationComplete?: (result: IterationResult) => void;
  completedResults?: IterationResult[];
  taskNumber?: string | null;
  phaseName?: string | null;
  specTaskText?: string | null;
}

export function App({
  prompt,
  iteration = 1,
  totalIterations = 1,
  cwd,
  model,
  harness = 'claude',
  _mockState,
  onIterationComplete,
  completedResults = [],
  taskNumber = null,
  phaseName = null,
  specTaskText = null,
}: AppProps): React.ReactElement {
  const liveState = useHarnessStream({
    prompt,
    cwd,
    harness,
    model,
    iteration,
    totalIterations,
  });

  const state = _mockState ?? liveState;

  return (
    <IterationView
      state={state}
      iteration={iteration}
      totalIterations={totalIterations}
      specTaskText={specTaskText}
      taskNumber={taskNumber}
      phaseName={phaseName}
      completedResults={completedResults}
      onIterationComplete={onIterationComplete}
    />
  );
}

export interface IterationRunnerProps {
  prompt: string;
  totalIterations: number;
  cwd?: string;
  idleTimeoutMs?: number;
  saveJsonl?: string | boolean;
  model?: string;
  harness?: HarnessName;
  _mockResults?: IterationResult[];
  _mockCurrentIteration?: number;
  _mockIsComplete?: boolean;
  _mockState?: StreamState;
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
  model,
  harness,
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
  const [spec, setSpec] = useState<SpecV2 | null>(null);

  useEffect(() => {
    const targetDir = cwd ?? process.cwd();
    try {
      const locateResult = locateActiveSpec(targetDir);
      const parsedSpec = parseSpecV2(locateResult.path);
      setSpec(parsedSpec);
    } catch {
      // No spec found or invalid format - run without task context
      setSpec(null);
    }
  }, [cwd]);

  const handleIterationComplete = useCallback((result: IterationResult) => {
    setResults((prev) => [...prev, result]);

    if (result.error) {
      setIsComplete(true);
      return;
    }

    const targetDir = cwd ?? process.cwd();
    try {
      const locateResult = locateActiveSpec(targetDir);

      if (isSpecCompleteV2(locateResult.path)) {
        setIsComplete(true);
        return;
      }

      const parsedSpec = parseSpecV2(locateResult.path);
      setSpec(parsedSpec);
    } catch {
      // No spec or error - continue without updating spec
    }

    if (currentIteration < totalIterations) {
      setCurrentIteration((prev) => prev + 1);
      setIterationKey((prev) => prev + 1);
    } else {
      setIsComplete(true);
    }
  }, [currentIteration, totalIterations, cwd]);

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
        {results.map((result, idx) => {
          const displayText = result.specTaskText ?? result.taskText ?? 'Unknown task';
          const truncatedText = displayText.length > 40 ? displayText.slice(0, 40) + '...' : displayText;
          return (
          <Box key={idx} flexDirection="column">
            <Box>
              <Text color={result.error ? 'red' : 'green'}>
                {result.error ? '✗' : '✓'}
              </Text>
              <Text color="cyan"> {result.taskNumber ?? result.iteration}. </Text>
              {result.phaseName && (
                <Text color="yellow">[{result.phaseName}] </Text>
              )}
              <Text color="gray">
                {truncatedText}
              </Text>
              <Text color="gray"> ({formatDuration(result.durationMs)})</Text>
            </Box>
            {result.error && (
              <Box flexDirection="column" marginLeft={2}>
                <Box>
                  <Text color="red">  Error: </Text>
                  <Text color="gray">{result.error.message.slice(0, 80)}{result.error.message.length > 80 ? '...' : ''}</Text>
                </Box>
                {result.failureContext?.lastToolName && (
                  <Box>
                    <Text color="yellow">  Tool: </Text>
                    <Text color="gray">{result.failureContext.lastToolName}</Text>
                  </Box>
                )}
                {result.failureContext?.lastToolInput && (
                  <Box>
                    <Text color="yellow">  Input: </Text>
                    <Text color="gray">{result.failureContext.lastToolInput.slice(0, 100)}{result.failureContext.lastToolInput.length > 100 ? '...' : ''}</Text>
                  </Box>
                )}
                {result.failureContext?.lastToolOutput && (
                  <Box>
                    <Text color="yellow">  Output: </Text>
                    <Text color="gray">{result.failureContext.lastToolOutput.slice(0, 150)}{result.failureContext.lastToolOutput.length > 150 ? '...' : ''}</Text>
                  </Box>
                )}
                {result.failureContext?.recentActivity && result.failureContext.recentActivity.length > 0 && (
                  <Box flexDirection="column">
                    <Text color="yellow">  Recent activity:</Text>
                    {result.failureContext.recentActivity.map((activity, i) => (
                      <Box key={i} marginLeft={2}>
                        <Text color="gray">{activity.slice(0, 80)}</Text>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            )}
            {result.lastCommit && (
              <Box marginLeft={2}>
                <Text color="green">✓ </Text>
                <Text color="yellow">{result.lastCommit.hash.slice(0, 7)}</Text>
                <Text color="gray"> - {result.lastCommit.message.slice(0, 50)}{result.lastCommit.message.length > 50 ? '...' : ''}</Text>
              </Box>
            )}
          </Box>
        );
        })}
      </Box>
    );
  }

  const currentTask = spec ? getTaskForIterationV2(spec, currentIteration) : null;

  return (
    <App
      key={iterationKey}
      prompt={prompt}
      iteration={currentIteration}
      totalIterations={totalIterations}
      cwd={cwd}
      idleTimeoutMs={idleTimeoutMs}
      saveJsonl={saveJsonl}
      model={model}
      harness={harness}
      onIterationComplete={handleIterationComplete}
      _mockState={_mockState}
      completedResults={results}
      taskNumber={currentTask?.taskNumber ?? null}
      phaseName={currentTask?.phaseName ?? null}
      specTaskText={currentTask?.taskText ?? null}
    />
  );
}
