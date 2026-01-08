import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import {
  type ToolCategory,
  getCategoryVerb,
  getToolDisplayName,
} from '../lib/tool-categories.js';
import type { ToolGroup, ActiveTool } from '../lib/state-machine.js';
import { formatDuration } from './ToolItem.js';

export interface ToolListProps {
  toolGroups: ToolGroup[];
  activeTools: ActiveTool[];
}

const CATEGORY_COLORS: Record<ToolCategory, string> = {
  read: 'cyan',
  write: 'yellow',
  command: 'magenta',
  meta: 'gray',
};

function getGroupNoun(category: ToolCategory, count: number): string {
  if (count === 1) {
    switch (category) {
      case 'read':
        return 'file';
      case 'write':
        return 'file';
      case 'command':
        return 'command';
      case 'meta':
        return 'task';
    }
  }
  switch (category) {
    case 'read':
      return 'files';
    case 'write':
      return 'files';
    case 'command':
      return 'commands';
    case 'meta':
      return 'tasks';
  }
}

function CompletedGroup({ group }: { group: ToolGroup }): React.ReactElement {
  const { category, tools, totalDurationMs } = group;
  const count = tools.length;
  const hasErrors = tools.some((t) => t.isError);

  const verb = getCategoryVerb(category);
  const noun = getGroupNoun(category, count);
  const duration = formatDuration(totalDurationMs);

  const icon = hasErrors ? '✗' : '✓';
  const iconColor = hasErrors ? 'red' : 'green';

  const displayText =
    count === 1
      ? `${verb} ${getToolDisplayName(tools[0].name, {})} (${duration})`
      : `${verb} ${count} ${noun} (${duration})`;

  return (
    <Box>
      <Text color="cyan">│ </Text>
      <Text color={iconColor}>{icon}</Text>
      <Text> </Text>
      <Text color={hasErrors ? 'red' : 'white'}>{displayText}</Text>
    </Box>
  );
}

function ActiveToolItem({ tool }: { tool: ActiveTool }): React.ReactElement {
  const { name, category, input } = tool;
  const verb = getCategoryVerb(category);
  const color = CATEGORY_COLORS[category];
  const displayName = getToolDisplayName(name, input);

  return (
    <Box>
      <Text color="cyan">│ </Text>
      <Text color={color}>
        <Spinner type="dots" />
      </Text>
      <Text> </Text>
      <Text>{verb} {displayName}</Text>
    </Box>
  );
}

export function ToolList({ toolGroups, activeTools }: ToolListProps): React.ReactElement | null {
  if (toolGroups.length === 0 && activeTools.length === 0) {
    return null;
  }

  return (
    <Box flexDirection="column">
      {toolGroups.map((group, index) => (
        <CompletedGroup key={`group-${index}`} group={group} />
      ))}
      {activeTools.map((tool) => (
        <ActiveToolItem key={tool.id} tool={tool} />
      ))}
    </Box>
  );
}
