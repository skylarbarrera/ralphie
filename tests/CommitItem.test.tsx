import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { CommitItem } from '../src/components/CommitItem.js';
import type { CommitActivity } from '../src/lib/types.js';

describe('CommitItem', () => {
  describe('basic rendering', () => {
    it('renders commit hash and message', () => {
      const item: CommitActivity = {
        type: 'commit',
        timestamp: Date.now(),
        hash: 'a1b2c3d4e5f6789',
        message: 'feat(auth): add JWT authentication',
      };

      const { lastFrame } = render(<CommitItem item={item} />);
      const output = lastFrame();
      expect(output).toContain('a1b2c3d');
      expect(output).toContain('feat(auth): add JWT authentication');
    });

    it('renders checkmark icon', () => {
      const item: CommitActivity = {
        type: 'commit',
        timestamp: Date.now(),
        hash: 'abc1234',
        message: 'Test commit',
      };

      const { lastFrame } = render(<CommitItem item={item} />);
      const output = lastFrame();
      expect(output).toContain('✓');
    });

    it('renders border character', () => {
      const item: CommitActivity = {
        type: 'commit',
        timestamp: Date.now(),
        hash: 'abc1234',
        message: 'Test commit',
      };

      const { lastFrame } = render(<CommitItem item={item} />);
      const output = lastFrame();
      expect(output).toContain('│');
    });
  });

  describe('hash truncation', () => {
    it('truncates long hash to 7 characters', () => {
      const item: CommitActivity = {
        type: 'commit',
        timestamp: Date.now(),
        hash: 'a1b2c3d4e5f6789012345678901234567890',
        message: 'Long hash commit',
      };

      const { lastFrame } = render(<CommitItem item={item} />);
      const output = lastFrame() ?? '';
      expect(output).toContain('a1b2c3d');
      expect(output).not.toContain('a1b2c3d4e5f');
    });

    it('handles exactly 7 character hash', () => {
      const item: CommitActivity = {
        type: 'commit',
        timestamp: Date.now(),
        hash: 'abc1234',
        message: 'Short hash',
      };

      const { lastFrame } = render(<CommitItem item={item} />);
      const output = lastFrame();
      expect(output).toContain('abc1234');
    });

    it('handles hash shorter than 7 characters', () => {
      const item: CommitActivity = {
        type: 'commit',
        timestamp: Date.now(),
        hash: 'abc',
        message: 'Very short hash',
      };

      const { lastFrame } = render(<CommitItem item={item} />);
      const output = lastFrame();
      expect(output).toContain('abc');
    });
  });

  describe('message content', () => {
    it('handles empty message', () => {
      const item: CommitActivity = {
        type: 'commit',
        timestamp: Date.now(),
        hash: 'abc1234',
        message: '',
      };

      const { lastFrame } = render(<CommitItem item={item} />);
      const output = lastFrame();
      expect(output).toContain('│');
      expect(output).toContain('✓');
      expect(output).toContain('abc1234');
    });

    it('handles long message', () => {
      const longMessage = 'feat(auth): implement JWT authentication with refresh tokens, session management, and proper CORS handling for secure API access';
      const item: CommitActivity = {
        type: 'commit',
        timestamp: Date.now(),
        hash: 'abc1234',
        message: longMessage,
      };

      const { lastFrame } = render(<CommitItem item={item} />);
      const output = lastFrame() ?? '';
      expect(output).toContain('feat(auth): implement JWT');
      expect(output).toContain('secure API access');
    });

    it('handles message with special characters', () => {
      const item: CommitActivity = {
        type: 'commit',
        timestamp: Date.now(),
        hash: 'abc1234',
        message: 'fix(api): handle null response from /users endpoint',
      };

      const { lastFrame } = render(<CommitItem item={item} />);
      const output = lastFrame();
      expect(output).toContain('/users');
    });

    it('handles message with quotes', () => {
      const item: CommitActivity = {
        type: 'commit',
        timestamp: Date.now(),
        hash: 'abc1234',
        message: 'fix: handle "undefined" error in parser',
      };

      const { lastFrame } = render(<CommitItem item={item} />);
      const output = lastFrame();
      expect(output).toContain('"undefined"');
    });
  });

  describe('visual layout', () => {
    it('has border followed by space then checkmark', () => {
      const item: CommitActivity = {
        type: 'commit',
        timestamp: Date.now(),
        hash: 'abc1234',
        message: 'Test',
      };

      const { lastFrame } = render(<CommitItem item={item} />);
      const output = lastFrame() ?? '';
      expect(output).toMatch(/│\s*✓/);
    });

    it('has checkmark followed by hash', () => {
      const item: CommitActivity = {
        type: 'commit',
        timestamp: Date.now(),
        hash: 'abc1234',
        message: 'Test',
      };

      const { lastFrame } = render(<CommitItem item={item} />);
      const output = lastFrame() ?? '';
      expect(output).toMatch(/✓\s+abc1234/);
    });

    it('has dash separator between hash and message', () => {
      const item: CommitActivity = {
        type: 'commit',
        timestamp: Date.now(),
        hash: 'abc1234',
        message: 'My commit',
      };

      const { lastFrame } = render(<CommitItem item={item} />);
      const output = lastFrame() ?? '';
      expect(output).toMatch(/abc1234\s+-\s+My commit/);
    });
  });

  describe('different timestamps', () => {
    it('renders regardless of timestamp value', () => {
      const item: CommitActivity = {
        type: 'commit',
        timestamp: 0,
        hash: 'abc1234',
        message: 'Zero timestamp',
      };

      const { lastFrame } = render(<CommitItem item={item} />);
      const output = lastFrame();
      expect(output).toContain('Zero timestamp');
    });

    it('timestamp does not appear in output', () => {
      const timestamp = 1704067200000;
      const item: CommitActivity = {
        type: 'commit',
        timestamp,
        hash: 'abc1234',
        message: 'Test commit',
      };

      const { lastFrame } = render(<CommitItem item={item} />);
      const output = lastFrame();
      expect(output).not.toContain(String(timestamp));
    });
  });

  describe('conventional commit formats', () => {
    it('renders feat commit type', () => {
      const item: CommitActivity = {
        type: 'commit',
        timestamp: Date.now(),
        hash: 'abc1234',
        message: 'feat: add new feature',
      };

      const { lastFrame } = render(<CommitItem item={item} />);
      const output = lastFrame();
      expect(output).toContain('feat: add new feature');
    });

    it('renders fix commit type', () => {
      const item: CommitActivity = {
        type: 'commit',
        timestamp: Date.now(),
        hash: 'abc1234',
        message: 'fix: resolve bug',
      };

      const { lastFrame } = render(<CommitItem item={item} />);
      const output = lastFrame();
      expect(output).toContain('fix: resolve bug');
    });

    it('renders scoped commit', () => {
      const item: CommitActivity = {
        type: 'commit',
        timestamp: Date.now(),
        hash: 'abc1234',
        message: 'refactor(parser): simplify logic',
      };

      const { lastFrame } = render(<CommitItem item={item} />);
      const output = lastFrame();
      expect(output).toContain('refactor(parser): simplify logic');
    });
  });
});
