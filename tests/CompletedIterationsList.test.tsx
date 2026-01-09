import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect } from 'vitest';
import { CompletedIterationsList } from '../src/components/CompletedIterationsList.js';
import type { IterationResult } from '../src/App.js';

function createMockResult(overrides: Partial<IterationResult> = {}): IterationResult {
  return {
    iteration: 1,
    durationMs: 5000,
    stats: {
      toolsStarted: 0,
      toolsCompleted: 0,
      toolsErrored: 0,
      reads: 0,
      writes: 0,
      commands: 0,
      metaOps: 0,
    },
    error: null,
    taskText: 'Test task',
    lastCommit: null,
    costUsd: null,
    usage: null,
    ...overrides,
  };
}

describe('CompletedIterationsList', () => {
  describe('rendering', () => {
    it('returns null when no results', () => {
      const { lastFrame } = render(<CompletedIterationsList results={[]} />);
      expect(lastFrame()).toBe('');
    });

    it('shows "Completed:" header when results exist', () => {
      const results = [createMockResult()];
      const { lastFrame } = render(<CompletedIterationsList results={results} />);
      expect(lastFrame()).toContain('Completed:');
    });

    it('shows iteration number', () => {
      const results = [createMockResult({ iteration: 3 })];
      const { lastFrame } = render(<CompletedIterationsList results={results} />);
      expect(lastFrame()).toContain('3.');
    });

    it('shows task text', () => {
      const results = [createMockResult({ taskText: 'Add user authentication' })];
      const { lastFrame } = render(<CompletedIterationsList results={results} />);
      expect(lastFrame()).toContain('Add user authentication');
    });

    it('truncates long task text', () => {
      const longTask = 'This is a very long task description that should be truncated';
      const results = [createMockResult({ taskText: longTask })];
      const { lastFrame } = render(<CompletedIterationsList results={results} />);
      expect(lastFrame()).toContain('...');
      expect(lastFrame()).not.toContain('truncated');
    });

    it('shows success checkmark for successful iteration', () => {
      const results = [createMockResult({ error: null })];
      const { lastFrame } = render(<CompletedIterationsList results={results} />);
      expect(lastFrame()).toContain('✓');
    });

    it('shows error X for failed iteration', () => {
      const results = [createMockResult({ error: new Error('Test error') })];
      const { lastFrame } = render(<CompletedIterationsList results={results} />);
      expect(lastFrame()).toContain('✗');
    });
  });

  describe('duration formatting', () => {
    it('shows seconds for short duration', () => {
      const results = [createMockResult({ durationMs: 30000 })];
      const { lastFrame } = render(<CompletedIterationsList results={results} />);
      expect(lastFrame()).toContain('30s');
    });

    it('shows minutes and seconds for longer duration', () => {
      const results = [createMockResult({ durationMs: 90000 })];
      const { lastFrame } = render(<CompletedIterationsList results={results} />);
      expect(lastFrame()).toContain('1m 30s');
    });
  });

  describe('cost formatting', () => {
    it('shows dash when cost is null', () => {
      const results = [createMockResult({ costUsd: null })];
      const { lastFrame } = render(<CompletedIterationsList results={results} />);
      expect(lastFrame()).toContain('-');
    });

    it('shows <$0.01 for very small cost', () => {
      const results = [createMockResult({ costUsd: 0.005 })];
      const { lastFrame } = render(<CompletedIterationsList results={results} />);
      expect(lastFrame()).toContain('<$0.01');
    });

    it('shows formatted cost for normal cost', () => {
      const results = [createMockResult({ costUsd: 0.15 })];
      const { lastFrame } = render(<CompletedIterationsList results={results} />);
      expect(lastFrame()).toContain('$0.15');
    });

    it('shows cost with two decimal places', () => {
      const results = [createMockResult({ costUsd: 1.5 })];
      const { lastFrame } = render(<CompletedIterationsList results={results} />);
      expect(lastFrame()).toContain('$1.50');
    });
  });

  describe('multiple results', () => {
    it('shows all results in order', () => {
      const results = [
        createMockResult({ iteration: 1, taskText: 'First task' }),
        createMockResult({ iteration: 2, taskText: 'Second task' }),
        createMockResult({ iteration: 3, taskText: 'Third task' }),
      ];
      const { lastFrame } = render(<CompletedIterationsList results={results} />);
      const output = lastFrame() ?? '';
      expect(output).toContain('1.');
      expect(output).toContain('2.');
      expect(output).toContain('3.');
      expect(output).toContain('First task');
      expect(output).toContain('Second task');
      expect(output).toContain('Third task');
    });

    it('renders using Static component for stable output', () => {
      const results = [createMockResult()];
      const { lastFrame } = render(<CompletedIterationsList results={results} />);
      expect(lastFrame()).toContain('Completed:');
      expect(lastFrame()).toContain('✓');
    });
  });

  describe('unknown task', () => {
    it('shows "Unknown task" when taskText is null', () => {
      const results = [createMockResult({ taskText: null })];
      const { lastFrame } = render(<CompletedIterationsList results={results} />);
      expect(lastFrame()).toContain('Unknown task');
    });
  });
});
