import React from 'react';
import { Box, Text } from 'ink';
import type { Phase } from '../lib/state-machine.js';
import type { LastCommit } from '../lib/types.js';
import { formatElapsedTime } from './IterationHeader.js';
import { ELEMENT_COLORS } from '../lib/colors.js';

export interface StatusBarProps {
  phase: Phase;
  elapsedSeconds: number;
  summary?: string;
  lastCommit?: LastCommit | null;
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

export function formatCommitInfo(commit: LastCommit): string {
  const shortHash = commit.hash.slice(0, 7);
  return `${shortHash} - ${commit.message}`;
}

export function StatusBar({ phase, elapsedSeconds, summary, lastCommit }: StatusBarProps): React.ReactElement {
  const phaseLabel = getPhaseLabel(phase);
  const elapsed = formatElapsedTime(elapsedSeconds);
  const displayText = summary ?? `${phaseLabel} (${elapsed})`;
  const minWidth = 50;
  const contentLength = displayText.length + 4;
  const dashCount = Math.max(4, minWidth - contentLength);
  const dashes = '─'.repeat(dashCount);
  const textColor = phase === 'done' ? ELEMENT_COLORS.success : ELEMENT_COLORS.text;

  return (
    <Box flexDirection="column">
      {lastCommit && (
        <Box>
          <Text color={ELEMENT_COLORS.border}>│ </Text>
          <Text color={ELEMENT_COLORS.success}>✓ </Text>
          <Text color={ELEMENT_COLORS.muted}>{formatCommitInfo(lastCommit)}</Text>
        </Box>
      )}
      <Box>
        <Text color={ELEMENT_COLORS.border}>└─ </Text>
        <Text bold color={textColor}>{displayText}</Text>
        <Text color={ELEMENT_COLORS.border}> {dashes}</Text>
      </Box>
    </Box>
  );
}
