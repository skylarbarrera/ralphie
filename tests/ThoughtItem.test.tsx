import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { ThoughtItem } from '../src/components/ThoughtItem.js';
import type { ThoughtActivity } from '../src/lib/types.js';

describe('ThoughtItem', () => {
  describe('basic rendering', () => {
    it('renders thought text', () => {
      const item: ThoughtActivity = {
        type: 'thought',
        timestamp: Date.now(),
        text: 'Analyzing the codebase structure',
      };

      const { lastFrame } = render(<ThoughtItem item={item} />);
      const output = lastFrame();
      expect(output).toContain('Analyzing the codebase structure');
    });

    it('renders bullet prefix', () => {
      const item: ThoughtActivity = {
        type: 'thought',
        timestamp: Date.now(),
        text: 'Test thought',
      };

      const { lastFrame } = render(<ThoughtItem item={item} />);
      const output = lastFrame();
      expect(output).toContain('●');
    });

    it('renders border character', () => {
      const item: ThoughtActivity = {
        type: 'thought',
        timestamp: Date.now(),
        text: 'Test thought',
      };

      const { lastFrame } = render(<ThoughtItem item={item} />);
      const output = lastFrame();
      expect(output).toContain('│');
    });
  });

  describe('text content', () => {
    it('handles empty text', () => {
      const item: ThoughtActivity = {
        type: 'thought',
        timestamp: Date.now(),
        text: '',
      };

      const { lastFrame } = render(<ThoughtItem item={item} />);
      const output = lastFrame();
      expect(output).toContain('│');
      expect(output).toContain('●');
    });

    it('handles long text', () => {
      const longText = 'This is a very long thought that goes on and on and could potentially wrap to multiple lines in a terminal with limited width';
      const item: ThoughtActivity = {
        type: 'thought',
        timestamp: Date.now(),
        text: longText,
      };

      const { lastFrame } = render(<ThoughtItem item={item} />);
      const output = lastFrame() ?? '';
      expect(output).toContain('This is a very long thought');
      expect(output).toContain('limited width');
    });

    it('handles text with special characters', () => {
      const item: ThoughtActivity = {
        type: 'thought',
        timestamp: Date.now(),
        text: 'Checking src/lib/*.ts files',
      };

      const { lastFrame } = render(<ThoughtItem item={item} />);
      const output = lastFrame();
      expect(output).toContain('src/lib/*.ts');
    });

    it('handles text with quotes', () => {
      const item: ThoughtActivity = {
        type: 'thought',
        timestamp: Date.now(),
        text: 'Looking for "main" function',
      };

      const { lastFrame } = render(<ThoughtItem item={item} />);
      const output = lastFrame();
      expect(output).toContain('"main"');
    });
  });

  describe('visual layout', () => {
    it('has border followed by space then bullet', () => {
      const item: ThoughtActivity = {
        type: 'thought',
        timestamp: Date.now(),
        text: 'Test',
      };

      const { lastFrame } = render(<ThoughtItem item={item} />);
      const output = lastFrame() ?? '';
      expect(output).toMatch(/│\s*●/);
    });

    it('has bullet followed by space then text', () => {
      const item: ThoughtActivity = {
        type: 'thought',
        timestamp: Date.now(),
        text: 'My thought',
      };

      const { lastFrame } = render(<ThoughtItem item={item} />);
      const output = lastFrame() ?? '';
      expect(output).toMatch(/●\s+My thought/);
    });
  });

  describe('different timestamps', () => {
    it('renders regardless of timestamp value', () => {
      const item: ThoughtActivity = {
        type: 'thought',
        timestamp: 0,
        text: 'Zero timestamp',
      };

      const { lastFrame } = render(<ThoughtItem item={item} />);
      const output = lastFrame();
      expect(output).toContain('Zero timestamp');
    });

    it('timestamp does not appear in output', () => {
      const timestamp = 1704067200000;
      const item: ThoughtActivity = {
        type: 'thought',
        timestamp,
        text: 'Test thought',
      };

      const { lastFrame } = render(<ThoughtItem item={item} />);
      const output = lastFrame();
      expect(output).not.toContain(String(timestamp));
    });
  });
});
