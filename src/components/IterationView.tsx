import React, { useEffect } from 'react';
import { Box, Text } from 'ink';
import { StatusMessage } from '@inkjs/ui';
import { IterationHeader } from './IterationHeader.js';
import { TaskTitle } from './TaskTitle.js';
import { ActivityFeed } from './ActivityFeed.js';
import { PhaseIndicator } from './PhaseIndicator.js';
import { StatusBar } from './StatusBar.js';
import { CompletedIterationsList } from './CompletedIterationsList.js';
import type { HarnessStreamState } from '../hooks/useHarnessStream.js';
import type { UIIterationResult } from '../lib/types.js';
import { buildFailureContext } from '../lib/failure-context.js';

export interface IterationViewProps {
  state: HarnessStreamState;
  iteration: number;
  totalIterations: number;
  specTaskText: string | null;
  taskNumber: string | null;
  phaseName: string | null;
  completedResults: UIIterationResult[];
  onIterationComplete?: (result: UIIterationResult) => void;
}

/**
 * IterationView renders the UI for a single iteration.
 * Displays header, task title, phase indicator, activity feed, and status bar.
 */
export function IterationView({
  state,
  iteration,
  totalIterations,
  specTaskText,
  taskNumber,
  phaseName,
  completedResults,
  onIterationComplete,
}: IterationViewProps): React.ReactElement {
  const elapsedSeconds = Math.floor(state.elapsedMs / 1000);

  useEffect(() => {
    if (state.phase === 'done' && !state.isRunning && onIterationComplete) {
      onIterationComplete({
        iteration,
        durationMs: state.elapsedMs,
        stats: state.stats,
        error: state.error,
        taskText: state.taskText,
        specTaskText,
        lastCommit: state.lastCommit,
        costUsd: state.result?.totalCostUsd ?? null,
        usage: state.result?.usage ?? null,
        taskNumber,
        phaseName,
        failureContext: state.error ? buildFailureContext(state.toolGroups, state.activityLog) : null,
      });
    }
  }, [state.phase, state.isRunning, iteration, state.elapsedMs, state.stats, state.error, state.taskText, specTaskText, state.lastCommit, state.result, onIterationComplete, taskNumber, phaseName, state.toolGroups, state.activityLog]);

  const isPending = state.phase === 'idle' || !state.taskText;

  return (
    <Box flexDirection="column">
      <CompletedIterationsList results={completedResults} />
      <IterationHeader
        current={iteration}
        total={totalIterations}
        elapsedSeconds={elapsedSeconds}
      />
      <TaskTitle text={state.taskText ?? undefined} isPending={isPending} />
      <PhaseIndicator phase={state.phase} />
      <ActivityFeed activityLog={state.activityLog} />
      {state.error && (
        <Box marginLeft={2}>
          <StatusMessage variant="error">{state.error.message}</StatusMessage>
        </Box>
      )}
      <Box>
        <Text color="cyan">│</Text>
      </Box>
      <StatusBar phase={state.phase} elapsedSeconds={elapsedSeconds} lastCommit={state.lastCommit ?? undefined} />
    </Box>
  );
}
