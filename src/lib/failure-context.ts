import type { FailureContext, ActivityItem } from './types.js';
import type { ToolGroup } from './state-machine.js';

/**
 * Builds a failure context object from tool groups and activity log.
 * Used to provide detailed error information when an iteration fails.
 *
 * @param toolGroups - Array of tool groups from the state machine
 * @param activityLog - Activity items logged during the iteration
 * @returns FailureContext object with tool info and recent activity, or null if no tools were executed
 */
export function buildFailureContext(
  toolGroups: ToolGroup[],
  activityLog: ActivityItem[]
): FailureContext | null {
  const allTools = toolGroups.flatMap(g => g.tools);
  const lastTool = allTools[allTools.length - 1];
  const errorTool = allTools.find(t => t.isError) ?? lastTool;

  const recentActivity = activityLog
    .slice(-5)
    .map(item => {
      if (item.type === 'thought') return `💭 ${item.text.slice(0, 100)}`;
      if (item.type === 'tool_start') return `▶ ${item.displayName}`;
      if (item.type === 'tool_complete') {
        const icon = item.isError ? '✗' : '✓';
        return `${icon} ${item.displayName} (${(item.durationMs / 1000).toFixed(1)}s)`;
      }
      if (item.type === 'commit') return `📝 ${item.hash.slice(0, 7)} ${item.message}`;
      return '';
    })
    .filter(Boolean);

  return {
    lastToolName: errorTool?.name ?? null,
    lastToolInput: errorTool?.input ? formatToolInput(errorTool.input) : null,
    lastToolOutput: errorTool?.output?.slice(0, 500) ?? null,
    recentActivity,
  };
}

/**
 * Formats tool input for display in failure context.
 * Extracts the most relevant field and truncates to a reasonable length.
 *
 * @param input - Tool input object
 * @returns Formatted string representation of the input
 */
export function formatToolInput(input: Record<string, unknown>): string {
  if (input.command) return `command: ${String(input.command).slice(0, 200)}`;
  if (input.file_path) return `file: ${String(input.file_path)}`;
  if (input.pattern) return `pattern: ${String(input.pattern)}`;
  if (input.prompt) return `prompt: ${String(input.prompt).slice(0, 100)}`;
  return JSON.stringify(input).slice(0, 200);
}
