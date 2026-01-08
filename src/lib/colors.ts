import type { ToolCategory, ToolState } from './tool-categories.js';

export const COLORS = {
  cyan: 'cyan',
  green: 'green',
  yellow: 'yellow',
  red: 'red',
  magenta: 'magenta',
  gray: 'gray',
  white: 'white',
} as const;

export type Color = (typeof COLORS)[keyof typeof COLORS];

export const ELEMENT_COLORS = {
  border: COLORS.cyan,
  success: COLORS.green,
  warning: COLORS.yellow,
  error: COLORS.red,
  pending: COLORS.cyan,
  text: COLORS.white,
  muted: COLORS.gray,
} as const;

export const CATEGORY_COLORS: Record<ToolCategory, Color> = {
  read: COLORS.cyan,
  write: COLORS.yellow,
  command: COLORS.magenta,
  meta: COLORS.gray,
};

export const STATE_COLORS: Record<ToolState, Color> = {
  active: COLORS.cyan,
  done: COLORS.green,
  error: COLORS.red,
};

export type StatusType = 'success' | 'error' | 'warning' | 'pending' | 'muted';

export function getStatusColor(status: StatusType): Color {
  switch (status) {
    case 'success':
      return ELEMENT_COLORS.success;
    case 'error':
      return ELEMENT_COLORS.error;
    case 'warning':
      return ELEMENT_COLORS.warning;
    case 'pending':
      return ELEMENT_COLORS.pending;
    case 'muted':
      return ELEMENT_COLORS.muted;
  }
}

export function getToolCategoryColor(category: ToolCategory): Color {
  return CATEGORY_COLORS[category];
}

export function getToolStateColor(state: ToolState): Color {
  return STATE_COLORS[state];
}

export function getIconColor(category: ToolCategory, state: ToolState): Color {
  if (state === 'done') return STATE_COLORS.done;
  if (state === 'error') return STATE_COLORS.error;
  return CATEGORY_COLORS[category];
}
