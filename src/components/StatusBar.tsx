import React from 'react';
import { Box, Text } from 'ink';
import type { Phase } from '../lib/state-machine.js';
import { formatElapsedTime } from './IterationHeader.js';

export interface StatusBarProps {
  phase: Phase;
  elapsedSeconds: number;
  summary?: string;
}

const PHASE_LABELS: Record<Phase, string> = {
  idle: 'Waiting...',
  reading: 'Reading...',
  editing: 'Editing...',
  running: 'Running...',
  thinking: 'Thinking...',
  done: 'Done',
};

export function getPhaseLabel(phase: Phase): string {
  return PHASE_LABELS[phase];
}

export function StatusBar({ phase, elapsedSeconds, summary }: StatusBarProps): React.ReactElement {
  const phaseLabel = getPhaseLabel(phase);
  const elapsed = formatElapsedTime(elapsedSeconds);
  const displayText = summary ?? `${phaseLabel} (${elapsed})`;
  const minWidth = 50;
  const contentLength = displayText.length + 4;
  const dashCount = Math.max(4, minWidth - contentLength);
  const dashes = '─'.repeat(dashCount);

  return (
    <Box>
      <Text color="cyan">└─ </Text>
      <Text bold color={phase === 'done' ? 'green' : 'white'}>{displayText}</Text>
      <Text color="cyan"> {dashes}</Text>
    </Box>
  );
}
