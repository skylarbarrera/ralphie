import React from 'react';
import { Box, Text } from 'ink';
import type { ThoughtActivity } from '../lib/types.js';
import { ELEMENT_COLORS } from '../lib/colors.js';

export interface ThoughtItemProps {
  item: ThoughtActivity;
}

export function ThoughtItem({ item }: ThoughtItemProps): React.ReactElement {
  return (
    <Box>
      <Text color={ELEMENT_COLORS.border}>│ </Text>
      <Text color={ELEMENT_COLORS.text}>● </Text>
      <Text color={ELEMENT_COLORS.text}>{item.text}</Text>
    </Box>
  );
}
