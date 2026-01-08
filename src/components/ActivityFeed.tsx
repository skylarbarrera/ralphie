import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import type {
  ActivityItem,
  ToolStartActivity,
  ToolCompleteActivity,
  CommitActivity,
} from '../lib/types.js';
import { ELEMENT_COLORS, CATEGORY_COLORS } from '../lib/colors.js';
import { getToolCategory } from '../lib/tool-categories.js';
import { formatDuration } from './ToolItem.js';
import { ThoughtItem } from './ThoughtItem.js';

export interface ActivityFeedProps {
  activityLog: ActivityItem[];
  maxItems?: number;
}

function ToolStartItem({ item }: { item: ToolStartActivity }): React.ReactElement {
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

function ToolCompleteItem({ item }: { item: ToolCompleteActivity }): React.ReactElement {
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

function CommitItem({ item }: { item: CommitActivity }): React.ReactElement {
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

function renderActivityItem(item: ActivityItem): React.ReactElement {
  switch (item.type) {
    case 'thought':
      return <ThoughtItem item={item} />;
    case 'tool_start':
      return <ToolStartItem item={item} />;
    case 'tool_complete':
      return <ToolCompleteItem item={item} />;
    case 'commit':
      return <CommitItem item={item} />;
  }
}

export function ActivityFeed({ activityLog, maxItems = 20 }: ActivityFeedProps): React.ReactElement | null {
  if (activityLog.length === 0) {
    return null;
  }

  const displayItems = activityLog.length > maxItems
    ? activityLog.slice(-maxItems)
    : activityLog;

  return (
    <Box flexDirection="column">
      {displayItems.map((item, index) => (
        <Box key={`${item.type}-${item.timestamp}-${index}`}>
          {renderActivityItem(item)}
        </Box>
      ))}
    </Box>
  );
}
