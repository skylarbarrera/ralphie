import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import type { ToolStartActivity, ToolCompleteActivity } from '../lib/types.js';
import { ELEMENT_COLORS, CATEGORY_COLORS } from '../lib/colors.js';
import { getToolCategory } from '../lib/tool-categories.js';
import { formatDuration } from './ToolItem.js';

export interface ToolStartItemProps {
  item: ToolStartActivity;
}

export function ToolStartItem({ item }: ToolStartItemProps): React.ReactElement {
  const category = getToolCategory(item.toolName);
  const color = CATEGORY_COLORS[category];

  return (
    <Box>
      <Text color={ELEMENT_COLORS.border}>│   </Text>
      <Text color={color}>
        <Spinner type="dots" />
      </Text>
      <Text> </Text>
      <Text color={ELEMENT_COLORS.text}>{item.displayName}</Text>
    </Box>
  );
}

export interface ToolCompleteItemProps {
  item: ToolCompleteActivity;
}

export function ToolCompleteItem({ item }: ToolCompleteItemProps): React.ReactElement {
  const icon = item.isError ? '✗' : '✓';
  const iconColor = item.isError ? ELEMENT_COLORS.error : ELEMENT_COLORS.success;
  const textColor = item.isError ? ELEMENT_COLORS.error : ELEMENT_COLORS.text;
  const duration = formatDuration(item.durationMs);

  return (
    <Box>
      <Text color={ELEMENT_COLORS.border}>│   </Text>
      <Text color={iconColor}>{icon}</Text>
      <Text> </Text>
      <Text color={textColor}>{item.displayName}</Text>
      <Text color={ELEMENT_COLORS.muted}> ({duration})</Text>
    </Box>
  );
}
