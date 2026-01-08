import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { ToolStartItem, ToolCompleteItem } from '../src/components/ToolActivityItem.js';
import type { ToolStartActivity, ToolCompleteActivity } from '../src/lib/types.js';

describe('ToolStartItem', () => {
  describe('basic rendering', () => {
    it('renders tool displayName', () => {
      const item: ToolStartActivity = {
        type: 'tool_start',
        timestamp: Date.now(),
        toolUseId: 'tool-123',
        toolName: 'Read',
        displayName: 'Reading src/index.ts',
      };

      const { lastFrame } = render(<ToolStartItem item={item} />);
      const output = lastFrame();
      expect(output).toContain('Reading src/index.ts');
    });

    it('renders border character', () => {
      const item: ToolStartActivity = {
        type: 'tool_start',
        timestamp: Date.now(),
        toolUseId: 'tool-123',
        toolName: 'Read',
        displayName: 'Reading file',
      };

      const { lastFrame } = render(<ToolStartItem item={item} />);
      const output = lastFrame();
      expect(output).toContain('│');
    });

    it('renders spinner indicator', () => {
      const item: ToolStartActivity = {
        type: 'tool_start',
        timestamp: Date.now(),
        toolUseId: 'tool-123',
        toolName: 'Read',
        displayName: 'Reading file',
      };

      const { lastFrame } = render(<ToolStartItem item={item} />);
      const output = lastFrame() ?? '';
      expect(output.length).toBeGreaterThan(0);
    });
  });

  describe('tool categories', () => {
    it('handles read tools', () => {
      const item: ToolStartActivity = {
        type: 'tool_start',
        timestamp: Date.now(),
        toolUseId: 'tool-123',
        toolName: 'Read',
        displayName: 'Reading package.json',
      };

      const { lastFrame } = render(<ToolStartItem item={item} />);
      expect(lastFrame()).toContain('Reading package.json');
    });

    it('handles write tools', () => {
      const item: ToolStartActivity = {
        type: 'tool_start',
        timestamp: Date.now(),
        toolUseId: 'tool-123',
        toolName: 'Edit',
        displayName: 'Editing src/app.ts',
      };

      const { lastFrame } = render(<ToolStartItem item={item} />);
      expect(lastFrame()).toContain('Editing src/app.ts');
    });

    it('handles command tools', () => {
      const item: ToolStartActivity = {
        type: 'tool_start',
        timestamp: Date.now(),
        toolUseId: 'tool-123',
        toolName: 'Bash',
        displayName: 'Running npm test',
      };

      const { lastFrame } = render(<ToolStartItem item={item} />);
      expect(lastFrame()).toContain('Running npm test');
    });

    it('handles meta tools', () => {
      const item: ToolStartActivity = {
        type: 'tool_start',
        timestamp: Date.now(),
        toolUseId: 'tool-123',
        toolName: 'TodoWrite',
        displayName: 'Writing todos',
      };

      const { lastFrame } = render(<ToolStartItem item={item} />);
      expect(lastFrame()).toContain('Writing todos');
    });
  });

  describe('edge cases', () => {
    it('handles empty displayName', () => {
      const item: ToolStartActivity = {
        type: 'tool_start',
        timestamp: Date.now(),
        toolUseId: 'tool-123',
        toolName: 'Read',
        displayName: '',
      };

      const { lastFrame } = render(<ToolStartItem item={item} />);
      const output = lastFrame();
      expect(output).toContain('│');
    });

    it('handles unknown tool names', () => {
      const item: ToolStartActivity = {
        type: 'tool_start',
        timestamp: Date.now(),
        toolUseId: 'tool-123',
        toolName: 'UnknownTool',
        displayName: 'Unknown operation',
      };

      const { lastFrame } = render(<ToolStartItem item={item} />);
      expect(lastFrame()).toContain('Unknown operation');
    });
  });

  describe('visual layout', () => {
    it('has proper indentation with border', () => {
      const item: ToolStartActivity = {
        type: 'tool_start',
        timestamp: Date.now(),
        toolUseId: 'tool-123',
        toolName: 'Read',
        displayName: 'Test',
      };

      const { lastFrame } = render(<ToolStartItem item={item} />);
      const output = lastFrame() ?? '';
      expect(output).toMatch(/│\s+/);
    });
  });
});

describe('ToolCompleteItem', () => {
  describe('success state', () => {
    it('renders checkmark icon for successful completion', () => {
      const item: ToolCompleteActivity = {
        type: 'tool_complete',
        timestamp: Date.now(),
        toolUseId: 'tool-123',
        toolName: 'Read',
        displayName: 'Read src/index.ts',
        durationMs: 150,
        isError: false,
      };

      const { lastFrame } = render(<ToolCompleteItem item={item} />);
      const output = lastFrame();
      expect(output).toContain('✓');
    });

    it('renders displayName', () => {
      const item: ToolCompleteActivity = {
        type: 'tool_complete',
        timestamp: Date.now(),
        toolUseId: 'tool-123',
        toolName: 'Read',
        displayName: 'Read package.json',
        durationMs: 200,
        isError: false,
      };

      const { lastFrame } = render(<ToolCompleteItem item={item} />);
      expect(lastFrame()).toContain('Read package.json');
    });

    it('renders duration in seconds', () => {
      const item: ToolCompleteActivity = {
        type: 'tool_complete',
        timestamp: Date.now(),
        toolUseId: 'tool-123',
        toolName: 'Read',
        displayName: 'Read file',
        durationMs: 1500,
        isError: false,
      };

      const { lastFrame } = render(<ToolCompleteItem item={item} />);
      expect(lastFrame()).toContain('1.5s');
    });

    it('renders border character', () => {
      const item: ToolCompleteActivity = {
        type: 'tool_complete',
        timestamp: Date.now(),
        toolUseId: 'tool-123',
        toolName: 'Read',
        displayName: 'Read file',
        durationMs: 100,
        isError: false,
      };

      const { lastFrame } = render(<ToolCompleteItem item={item} />);
      expect(lastFrame()).toContain('│');
    });
  });

  describe('error state', () => {
    it('renders error icon for failed completion', () => {
      const item: ToolCompleteActivity = {
        type: 'tool_complete',
        timestamp: Date.now(),
        toolUseId: 'tool-123',
        toolName: 'Bash',
        displayName: 'Ran npm test',
        durationMs: 5000,
        isError: true,
      };

      const { lastFrame } = render(<ToolCompleteItem item={item} />);
      expect(lastFrame()).toContain('✗');
    });

    it('does not show checkmark for errors', () => {
      const item: ToolCompleteActivity = {
        type: 'tool_complete',
        timestamp: Date.now(),
        toolUseId: 'tool-123',
        toolName: 'Bash',
        displayName: 'Ran command',
        durationMs: 100,
        isError: true,
      };

      const { lastFrame } = render(<ToolCompleteItem item={item} />);
      expect(lastFrame()).not.toContain('✓');
    });

    it('still shows duration for errors', () => {
      const item: ToolCompleteActivity = {
        type: 'tool_complete',
        timestamp: Date.now(),
        toolUseId: 'tool-123',
        toolName: 'Bash',
        displayName: 'Failed command',
        durationMs: 2500,
        isError: true,
      };

      const { lastFrame } = render(<ToolCompleteItem item={item} />);
      expect(lastFrame()).toContain('2.5s');
    });
  });

  describe('duration formatting', () => {
    it('formats sub-second durations', () => {
      const item: ToolCompleteActivity = {
        type: 'tool_complete',
        timestamp: Date.now(),
        toolUseId: 'tool-123',
        toolName: 'Read',
        displayName: 'Read file',
        durationMs: 50,
        isError: false,
      };

      const { lastFrame } = render(<ToolCompleteItem item={item} />);
      expect(lastFrame()).toContain('0.1s');
    });

    it('formats multi-second durations', () => {
      const item: ToolCompleteActivity = {
        type: 'tool_complete',
        timestamp: Date.now(),
        toolUseId: 'tool-123',
        toolName: 'Bash',
        displayName: 'Ran build',
        durationMs: 15000,
        isError: false,
      };

      const { lastFrame } = render(<ToolCompleteItem item={item} />);
      expect(lastFrame()).toContain('15.0s');
    });

    it('formats zero duration', () => {
      const item: ToolCompleteActivity = {
        type: 'tool_complete',
        timestamp: Date.now(),
        toolUseId: 'tool-123',
        toolName: 'Read',
        displayName: 'Read file',
        durationMs: 0,
        isError: false,
      };

      const { lastFrame } = render(<ToolCompleteItem item={item} />);
      expect(lastFrame()).toContain('0.0s');
    });
  });

  describe('edge cases', () => {
    it('handles empty displayName', () => {
      const item: ToolCompleteActivity = {
        type: 'tool_complete',
        timestamp: Date.now(),
        toolUseId: 'tool-123',
        toolName: 'Read',
        displayName: '',
        durationMs: 100,
        isError: false,
      };

      const { lastFrame } = render(<ToolCompleteItem item={item} />);
      const output = lastFrame();
      expect(output).toContain('✓');
      expect(output).toContain('0.1s');
    });

    it('handles long displayName', () => {
      const longName = 'Read a very long file path that extends beyond typical terminal width limits src/components/deeply/nested/folder/structure/file.tsx';
      const item: ToolCompleteActivity = {
        type: 'tool_complete',
        timestamp: Date.now(),
        toolUseId: 'tool-123',
        toolName: 'Read',
        displayName: longName,
        durationMs: 200,
        isError: false,
      };

      const { lastFrame } = render(<ToolCompleteItem item={item} />);
      expect(lastFrame()).toContain('deeply/nested');
    });

    it('handles special characters in displayName', () => {
      const item: ToolCompleteActivity = {
        type: 'tool_complete',
        timestamp: Date.now(),
        toolUseId: 'tool-123',
        toolName: 'Grep',
        displayName: 'Searched for "async function"',
        durationMs: 300,
        isError: false,
      };

      const { lastFrame } = render(<ToolCompleteItem item={item} />);
      expect(lastFrame()).toContain('"async function"');
    });
  });

  describe('visual layout', () => {
    it('has proper indentation with border', () => {
      const item: ToolCompleteActivity = {
        type: 'tool_complete',
        timestamp: Date.now(),
        toolUseId: 'tool-123',
        toolName: 'Read',
        displayName: 'Test',
        durationMs: 100,
        isError: false,
      };

      const { lastFrame } = render(<ToolCompleteItem item={item} />);
      const output = lastFrame() ?? '';
      expect(output).toMatch(/│\s+/);
    });

    it('has duration in parentheses', () => {
      const item: ToolCompleteActivity = {
        type: 'tool_complete',
        timestamp: Date.now(),
        toolUseId: 'tool-123',
        toolName: 'Read',
        displayName: 'Read file',
        durationMs: 1000,
        isError: false,
      };

      const { lastFrame } = render(<ToolCompleteItem item={item} />);
      expect(lastFrame()).toContain('(1.0s)');
    });
  });
});
