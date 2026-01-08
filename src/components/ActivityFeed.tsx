import React from 'react';
import { Box, Text } from 'ink';
import type {
  ActivityItem,
  CommitActivity,
} from '../lib/types.js';
import { ELEMENT_COLORS } from '../lib/colors.js';
import { ThoughtItem } from './ThoughtItem.js';
import { ToolStartItem, ToolCompleteItem } from './ToolActivityItem.js';

export interface ActivityFeedProps {
  activityLog: ActivityItem[];
  maxItems?: number;
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
