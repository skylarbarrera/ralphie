import React from 'react';
import { Box, Text, Static } from 'ink';
import type { IterationResult } from '../App.js';

export interface CompletedIterationsListProps {
  results: IterationResult[];
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function formatCost(costUsd: number | null): string {
  if (costUsd === null) return '-';
  if (costUsd < 0.01) return '<$0.01';
  return `$${costUsd.toFixed(2)}`;
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

export function CompletedIterationsList({ results }: CompletedIterationsListProps): React.ReactElement | null {
  if (results.length === 0) return null;

  return (
    <Static items={results}>
      {(result, index) => (
        <Box key={result.iteration} flexDirection="column">
          {index === 0 && (
            <Box>
              <Text color="cyan" bold>Completed:</Text>
            </Box>
          )}
          <Box>
            <Text color={result.error ? 'red' : 'green'}>
              {result.error ? '✗' : '✓'}
            </Text>
            <Text color="gray"> {result.iteration}. </Text>
            <Text color="white">
              {truncateText(result.taskText ?? 'Unknown task', 45)}
            </Text>
            <Text color="gray">
              {' '}({formatDuration(result.durationMs)}, {formatCost(result.costUsd)})
            </Text>
          </Box>
        </Box>
      )}
    </Static>
  );
}
