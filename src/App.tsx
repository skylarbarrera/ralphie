import React from 'react';
import { IterationView } from './components/IterationView.js';
import { useHarnessStream, type HarnessStreamState } from './hooks/useHarnessStream.js';
import type { UIIterationResult } from './lib/types.js';
import type { HarnessName } from './lib/harness/types.js';

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

// Re-export IterationRunner and related components for backward compatibility
export { IterationRunner, type IterationRunnerProps } from './IterationRunner.js';
export { IterationView, type IterationViewProps } from './components/IterationView.js';
