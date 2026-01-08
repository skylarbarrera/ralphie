import React from 'react';
import { Box, Text } from 'ink';
import type { CommitActivity } from '../lib/types.js';
import { ELEMENT_COLORS } from '../lib/colors.js';

export interface CommitItemProps {
  item: CommitActivity;
}

export function CommitItem({ item }: CommitItemProps): React.ReactElement {
  const shortHash = item.hash.slice(0, 7);

  return (
    <Box>
      <Text color={ELEMENT_COLORS.border}>│ </Text>
      <Text color={ELEMENT_COLORS.success}>✓ </Text>
      <Text color={ELEMENT_COLORS.success}>{shortHash}</Text>
      <Text color={ELEMENT_COLORS.muted}> - </Text>
      <Text color={ELEMENT_COLORS.text}>{item.message}</Text>
    </Box>
  );
}
