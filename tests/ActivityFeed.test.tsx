import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { ActivityFeed } from '../src/components/ActivityFeed.js';
import type {
  ActivityItem,
  ThoughtActivity,
  ToolStartActivity,
  ToolCompleteActivity,
  CommitActivity,
} from '../src/lib/types.js';

describe('ActivityFeed', () => {
  describe('empty state', () => {
    it('returns null when activity log is empty', () => {
      const { lastFrame } = render(<ActivityFeed activityLog={[]} />);
      expect(lastFrame()).toBe('');
    });
  });

  describe('thought items', () => {
    it('renders thought with bullet prefix', () => {
      const activity: ThoughtActivity = {
        type: 'thought',
        timestamp: Date.now(),
        text: 'Analyzing the codebase structure',
      };

      const { lastFrame } = render(<ActivityFeed activityLog={[activity]} />);
      const output = lastFrame();
      expect(output).toContain('│');
      expect(output).toContain('●');
      expect(output).toContain('Analyzing the codebase structure');
    });

    it('renders multiple thoughts', () => {
      const activities: ThoughtActivity[] = [
        { type: 'thought', timestamp: 1000, text: 'First thought' },
        { type: 'thought', timestamp: 2000, text: 'Second thought' },
      ];

      const { lastFrame } = render(<ActivityFeed activityLog={activities} />);
      const output = lastFrame();
      expect(output).toContain('First thought');
      expect(output).toContain('Second thought');
    });
  });

  describe('tool_start items', () => {
    it('renders tool_start with spinner', () => {
      const activity: ToolStartActivity = {
        type: 'tool_start',
        timestamp: Date.now(),
        toolUseId: '123',
        toolName: 'Read',
        displayName: 'Reading package.json',
      };

      const { lastFrame } = render(<ActivityFeed activityLog={[activity]} />);
      const output = lastFrame();
      expect(output).toContain('│');
      expect(output).toContain('Reading package.json');
    });

    it('renders multiple tool_start items', () => {
      const activities: ToolStartActivity[] = [
        { type: 'tool_start', timestamp: 1000, toolUseId: '1', toolName: 'Read', displayName: 'Reading file1.ts' },
        { type: 'tool_start', timestamp: 2000, toolUseId: '2', toolName: 'Edit', displayName: 'Editing file2.ts' },
      ];

      const { lastFrame } = render(<ActivityFeed activityLog={activities} />);
      const output = lastFrame();
      expect(output).toContain('Reading file1.ts');
      expect(output).toContain('Editing file2.ts');
    });
  });

  describe('tool_complete items', () => {
    it('renders successful tool_complete with checkmark', () => {
      const activity: ToolCompleteActivity = {
        type: 'tool_complete',
        timestamp: Date.now(),
        toolUseId: '123',
        toolName: 'Read',
        displayName: 'Read package.json',
        durationMs: 850,
        isError: false,
      };

      const { lastFrame } = render(<ActivityFeed activityLog={[activity]} />);
      const output = lastFrame();
      expect(output).toContain('│');
      expect(output).toContain('✓');
      expect(output).toContain('Read package.json');
      expect(output).toContain('(0.8s)');
    });

    it('renders error tool_complete with error icon', () => {
      const activity: ToolCompleteActivity = {
        type: 'tool_complete',
        timestamp: Date.now(),
        toolUseId: '123',
        toolName: 'Read',
        displayName: 'Read missing.ts',
        durationMs: 200,
        isError: true,
      };

      const { lastFrame } = render(<ActivityFeed activityLog={[activity]} />);
      const output = lastFrame();
      expect(output).toContain('✗');
      expect(output).toContain('Read missing.ts');
      expect(output).toContain('(0.2s)');
    });

    it('formats duration correctly', () => {
      const activity: ToolCompleteActivity = {
        type: 'tool_complete',
        timestamp: Date.now(),
        toolUseId: '123',
        toolName: 'Bash',
        displayName: 'Ran npm test',
        durationMs: 4500,
        isError: false,
      };

      const { lastFrame } = render(<ActivityFeed activityLog={[activity]} />);
      const output = lastFrame();
      expect(output).toContain('(4.5s)');
    });
  });

  describe('commit items', () => {
    it('renders commit with success icon and short hash', () => {
      const activity: CommitActivity = {
        type: 'commit',
        timestamp: Date.now(),
        hash: 'a1b2c3d4e5f6g7h8',
        message: 'feat(auth): add JWT authentication',
      };

      const { lastFrame } = render(<ActivityFeed activityLog={[activity]} />);
      const output = lastFrame();
      expect(output).toContain('│');
      expect(output).toContain('✓');
      expect(output).toContain('a1b2c3d');
      expect(output).toContain('-');
      expect(output).toContain('feat(auth): add JWT authentication');
    });

    it('truncates hash to 7 characters', () => {
      const activity: CommitActivity = {
        type: 'commit',
        timestamp: Date.now(),
        hash: 'abcdef1234567890abcdef1234567890abcdef12',
        message: 'test commit',
      };

      const { lastFrame } = render(<ActivityFeed activityLog={[activity]} />);
      const output = lastFrame();
      expect(output).toContain('abcdef1');
      expect(output).not.toContain('abcdef1234567890');
    });
  });

  describe('maxItems limit', () => {
    it('shows all items when under maxItems limit', () => {
      const activities: ActivityItem[] = [
        { type: 'thought', timestamp: 1000, text: 'First' },
        { type: 'thought', timestamp: 2000, text: 'Second' },
        { type: 'thought', timestamp: 3000, text: 'Third' },
      ];

      const { lastFrame } = render(<ActivityFeed activityLog={activities} maxItems={5} />);
      const output = lastFrame();
      expect(output).toContain('First');
      expect(output).toContain('Second');
      expect(output).toContain('Third');
    });

    it('shows only last N items when over maxItems limit', () => {
      const activities: ActivityItem[] = [
        { type: 'thought', timestamp: 1000, text: 'First' },
        { type: 'thought', timestamp: 2000, text: 'Second' },
        { type: 'thought', timestamp: 3000, text: 'Third' },
        { type: 'thought', timestamp: 4000, text: 'Fourth' },
        { type: 'thought', timestamp: 5000, text: 'Fifth' },
      ];

      const { lastFrame } = render(<ActivityFeed activityLog={activities} maxItems={3} />);
      const output = lastFrame();
      expect(output).not.toContain('First');
      expect(output).not.toContain('Second');
      expect(output).toContain('Third');
      expect(output).toContain('Fourth');
      expect(output).toContain('Fifth');
    });

    it('uses default maxItems of 20', () => {
      const activities: ActivityItem[] = Array.from({ length: 25 }, (_, i) => ({
        type: 'thought' as const,
        timestamp: i * 1000,
        text: `Entry_${String(i + 1).padStart(2, '0')}`,
      }));

      const { lastFrame } = render(<ActivityFeed activityLog={activities} />);
      const output = lastFrame();
      expect(output).not.toContain('Entry_01');
      expect(output).not.toContain('Entry_05');
      expect(output).toContain('Entry_06');
      expect(output).toContain('Entry_25');
    });
  });

  describe('mixed activity types', () => {
    it('renders all activity types in sequence', () => {
      const activities: ActivityItem[] = [
        { type: 'thought', timestamp: 1000, text: 'Analyzing the task' },
        { type: 'tool_start', timestamp: 2000, toolUseId: '1', toolName: 'Read', displayName: 'Reading SPEC.md' },
        { type: 'tool_complete', timestamp: 3000, toolUseId: '1', toolName: 'Read', displayName: 'Read SPEC.md', durationMs: 800, isError: false },
        { type: 'commit', timestamp: 4000, hash: 'abc1234', message: 'Initial commit' },
      ];

      const { lastFrame } = render(<ActivityFeed activityLog={activities} />);
      const output = lastFrame();
      expect(output).toContain('●');
      expect(output).toContain('Analyzing the task');
      expect(output).toContain('Reading SPEC.md');
      expect(output).toContain('✓');
      expect(output).toContain('Read SPEC.md');
      expect(output).toContain('abc1234');
      expect(output).toContain('Initial commit');
    });
  });

  describe('box-drawing prefix', () => {
    it('all rows have box-drawing character', () => {
      const activities: ActivityItem[] = [
        { type: 'thought', timestamp: 1000, text: 'Test thought' },
        { type: 'tool_complete', timestamp: 2000, toolUseId: '1', toolName: 'Read', displayName: 'Read file', durationMs: 100, isError: false },
        { type: 'commit', timestamp: 3000, hash: 'abc1234', message: 'Test commit' },
      ];

      const { lastFrame } = render(<ActivityFeed activityLog={activities} />);
      const lines = lastFrame()?.split('\n') ?? [];
      for (const line of lines) {
        if (line.trim()) {
          expect(line).toContain('│');
        }
      }
    });
  });
});
