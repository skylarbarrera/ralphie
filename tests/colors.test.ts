import { describe, it, expect } from 'vitest';
import {
  COLORS,
  ELEMENT_COLORS,
  CATEGORY_COLORS,
  STATE_COLORS,
  getStatusColor,
  getToolCategoryColor,
  getToolStateColor,
  getIconColor,
  type Color,
  type StatusType,
} from '../src/lib/colors.js';
import type { ToolCategory, ToolState } from '../src/lib/tool-categories.js';

describe('colors', () => {
  describe('COLORS', () => {
    it('exports all Claude Code colors', () => {
      expect(COLORS.cyan).toBe('cyan');
      expect(COLORS.green).toBe('green');
      expect(COLORS.yellow).toBe('yellow');
      expect(COLORS.red).toBe('red');
      expect(COLORS.magenta).toBe('magenta');
      expect(COLORS.gray).toBe('gray');
      expect(COLORS.white).toBe('white');
    });

    it('has correct number of colors', () => {
      expect(Object.keys(COLORS)).toHaveLength(7);
    });
  });

  describe('ELEMENT_COLORS', () => {
    it('maps UI elements to correct colors', () => {
      expect(ELEMENT_COLORS.border).toBe('cyan');
      expect(ELEMENT_COLORS.success).toBe('green');
      expect(ELEMENT_COLORS.warning).toBe('yellow');
      expect(ELEMENT_COLORS.error).toBe('red');
      expect(ELEMENT_COLORS.pending).toBe('cyan');
      expect(ELEMENT_COLORS.text).toBe('white');
      expect(ELEMENT_COLORS.muted).toBe('gray');
    });
  });

  describe('CATEGORY_COLORS', () => {
    it('maps tool categories to correct colors', () => {
      expect(CATEGORY_COLORS.read).toBe('cyan');
      expect(CATEGORY_COLORS.write).toBe('yellow');
      expect(CATEGORY_COLORS.command).toBe('magenta');
      expect(CATEGORY_COLORS.meta).toBe('gray');
    });

    it('has color for every tool category', () => {
      const categories: ToolCategory[] = ['read', 'write', 'command', 'meta'];
      categories.forEach((category) => {
        expect(CATEGORY_COLORS[category]).toBeDefined();
      });
    });
  });

  describe('STATE_COLORS', () => {
    it('maps tool states to correct colors', () => {
      expect(STATE_COLORS.active).toBe('cyan');
      expect(STATE_COLORS.done).toBe('green');
      expect(STATE_COLORS.error).toBe('red');
    });

    it('has color for every tool state', () => {
      const states: ToolState[] = ['active', 'done', 'error'];
      states.forEach((state) => {
        expect(STATE_COLORS[state]).toBeDefined();
      });
    });
  });

  describe('getStatusColor', () => {
    it('returns green for success', () => {
      expect(getStatusColor('success')).toBe('green');
    });

    it('returns red for error', () => {
      expect(getStatusColor('error')).toBe('red');
    });

    it('returns yellow for warning', () => {
      expect(getStatusColor('warning')).toBe('yellow');
    });

    it('returns cyan for pending', () => {
      expect(getStatusColor('pending')).toBe('cyan');
    });

    it('returns gray for muted', () => {
      expect(getStatusColor('muted')).toBe('gray');
    });

    it('returns correct color for all status types', () => {
      const statuses: StatusType[] = ['success', 'error', 'warning', 'pending', 'muted'];
      statuses.forEach((status) => {
        const color = getStatusColor(status);
        expect(color).toBeDefined();
        expect(typeof color).toBe('string');
      });
    });
  });

  describe('getToolCategoryColor', () => {
    it('returns cyan for read category', () => {
      expect(getToolCategoryColor('read')).toBe('cyan');
    });

    it('returns yellow for write category', () => {
      expect(getToolCategoryColor('write')).toBe('yellow');
    });

    it('returns magenta for command category', () => {
      expect(getToolCategoryColor('command')).toBe('magenta');
    });

    it('returns gray for meta category', () => {
      expect(getToolCategoryColor('meta')).toBe('gray');
    });
  });

  describe('getToolStateColor', () => {
    it('returns cyan for active state', () => {
      expect(getToolStateColor('active')).toBe('cyan');
    });

    it('returns green for done state', () => {
      expect(getToolStateColor('done')).toBe('green');
    });

    it('returns red for error state', () => {
      expect(getToolStateColor('error')).toBe('red');
    });
  });

  describe('getIconColor', () => {
    it('returns green for done state regardless of category', () => {
      const categories: ToolCategory[] = ['read', 'write', 'command', 'meta'];
      categories.forEach((category) => {
        expect(getIconColor(category, 'done')).toBe('green');
      });
    });

    it('returns red for error state regardless of category', () => {
      const categories: ToolCategory[] = ['read', 'write', 'command', 'meta'];
      categories.forEach((category) => {
        expect(getIconColor(category, 'error')).toBe('red');
      });
    });

    it('returns category color for active state', () => {
      expect(getIconColor('read', 'active')).toBe('cyan');
      expect(getIconColor('write', 'active')).toBe('yellow');
      expect(getIconColor('command', 'active')).toBe('magenta');
      expect(getIconColor('meta', 'active')).toBe('gray');
    });
  });
});
