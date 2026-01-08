import { describe, it, expect } from 'vitest';
import {
  TOOL_CATEGORIES,
  CATEGORY_ICONS,
  STATE_ICONS,
  CATEGORY_VERBS,
  getToolCategory,
  getToolIcon,
  getCategoryVerb,
  getToolDisplayName,
  type ToolCategory,
  type ToolState,
} from '../src/lib/tool-categories.js';

describe('tool-categories', () => {
  describe('TOOL_CATEGORIES', () => {
    it('maps read tools correctly', () => {
      expect(TOOL_CATEGORIES.Read).toBe('read');
      expect(TOOL_CATEGORIES.Grep).toBe('read');
      expect(TOOL_CATEGORIES.Glob).toBe('read');
      expect(TOOL_CATEGORIES.WebFetch).toBe('read');
      expect(TOOL_CATEGORIES.WebSearch).toBe('read');
      expect(TOOL_CATEGORIES.LSP).toBe('read');
    });

    it('maps write tools correctly', () => {
      expect(TOOL_CATEGORIES.Edit).toBe('write');
      expect(TOOL_CATEGORIES.Write).toBe('write');
      expect(TOOL_CATEGORIES.NotebookEdit).toBe('write');
    });

    it('maps command tools correctly', () => {
      expect(TOOL_CATEGORIES.Bash).toBe('command');
    });

    it('maps meta tools correctly', () => {
      expect(TOOL_CATEGORIES.TodoWrite).toBe('meta');
      expect(TOOL_CATEGORIES.Task).toBe('meta');
      expect(TOOL_CATEGORIES.AskUserQuestion).toBe('meta');
      expect(TOOL_CATEGORIES.EnterPlanMode).toBe('meta');
      expect(TOOL_CATEGORIES.ExitPlanMode).toBe('meta');
    });
  });

  describe('CATEGORY_ICONS', () => {
    it('has correct icons for each category', () => {
      expect(CATEGORY_ICONS.read).toBe('◐');
      expect(CATEGORY_ICONS.write).toBe('✎');
      expect(CATEGORY_ICONS.command).toBe('⚡');
      expect(CATEGORY_ICONS.meta).toBe('○');
    });
  });

  describe('STATE_ICONS', () => {
    it('has correct icons for each state', () => {
      expect(STATE_ICONS.active).toBe('◐');
      expect(STATE_ICONS.done).toBe('✓');
      expect(STATE_ICONS.error).toBe('✗');
    });
  });

  describe('CATEGORY_VERBS', () => {
    it('has correct verbs for each category', () => {
      expect(CATEGORY_VERBS.read).toBe('Reading');
      expect(CATEGORY_VERBS.write).toBe('Editing');
      expect(CATEGORY_VERBS.command).toBe('Running');
      expect(CATEGORY_VERBS.meta).toBe('Processing');
    });
  });

  describe('getToolCategory', () => {
    it('returns correct category for known tools', () => {
      expect(getToolCategory('Read')).toBe('read');
      expect(getToolCategory('Edit')).toBe('write');
      expect(getToolCategory('Bash')).toBe('command');
      expect(getToolCategory('TodoWrite')).toBe('meta');
    });

    it('returns meta for unknown tools', () => {
      expect(getToolCategory('UnknownTool')).toBe('meta');
      expect(getToolCategory('RandomName')).toBe('meta');
      expect(getToolCategory('')).toBe('meta');
    });
  });

  describe('getToolIcon', () => {
    it('returns category icon when state is active', () => {
      expect(getToolIcon('read', 'active')).toBe('◐');
      expect(getToolIcon('write', 'active')).toBe('✎');
      expect(getToolIcon('command', 'active')).toBe('⚡');
      expect(getToolIcon('meta', 'active')).toBe('○');
    });

    it('returns done icon regardless of category', () => {
      expect(getToolIcon('read', 'done')).toBe('✓');
      expect(getToolIcon('write', 'done')).toBe('✓');
      expect(getToolIcon('command', 'done')).toBe('✓');
      expect(getToolIcon('meta', 'done')).toBe('✓');
    });

    it('returns error icon regardless of category', () => {
      expect(getToolIcon('read', 'error')).toBe('✗');
      expect(getToolIcon('write', 'error')).toBe('✗');
      expect(getToolIcon('command', 'error')).toBe('✗');
      expect(getToolIcon('meta', 'error')).toBe('✗');
    });

    it('defaults to active state when state is omitted', () => {
      expect(getToolIcon('read')).toBe('◐');
      expect(getToolIcon('write')).toBe('✎');
      expect(getToolIcon('command')).toBe('⚡');
      expect(getToolIcon('meta')).toBe('○');
    });
  });

  describe('getCategoryVerb', () => {
    it('returns correct verb for each category', () => {
      expect(getCategoryVerb('read')).toBe('Reading');
      expect(getCategoryVerb('write')).toBe('Editing');
      expect(getCategoryVerb('command')).toBe('Running');
      expect(getCategoryVerb('meta')).toBe('Processing');
    });
  });

  describe('getToolDisplayName', () => {
    describe('Read tool', () => {
      it('extracts filename from file_path', () => {
        expect(getToolDisplayName('Read', { file_path: '/path/to/file.ts' })).toBe('file.ts');
        expect(getToolDisplayName('Read', { file_path: '/a/b/c/index.js' })).toBe('index.js');
      });

      it('returns tool name when file_path is missing', () => {
        expect(getToolDisplayName('Read', {})).toBe('Read');
      });

      it('handles root-level files', () => {
        expect(getToolDisplayName('Read', { file_path: 'file.ts' })).toBe('file.ts');
      });
    });

    describe('Edit tool', () => {
      it('extracts filename from file_path', () => {
        expect(getToolDisplayName('Edit', { file_path: '/path/to/component.tsx' })).toBe('component.tsx');
      });

      it('returns tool name when file_path is missing', () => {
        expect(getToolDisplayName('Edit', {})).toBe('Edit');
      });
    });

    describe('Write tool', () => {
      it('extracts filename from file_path', () => {
        expect(getToolDisplayName('Write', { file_path: '/new/file.md' })).toBe('file.md');
      });

      it('returns tool name when file_path is missing', () => {
        expect(getToolDisplayName('Write', {})).toBe('Write');
      });
    });

    describe('Bash tool', () => {
      it('extracts first word of command', () => {
        expect(getToolDisplayName('Bash', { command: 'npm install' })).toBe('npm');
        expect(getToolDisplayName('Bash', { command: 'git status' })).toBe('git');
        expect(getToolDisplayName('Bash', { command: 'ls -la' })).toBe('ls');
      });

      it('truncates long command names', () => {
        const longCmd = 'verylongcommandnamethatexceedstwentycharacters';
        expect(getToolDisplayName('Bash', { command: longCmd })).toBe('verylongcommandnamet...');
        expect(getToolDisplayName('Bash', { command: longCmd })).toHaveLength(23);
      });

      it('returns tool name when command is missing', () => {
        expect(getToolDisplayName('Bash', {})).toBe('Bash');
      });
    });

    describe('Glob tool', () => {
      it('returns the pattern', () => {
        expect(getToolDisplayName('Glob', { pattern: '**/*.ts' })).toBe('**/*.ts');
        expect(getToolDisplayName('Glob', { pattern: 'src/**/*.tsx' })).toBe('src/**/*.tsx');
      });

      it('returns tool name when pattern is missing', () => {
        expect(getToolDisplayName('Glob', {})).toBe('Glob');
      });
    });

    describe('Grep tool', () => {
      it('returns the pattern', () => {
        expect(getToolDisplayName('Grep', { pattern: 'TODO' })).toBe('TODO');
        expect(getToolDisplayName('Grep', { pattern: 'function' })).toBe('function');
      });

      it('truncates long patterns at 20 chars plus ellipsis', () => {
        const longPattern = 'verylongpatternthatshouldbetruncated';
        const result = getToolDisplayName('Grep', { pattern: longPattern });
        expect(result).toBe('verylongpatternthats...');
        expect(result).toHaveLength(23);
      });

      it('returns tool name when pattern is missing', () => {
        expect(getToolDisplayName('Grep', {})).toBe('Grep');
      });
    });

    describe('other tools', () => {
      it('returns tool name for tools without special handling', () => {
        expect(getToolDisplayName('TodoWrite', { todos: [] })).toBe('TodoWrite');
        expect(getToolDisplayName('Task', { prompt: 'do something' })).toBe('Task');
        expect(getToolDisplayName('WebFetch', { url: 'http://example.com' })).toBe('WebFetch');
        expect(getToolDisplayName('LSP', { operation: 'hover' })).toBe('LSP');
      });
    });
  });
});
