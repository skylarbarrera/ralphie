import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { App, IterationRunner, type IterationResult } from '../src/App.js';
import type { ClaudeStreamState } from '../src/hooks/useClaudeStream.js';
import type { Stats } from '../src/lib/state-machine.js';
import type { ActivityItem, LastCommit } from '../src/lib/types.js';

vi.mock('../src/hooks/useClaudeStream.js', () => ({
  useClaudeStream: () => ({
    phase: 'idle',
    taskText: null,
    activeTools: [],
    toolGroups: [],
    stats: {
      toolsStarted: 0,
      toolsCompleted: 0,
      toolsErrored: 0,
      reads: 0,
      writes: 0,
      commands: 0,
      metaOps: 0,
    },
    elapsedMs: 0,
    result: null,
    error: null,
    isRunning: false,
    activityLog: [],
    lastCommit: null,
  }),
}));

function createMockState(overrides: Partial<ClaudeStreamState> = {}): ClaudeStreamState {
  return {
    phase: 'idle',
    taskText: null,
    activeTools: [],
    toolGroups: [],
    stats: {
      toolsStarted: 0,
      toolsCompleted: 0,
      toolsErrored: 0,
      reads: 0,
      writes: 0,
      commands: 0,
      metaOps: 0,
    },
    elapsedMs: 0,
    result: null,
    error: null,
    isRunning: false,
    activityLog: [],
    lastCommit: null,
    ...overrides,
  };
}

describe('App', () => {
  describe('basic rendering', () => {
    it('renders iteration header', () => {
      const { lastFrame } = render(
        <App prompt="test" iteration={1} totalIterations={5} _mockState={createMockState()} />
      );
      const output = lastFrame();
      expect(output).toContain('Iteration 1/5');
      expect(output).toContain('┌─');
    });

    it('renders status bar', () => {
      const { lastFrame } = render(
        <App prompt="test" _mockState={createMockState()} />
      );
      const output = lastFrame();
      expect(output).toContain('└─');
      expect(output).toContain('Waiting...');
    });

    it('renders box-drawing characters for structure', () => {
      const { lastFrame } = render(
        <App prompt="test" _mockState={createMockState()} />
      );
      const output = lastFrame();
      expect(output).toContain('┌');
      expect(output).toContain('│');
      expect(output).toContain('└');
    });
  });

  describe('task text display', () => {
    it('shows task text when available', () => {
      const state = createMockState({
        taskText: 'Implementing JWT authentication',
        phase: 'thinking',
      });
      const { lastFrame } = render(<App prompt="test" _mockState={state} />);
      const output = lastFrame();
      expect(output).toContain('▶');
      expect(output).toContain('Implementing JWT authentication');
    });

    it('handles empty task text', () => {
      const state = createMockState({ taskText: null });
      const { lastFrame } = render(<App prompt="test" _mockState={state} />);
      const output = lastFrame();
      expect(output).not.toContain('▶');
    });
  });

  describe('phase states', () => {
    it('shows idle state', () => {
      const state = createMockState({ phase: 'idle' });
      const { lastFrame } = render(<App prompt="test" _mockState={state} />);
      expect(lastFrame()).toContain('Waiting...');
    });

    it('shows reading state', () => {
      const state = createMockState({ phase: 'reading' });
      const { lastFrame } = render(<App prompt="test" _mockState={state} />);
      expect(lastFrame()).toContain('Reading...');
    });

    it('shows editing state', () => {
      const state = createMockState({ phase: 'editing' });
      const { lastFrame } = render(<App prompt="test" _mockState={state} />);
      expect(lastFrame()).toContain('Editing...');
    });

    it('shows running state', () => {
      const state = createMockState({ phase: 'running' });
      const { lastFrame } = render(<App prompt="test" _mockState={state} />);
      expect(lastFrame()).toContain('Running...');
    });

    it('shows thinking state', () => {
      const state = createMockState({ phase: 'thinking' });
      const { lastFrame } = render(<App prompt="test" _mockState={state} />);
      expect(lastFrame()).toContain('Thinking...');
    });

    it('shows done state', () => {
      const state = createMockState({ phase: 'done' });
      const { lastFrame } = render(<App prompt="test" _mockState={state} />);
      expect(lastFrame()).toContain('Done');
    });
  });

  describe('elapsed time display', () => {
    it('shows elapsed time in header', () => {
      const state = createMockState({ elapsedMs: 42000 });
      const { lastFrame } = render(<App prompt="test" _mockState={state} />);
      expect(lastFrame()).toContain('0:42');
      expect(lastFrame()).toContain('elapsed');
    });

    it('shows minutes and seconds for longer durations', () => {
      const state = createMockState({ elapsedMs: 134000 });
      const { lastFrame } = render(<App prompt="test" _mockState={state} />);
      expect(lastFrame()).toContain('2:14');
    });
  });

  describe('activity feed display', () => {
    it('renders thought items', () => {
      const activityLog: ActivityItem[] = [
        { type: 'thought', timestamp: Date.now(), text: 'Analyzing the codebase' },
      ];
      const state = createMockState({ activityLog, phase: 'thinking' });
      const { lastFrame } = render(<App prompt="test" _mockState={state} />);
      const output = lastFrame();
      expect(output).toContain('●');
      expect(output).toContain('Analyzing the codebase');
    });

    it('renders tool_start items', () => {
      const activityLog: ActivityItem[] = [
        { type: 'tool_start', timestamp: Date.now(), toolUseId: '1', toolName: 'Read', displayName: 'Reading auth.ts' },
      ];
      const state = createMockState({ activityLog, phase: 'reading' });
      const { lastFrame } = render(<App prompt="test" _mockState={state} />);
      const output = lastFrame();
      expect(output).toContain('Reading auth.ts');
    });

    it('renders tool_complete items with duration', () => {
      const activityLog: ActivityItem[] = [
        { type: 'tool_complete', timestamp: Date.now(), toolUseId: '1', toolName: 'Read', displayName: 'Read test.ts', durationMs: 800, isError: false },
      ];
      const state = createMockState({ activityLog, phase: 'thinking' });
      const { lastFrame } = render(<App prompt="test" _mockState={state} />);
      const output = lastFrame();
      expect(output).toContain('✓');
      expect(output).toContain('Read test.ts');
      expect(output).toContain('0.8s');
    });

    it('renders commit items', () => {
      const activityLog: ActivityItem[] = [
        { type: 'commit', timestamp: Date.now(), hash: 'abc1234567890', message: 'feat: add new feature' },
      ];
      const state = createMockState({ activityLog, phase: 'thinking' });
      const { lastFrame } = render(<App prompt="test" _mockState={state} />);
      const output = lastFrame();
      expect(output).toContain('abc1234');
      expect(output).toContain('feat: add new feature');
    });

    it('renders multiple activity items', () => {
      const activityLog: ActivityItem[] = [
        { type: 'thought', timestamp: Date.now(), text: 'Starting implementation' },
        { type: 'tool_complete', timestamp: Date.now(), toolUseId: '1', toolName: 'Read', displayName: 'Read file.ts', durationMs: 500, isError: false },
        { type: 'tool_start', timestamp: Date.now(), toolUseId: '2', toolName: 'Edit', displayName: 'Editing file.ts' },
      ];
      const state = createMockState({ activityLog, phase: 'editing' });
      const { lastFrame } = render(<App prompt="test" _mockState={state} />);
      const output = lastFrame();
      expect(output).toContain('Starting implementation');
      expect(output).toContain('Read file.ts');
      expect(output).toContain('Editing file.ts');
    });
  });

  describe('phase indicator display', () => {
    it('renders phase indicator for idle', () => {
      const state = createMockState({ phase: 'idle' });
      const { lastFrame } = render(<App prompt="test" _mockState={state} />);
      const output = lastFrame();
      expect(output).toContain('○');
      expect(output).toContain('Waiting');
    });

    it('renders phase indicator for reading', () => {
      const state = createMockState({ phase: 'reading' });
      const { lastFrame } = render(<App prompt="test" _mockState={state} />);
      const output = lastFrame();
      expect(output).toContain('◐');
      expect(output).toContain('Reading');
    });

    it('renders phase indicator for editing', () => {
      const state = createMockState({ phase: 'editing' });
      const { lastFrame } = render(<App prompt="test" _mockState={state} />);
      const output = lastFrame();
      expect(output).toContain('✎');
      expect(output).toContain('Editing');
    });

    it('renders phase indicator for done', () => {
      const state = createMockState({ phase: 'done' });
      const { lastFrame } = render(<App prompt="test" _mockState={state} />);
      const output = lastFrame();
      expect(output).toContain('✓');
      expect(output).toContain('Done');
    });
  });

  describe('error display', () => {
    it('shows error message when error is present', () => {
      const state = createMockState({
        error: new Error('Connection timed out'),
        phase: 'done',
      });
      const { lastFrame } = render(<App prompt="test" _mockState={state} />);
      const output = lastFrame();
      expect(output).toContain('✗');
      expect(output).toContain('Error');
      expect(output).toContain('Connection timed out');
    });

    it('does not show error when none present', () => {
      const state = createMockState({ error: null });
      const { lastFrame } = render(<App prompt="test" _mockState={state} />);
      expect(lastFrame()).not.toContain('Error:');
    });
  });

  describe('mixed state', () => {
    it('renders full iteration with activity log and phase indicator', () => {
      const activityLog: ActivityItem[] = [
        { type: 'thought', timestamp: Date.now() - 2000, text: 'Analyzing project structure' },
        { type: 'tool_complete', timestamp: Date.now() - 1500, toolUseId: '1', toolName: 'Read', displayName: 'Read package.json', durationMs: 500, isError: false },
        { type: 'tool_complete', timestamp: Date.now() - 1000, toolUseId: '2', toolName: 'Glob', displayName: 'Found 5 files', durationMs: 300, isError: false },
        { type: 'tool_start', timestamp: Date.now(), toolUseId: '3', toolName: 'Edit', displayName: 'Editing index.ts' },
      ];
      const state = createMockState({
        taskText: 'Adding authentication middleware',
        activityLog,
        phase: 'editing',
        elapsedMs: 42000,
      });

      const { lastFrame } = render(
        <App prompt="test" iteration={2} totalIterations={10} _mockState={state} />
      );
      const output = lastFrame();

      expect(output).toContain('Iteration 2/10');
      expect(output).toContain('Adding authentication middleware');
      expect(output).toContain('Analyzing project structure');
      expect(output).toContain('Read package.json');
      expect(output).toContain('Editing index.ts');
      expect(output).toContain('✎');
    });
  });

  describe('props', () => {
    it('uses default iteration values', () => {
      const { lastFrame } = render(
        <App prompt="test" _mockState={createMockState()} />
      );
      expect(lastFrame()).toContain('Iteration 1/1');
    });

    it('accepts custom iteration values', () => {
      const { lastFrame } = render(
        <App prompt="test" iteration={5} totalIterations={20} _mockState={createMockState()} />
      );
      expect(lastFrame()).toContain('Iteration 5/20');
    });
  });

  describe('onIterationComplete callback', () => {
    it('calls callback when iteration completes', async () => {
      const onComplete = vi.fn();
      const state = createMockState({
        phase: 'done',
        isRunning: false,
        elapsedMs: 5000,
        taskText: 'Test task',
      });
      render(
        <App
          prompt="test"
          iteration={1}
          totalIterations={3}
          _mockState={state}
          onIterationComplete={onComplete}
        />
      );
      await vi.waitFor(() => {
        expect(onComplete).toHaveBeenCalledWith({
          iteration: 1,
          durationMs: 5000,
          stats: expect.any(Object),
          error: null,
          taskText: 'Test task',
          lastCommit: null,
          costUsd: null,
          usage: null,
        });
      });
    });

    it('includes lastCommit in callback when present', async () => {
      const onComplete = vi.fn();
      const lastCommit: LastCommit = { hash: 'abc1234567890', message: 'feat: add feature' };
      const state = createMockState({
        phase: 'done',
        isRunning: false,
        elapsedMs: 5000,
        taskText: 'Test task',
        lastCommit,
      });
      render(
        <App
          prompt="test"
          iteration={1}
          totalIterations={3}
          _mockState={state}
          onIterationComplete={onComplete}
        />
      );
      await vi.waitFor(() => {
        expect(onComplete).toHaveBeenCalledWith({
          iteration: 1,
          durationMs: 5000,
          stats: expect.any(Object),
          error: null,
          taskText: 'Test task',
          lastCommit: { hash: 'abc1234567890', message: 'feat: add feature' },
          costUsd: null,
          usage: null,
        });
      });
    });

    it('does not call callback when not done', () => {
      const onComplete = vi.fn();
      const state = createMockState({
        phase: 'reading',
        isRunning: true,
      });
      render(
        <App
          prompt="test"
          _mockState={state}
          onIterationComplete={onComplete}
        />
      );
      expect(onComplete).not.toHaveBeenCalled();
    });
  });
});

function createMockStats(overrides: Partial<Stats> = {}): Stats {
  return {
    toolsStarted: 0,
    toolsCompleted: 0,
    toolsErrored: 0,
    reads: 0,
    writes: 0,
    commands: 0,
    metaOps: 0,
    ...overrides,
  };
}

function createMockResult(overrides: Partial<IterationResult> = {}): IterationResult {
  return {
    iteration: 1,
    durationMs: 5000,
    stats: createMockStats(),
    error: null,
    taskText: 'Test task',
    lastCommit: null,
    costUsd: null,
    usage: null,
    ...overrides,
  };
}

describe('IterationRunner', () => {
  describe('during iteration', () => {
    it('renders App with correct iteration number', () => {
      const { lastFrame } = render(
        <IterationRunner
          prompt="test"
          totalIterations={5}
          _mockCurrentIteration={2}
          _mockState={createMockState()}
        />
      );
      expect(lastFrame()).toContain('Iteration 2/5');
    });

    it('starts at iteration 1 by default', () => {
      const { lastFrame } = render(
        <IterationRunner
          prompt="test"
          totalIterations={3}
          _mockState={createMockState()}
        />
      );
      expect(lastFrame()).toContain('Iteration 1/3');
    });
  });

  describe('final summary', () => {
    it('shows summary when all iterations complete', () => {
      const results: IterationResult[] = [
        createMockResult({ iteration: 1, durationMs: 3000, taskText: 'Task one' }),
        createMockResult({ iteration: 2, durationMs: 4000, taskText: 'Task two' }),
      ];
      const { lastFrame } = render(
        <IterationRunner
          prompt="test"
          totalIterations={2}
          _mockResults={results}
          _mockIsComplete={true}
        />
      );
      const output = lastFrame();
      expect(output).toContain('All iterations complete');
      expect(output).toContain('2 succeeded');
    });

    it('shows error count when iterations fail', () => {
      const results: IterationResult[] = [
        createMockResult({ iteration: 1, durationMs: 3000 }),
        createMockResult({ iteration: 2, durationMs: 1000, error: new Error('Timeout') }),
      ];
      const { lastFrame } = render(
        <IterationRunner
          prompt="test"
          totalIterations={2}
          _mockResults={results}
          _mockIsComplete={true}
        />
      );
      const output = lastFrame();
      expect(output).toContain('1 succeeded');
      expect(output).toContain('1 failed');
    });

    it('shows total duration', () => {
      const results: IterationResult[] = [
        createMockResult({ durationMs: 30000 }),
        createMockResult({ durationMs: 35000 }),
      ];
      const { lastFrame } = render(
        <IterationRunner
          prompt="test"
          totalIterations={2}
          _mockResults={results}
          _mockIsComplete={true}
        />
      );
      expect(lastFrame()).toContain('1m 5s');
    });

    it('shows aggregated tool stats', () => {
      const results: IterationResult[] = [
        createMockResult({ stats: createMockStats({ reads: 5, writes: 2, commands: 1 }) }),
        createMockResult({ stats: createMockStats({ reads: 3, writes: 1, commands: 2 }) }),
      ];
      const { lastFrame } = render(
        <IterationRunner
          prompt="test"
          totalIterations={2}
          _mockResults={results}
          _mockIsComplete={true}
        />
      );
      const output = lastFrame();
      expect(output).toContain('8 reads');
      expect(output).toContain('3 writes');
      expect(output).toContain('3 commands');
    });

    it('shows per-iteration results list', () => {
      const results: IterationResult[] = [
        createMockResult({ iteration: 1, taskText: 'Implementing auth', durationMs: 5000 }),
        createMockResult({ iteration: 2, taskText: 'Adding tests', durationMs: 3000 }),
      ];
      const { lastFrame } = render(
        <IterationRunner
          prompt="test"
          totalIterations={2}
          _mockResults={results}
          _mockIsComplete={true}
        />
      );
      const output = lastFrame();
      expect(output).toContain('Iteration 1');
      expect(output).toContain('Implementing auth');
      expect(output).toContain('Iteration 2');
      expect(output).toContain('Adding tests');
    });

    it('truncates long task text in results', () => {
      const longTask = 'This is a very long task description that should be truncated for display';
      const results: IterationResult[] = [
        createMockResult({ taskText: longTask }),
      ];
      const { lastFrame } = render(
        <IterationRunner
          prompt="test"
          totalIterations={1}
          _mockResults={results}
          _mockIsComplete={true}
        />
      );
      const output = lastFrame();
      expect(output).toContain('...');
      expect(output).not.toContain(longTask);
    });

    it('handles missing task text gracefully', () => {
      const results: IterationResult[] = [
        createMockResult({ taskText: null }),
      ];
      const { lastFrame } = render(
        <IterationRunner
          prompt="test"
          totalIterations={1}
          _mockResults={results}
          _mockIsComplete={true}
        />
      );
      expect(lastFrame()).toContain('No task');
    });

    it('shows success/error icons per iteration', () => {
      const results: IterationResult[] = [
        createMockResult({ iteration: 1 }),
        createMockResult({ iteration: 2, error: new Error('Failed') }),
      ];
      const { lastFrame } = render(
        <IterationRunner
          prompt="test"
          totalIterations={2}
          _mockResults={results}
          _mockIsComplete={true}
        />
      );
      const output = lastFrame();
      expect(output).toContain('✓');
      expect(output).toContain('✗');
    });

    it('shows commit info for iterations with commits', () => {
      const results: IterationResult[] = [
        createMockResult({
          iteration: 1,
          lastCommit: { hash: 'abc1234567890', message: 'feat: add new feature' },
        }),
      ];
      const { lastFrame } = render(
        <IterationRunner
          prompt="test"
          totalIterations={1}
          _mockResults={results}
          _mockIsComplete={true}
        />
      );
      const output = lastFrame();
      expect(output).toContain('abc1234');
      expect(output).toContain('feat: add new feature');
    });

    it('truncates long commit messages', () => {
      const longMessage = 'feat: this is a very long commit message that should be truncated for display in the summary';
      const results: IterationResult[] = [
        createMockResult({
          iteration: 1,
          lastCommit: { hash: 'abc1234567890', message: longMessage },
        }),
      ];
      const { lastFrame } = render(
        <IterationRunner
          prompt="test"
          totalIterations={1}
          _mockResults={results}
          _mockIsComplete={true}
        />
      );
      const output = lastFrame();
      expect(output).toContain('abc1234');
      expect(output).toContain('...');
      expect(output).not.toContain(longMessage);
    });

    it('does not show commit info when no commit', () => {
      const results: IterationResult[] = [
        createMockResult({ iteration: 1, lastCommit: null }),
      ];
      const { lastFrame } = render(
        <IterationRunner
          prompt="test"
          totalIterations={1}
          _mockResults={results}
          _mockIsComplete={true}
        />
      );
      const output = lastFrame();
      expect(output).toContain('Iteration 1');
      const commitCount = (output?.match(/abc1234/g) || []).length;
      expect(commitCount).toBe(0);
    });
  });

  describe('duration formatting', () => {
    it('formats seconds correctly', () => {
      const results: IterationResult[] = [
        createMockResult({ durationMs: 45000 }),
      ];
      const { lastFrame } = render(
        <IterationRunner
          prompt="test"
          totalIterations={1}
          _mockResults={results}
          _mockIsComplete={true}
        />
      );
      expect(lastFrame()).toContain('45s');
    });

    it('formats minutes and seconds correctly', () => {
      const results: IterationResult[] = [
        createMockResult({ durationMs: 125000 }),
      ];
      const { lastFrame } = render(
        <IterationRunner
          prompt="test"
          totalIterations={1}
          _mockResults={results}
          _mockIsComplete={true}
        />
      );
      expect(lastFrame()).toContain('2m 5s');
    });

    it('formats hours and minutes correctly', () => {
      const results: IterationResult[] = [
        createMockResult({ durationMs: 3900000 }),
      ];
      const { lastFrame } = render(
        <IterationRunner
          prompt="test"
          totalIterations={1}
          _mockResults={results}
          _mockIsComplete={true}
        />
      );
      expect(lastFrame()).toContain('1h 5m');
    });
  });
});
