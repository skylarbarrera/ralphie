export type ToolCategory = 'read' | 'write' | 'command' | 'meta';

export type ToolState = 'active' | 'done' | 'error';

export const TOOL_CATEGORIES: Record<string, ToolCategory> = {
  Read: 'read',
  Grep: 'read',
  Glob: 'read',
  WebFetch: 'read',
  WebSearch: 'read',
  LSP: 'read',
  Edit: 'write',
  Write: 'write',
  NotebookEdit: 'write',
  Bash: 'command',
  TodoWrite: 'meta',
  Task: 'meta',
  AskUserQuestion: 'meta',
  EnterPlanMode: 'meta',
  ExitPlanMode: 'meta',
};

export const CATEGORY_ICONS: Record<ToolCategory, string> = {
  read: '◐',
  write: '✎',
  command: '⚡',
  meta: '○',
};

export const STATE_ICONS: Record<ToolState, string> = {
  active: '◐',
  done: '✓',
  error: '✗',
};

export const CATEGORY_VERBS: Record<ToolCategory, string> = {
  read: 'Reading',
  write: 'Editing',
  command: 'Running',
  meta: 'Processing',
};

export function getToolCategory(toolName: string): ToolCategory {
  return TOOL_CATEGORIES[toolName] ?? 'meta';
}

export function getToolIcon(category: ToolCategory, state: ToolState = 'active'): string {
  if (state === 'done') return STATE_ICONS.done;
  if (state === 'error') return STATE_ICONS.error;
  return CATEGORY_ICONS[category];
}

export function getCategoryVerb(category: ToolCategory): string {
  return CATEGORY_VERBS[category];
}

export interface ToolInput {
  file_path?: string;
  command?: string;
  pattern?: string;
  [key: string]: unknown;
}

export function getToolDisplayName(toolName: string, input?: ToolInput): string {
  if (!input) return toolName;
  if (toolName === 'Read' && typeof input.file_path === 'string') {
    return input.file_path.split('/').pop() ?? toolName;
  }
  if (toolName === 'Edit' && typeof input.file_path === 'string') {
    return input.file_path.split('/').pop() ?? toolName;
  }
  if (toolName === 'Write' && typeof input.file_path === 'string') {
    return input.file_path.split('/').pop() ?? toolName;
  }
  if (toolName === 'Bash' && typeof input.command === 'string') {
    const cmd = input.command.split(' ')[0];
    return cmd.length > 20 ? cmd.slice(0, 20) + '...' : cmd;
  }
  if (toolName === 'Glob' && typeof input.pattern === 'string') {
    return input.pattern;
  }
  if (toolName === 'Grep' && typeof input.pattern === 'string') {
    return input.pattern.length > 20 ? input.pattern.slice(0, 20) + '...' : input.pattern;
  }
  return toolName;
}
