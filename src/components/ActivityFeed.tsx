import React from 'react';
import { Box } from 'ink';
import type { ActivityItem } from '../lib/types.js';
import { ThoughtItem } from './ThoughtItem.js';
import { ToolStartItem, ToolCompleteItem } from './ToolActivityItem.js';
import { CommitItem } from './CommitItem.js';

export interface ActivityFeedProps {
  activityLog: ActivityItem[];
  maxItems?: number;
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
