import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  StateMachine,
  createStateMachine,
  isGitCommitCommand,
  parseGitCommitOutput,
  type Phase,
  type ToolCategory,
} from '../src/lib/state-machine.js';
import type {
  ToolStartEvent,
  ToolEndEvent,
  TextEvent,
  ResultEvent,
  ThoughtActivity,
  ToolStartActivity,
  ToolCompleteActivity,
  CommitActivity,
} from '../src/lib/types.js';

describe('StateMachine', () => {
  let sm: StateMachine;

  beforeEach(() => {
    sm = createStateMachine(1, 5);
  });

  describe('initial state', () => {
    it('starts with correct initial values', () => {
      const state = sm.getState();

      expect(state.iteration).toBe(1);
      expect(state.totalIterations).toBe(5);
      expect(state.phase).toBe('idle');
      expect(state.taskText).toBeNull();
      expect(state.activeTools.size).toBe(0);
      expect(state.completedTools).toHaveLength(0);
      expect(state.toolGroups).toHaveLength(0);
      expect(state.result).toBeNull();
      expect(state.activityLog).toHaveLength(0);
      expect(state.lastCommit).toBeNull();
    });

    it('starts with zero stats', () => {
      const state = sm.getState();

      expect(state.stats.toolsStarted).toBe(0);
      expect(state.stats.toolsCompleted).toBe(0);
      expect(state.stats.toolsErrored).toBe(0);
      expect(state.stats.reads).toBe(0);
      expect(state.stats.writes).toBe(0);
      expect(state.stats.commands).toBe(0);
      expect(state.stats.metaOps).toBe(0);
    });

    it('records startTime close to now', () => {
      const before = Date.now();
      const newSm = createStateMachine();
      const after = Date.now();

      expect(newSm.getState().startTime).toBeGreaterThanOrEqual(before);
      expect(newSm.getState().startTime).toBeLessThanOrEqual(after);
    });
  });

  describe('handleText', () => {
    it('sets taskText from first text event', () => {
      const event: TextEvent = { type: 'text', text: 'Working on your task...' };
      sm.handleText(event);

      expect(sm.getState().taskText).toBe('Working on your task...');
    });

    it('trims and truncates taskText to 100 chars', () => {
      const longText = '  ' + 'a'.repeat(150) + '  ';
      sm.handleText({ type: 'text', text: longText });

      expect(sm.getState().taskText).toHaveLength(100);
      expect(sm.getState().taskText).toBe('a'.repeat(100));
    });

    it('does not overwrite taskText on subsequent text events', () => {
      sm.handleText({ type: 'text', text: 'First message' });
      sm.handleText({ type: 'text', text: 'Second message' });

      expect(sm.getState().taskText).toBe('First message');
    });

    it('transitions from idle to thinking', () => {
      expect(sm.getState().phase).toBe('idle');
      sm.handleText({ type: 'text', text: 'Hello' });
      expect(sm.getState().phase).toBe('thinking');
    });

    it('adds thought to activity log', () => {
      sm.handleText({ type: 'text', text: 'Working on task' });

      const log = sm.getState().activityLog;
      expect(log).toHaveLength(1);
      expect(log[0].type).toBe('thought');
      const thought = log[0] as ThoughtActivity;
      expect(thought.text).toBe('Working on task');
      expect(thought.timestamp).toBeGreaterThan(0);
    });

    it('adds multiple thoughts to activity log', () => {
      sm.handleText({ type: 'text', text: 'First thought' });
      sm.handleText({ type: 'text', text: 'Second thought' });

      const log = sm.getState().activityLog;
      expect(log).toHaveLength(2);
      expect((log[0] as ThoughtActivity).text).toBe('First thought');
      expect((log[1] as ThoughtActivity).text).toBe('Second thought');
    });

    it('does not add empty text to activity log', () => {
      sm.handleText({ type: 'text', text: '   ' });

      const log = sm.getState().activityLog;
      expect(log).toHaveLength(0);
    });
  });

  describe('handleToolStart', () => {
    it('adds tool to activeTools', () => {
      const event: ToolStartEvent = {
        type: 'tool_start',
        toolUseId: 'tool-1',
        toolName: 'Read',
        input: { file_path: '/path/to/file.ts' },
      };
      sm.handleToolStart(event);

      const active = sm.getState().activeTools;
      expect(active.size).toBe(1);
      expect(active.get('tool-1')).toMatchObject({
        id: 'tool-1',
        name: 'Read',
        category: 'read',
        input: { file_path: '/path/to/file.ts' },
      });
    });

    it('increments toolsStarted stat', () => {
      sm.handleToolStart({ type: 'tool_start', toolUseId: 't1', toolName: 'Read', input: {} });
      sm.handleToolStart({ type: 'tool_start', toolUseId: 't2', toolName: 'Edit', input: {} });

      expect(sm.getState().stats.toolsStarted).toBe(2);
    });

    it('transitions phase based on tool category', () => {
      sm.handleToolStart({ type: 'tool_start', toolUseId: 't1', toolName: 'Read', input: {} });
      expect(sm.getState().phase).toBe('reading');

      sm = createStateMachine();
      sm.handleToolStart({ type: 'tool_start', toolUseId: 't2', toolName: 'Edit', input: {} });
      expect(sm.getState().phase).toBe('editing');

      sm = createStateMachine();
      sm.handleToolStart({ type: 'tool_start', toolUseId: 't3', toolName: 'Bash', input: {} });
      expect(sm.getState().phase).toBe('running');

      sm = createStateMachine();
      sm.handleToolStart({ type: 'tool_start', toolUseId: 't4', toolName: 'TodoWrite', input: {} });
      expect(sm.getState().phase).toBe('thinking');
    });

    it('categorizes tools correctly', () => {
      const toolTests: Array<{ name: string; expected: ToolCategory }> = [
        { name: 'Read', expected: 'read' },
        { name: 'Grep', expected: 'read' },
        { name: 'Glob', expected: 'read' },
        { name: 'WebFetch', expected: 'read' },
        { name: 'WebSearch', expected: 'read' },
        { name: 'LSP', expected: 'read' },
        { name: 'Edit', expected: 'write' },
        { name: 'Write', expected: 'write' },
        { name: 'NotebookEdit', expected: 'write' },
        { name: 'Bash', expected: 'command' },
        { name: 'TodoWrite', expected: 'meta' },
        { name: 'Task', expected: 'meta' },
        { name: 'UnknownTool', expected: 'meta' },
      ];

      for (const { name, expected } of toolTests) {
        sm = createStateMachine();
        sm.handleToolStart({ type: 'tool_start', toolUseId: 't', toolName: name, input: {} });
        expect(sm.getState().activeTools.get('t')?.category).toBe(expected);
      }
    });

    it('adds tool_start to activity log', () => {
      sm.handleToolStart({
        type: 'tool_start',
        toolUseId: 'tool-1',
        toolName: 'Read',
        input: { file_path: '/path/to/file.ts' },
      });

      const log = sm.getState().activityLog;
      expect(log).toHaveLength(1);
      expect(log[0].type).toBe('tool_start');
      const activity = log[0] as ToolStartActivity;
      expect(activity.toolUseId).toBe('tool-1');
      expect(activity.toolName).toBe('Read');
      expect(activity.displayName).toBe('file.ts');
      expect(activity.timestamp).toBeGreaterThan(0);
    });
  });

  describe('handleToolEnd', () => {
    beforeEach(() => {
      sm.handleToolStart({ type: 'tool_start', toolUseId: 't1', toolName: 'Read', input: {} });
    });

    it('removes tool from activeTools', () => {
      sm.handleToolEnd({ type: 'tool_end', toolUseId: 't1', content: '', isError: false });

      expect(sm.getState().activeTools.size).toBe(0);
    });

    it('adds tool to completedTools', () => {
      sm.handleToolEnd({ type: 'tool_end', toolUseId: 't1', content: '', isError: false });

      const completed = sm.getState().completedTools;
      expect(completed).toHaveLength(1);
      expect(completed[0]).toMatchObject({
        id: 't1',
        name: 'Read',
        category: 'read',
        isError: false,
      });
      expect(completed[0].durationMs).toBeGreaterThanOrEqual(0);
    });

    it('increments toolsCompleted stat', () => {
      sm.handleToolEnd({ type: 'tool_end', toolUseId: 't1', content: '', isError: false });

      expect(sm.getState().stats.toolsCompleted).toBe(1);
    });

    it('increments toolsErrored stat on error', () => {
      sm.handleToolEnd({ type: 'tool_end', toolUseId: 't1', content: '', isError: true });

      expect(sm.getState().stats.toolsErrored).toBe(1);
    });

    it('increments category-specific stats', () => {
      sm.handleToolEnd({ type: 'tool_end', toolUseId: 't1', content: '', isError: false });
      expect(sm.getState().stats.reads).toBe(1);

      sm.handleToolStart({ type: 'tool_start', toolUseId: 't2', toolName: 'Edit', input: {} });
      sm.handleToolEnd({ type: 'tool_end', toolUseId: 't2', content: '', isError: false });
      expect(sm.getState().stats.writes).toBe(1);

      sm.handleToolStart({ type: 'tool_start', toolUseId: 't3', toolName: 'Bash', input: {} });
      sm.handleToolEnd({ type: 'tool_end', toolUseId: 't3', content: '', isError: false });
      expect(sm.getState().stats.commands).toBe(1);

      sm.handleToolStart({ type: 'tool_start', toolUseId: 't4', toolName: 'TodoWrite', input: {} });
      sm.handleToolEnd({ type: 'tool_end', toolUseId: 't4', content: '', isError: false });
      expect(sm.getState().stats.metaOps).toBe(1);
    });

    it('ignores tool_end for unknown toolUseId', () => {
      sm.handleToolEnd({ type: 'tool_end', toolUseId: 'unknown', content: '', isError: false });

      expect(sm.getState().completedTools).toHaveLength(0);
      expect(sm.getState().stats.toolsCompleted).toBe(0);
    });

    it('transitions to thinking when no active tools remain', () => {
      sm.handleToolEnd({ type: 'tool_end', toolUseId: 't1', content: '', isError: false });

      expect(sm.getState().phase).toBe('thinking');
    });

    it('keeps phase based on remaining active tools priority', () => {
      sm.handleToolStart({ type: 'tool_start', toolUseId: 't2', toolName: 'Bash', input: {} });
      sm.handleToolEnd({ type: 'tool_end', toolUseId: 't1', content: '', isError: false });

      expect(sm.getState().phase).toBe('running');
    });

    it('adds tool_complete to activity log', () => {
      sm.handleToolEnd({
        type: 'tool_end',
        toolUseId: 't1',
        content: 'file contents here',
        isError: false,
      });

      const log = sm.getState().activityLog;
      expect(log).toHaveLength(2);
      expect(log[1].type).toBe('tool_complete');
      const activity = log[1] as ToolCompleteActivity;
      expect(activity.toolUseId).toBe('t1');
      expect(activity.toolName).toBe('Read');
      expect(activity.isError).toBe(false);
      expect(activity.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('stores output content as string', () => {
      sm.handleToolEnd({
        type: 'tool_end',
        toolUseId: 't1',
        content: 'file contents here',
        isError: false,
      });

      const completed = sm.getState().completedTools[0];
      expect(completed.output).toBe('file contents here');
    });

    it('stores output content from array', () => {
      sm.handleToolEnd({
        type: 'tool_end',
        toolUseId: 't1',
        content: [{ type: 'text', text: 'part1' }, { type: 'text', text: 'part2' }],
        isError: false,
      });

      const completed = sm.getState().completedTools[0];
      expect(completed.output).toBe('part1part2');
    });
  });

  describe('handleResult', () => {
    it('sets result and transitions to done', () => {
      const resultEvent: ResultEvent = {
        type: 'result',
        durationMs: 5000,
        isError: false,
        numTurns: 3,
        totalCostUsd: 0.05,
        usage: { inputTokens: 1000, outputTokens: 500 },
      };
      sm.handleResult(resultEvent);

      expect(sm.getState().result).toEqual(resultEvent);
      expect(sm.getState().phase).toBe('done');
    });
  });

  describe('tool groups (coalescing)', () => {
    it('groups consecutive tools of same category', () => {
      sm.handleToolStart({ type: 'tool_start', toolUseId: 't1', toolName: 'Read', input: {} });
      sm.handleToolEnd({ type: 'tool_end', toolUseId: 't1', content: '', isError: false });
      sm.handleToolStart({ type: 'tool_start', toolUseId: 't2', toolName: 'Grep', input: {} });
      sm.handleToolEnd({ type: 'tool_end', toolUseId: 't2', content: '', isError: false });
      sm.handleToolStart({ type: 'tool_start', toolUseId: 't3', toolName: 'Glob', input: {} });
      sm.handleToolEnd({ type: 'tool_end', toolUseId: 't3', content: '', isError: false });

      const groups = sm.getState().toolGroups;
      expect(groups).toHaveLength(1);
      expect(groups[0].category).toBe('read');
      expect(groups[0].tools).toHaveLength(3);
    });

    it('creates new group when category changes', () => {
      sm.handleToolStart({ type: 'tool_start', toolUseId: 't1', toolName: 'Read', input: {} });
      sm.handleToolEnd({ type: 'tool_end', toolUseId: 't1', content: '', isError: false });
      sm.handleToolStart({ type: 'tool_start', toolUseId: 't2', toolName: 'Edit', input: {} });
      sm.handleToolEnd({ type: 'tool_end', toolUseId: 't2', content: '', isError: false });

      const groups = sm.getState().toolGroups;
      expect(groups).toHaveLength(2);
      expect(groups[0].category).toBe('read');
      expect(groups[1].category).toBe('write');
    });

    it('accumulates totalDurationMs in group', () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      sm.handleToolStart({ type: 'tool_start', toolUseId: 't1', toolName: 'Read', input: {} });
      vi.setSystemTime(now + 100);
      sm.handleToolEnd({ type: 'tool_end', toolUseId: 't1', content: '', isError: false });

      sm.handleToolStart({ type: 'tool_start', toolUseId: 't2', toolName: 'Grep', input: {} });
      vi.setSystemTime(now + 250);
      sm.handleToolEnd({ type: 'tool_end', toolUseId: 't2', content: '', isError: false });

      const groups = sm.getState().toolGroups;
      expect(groups[0].totalDurationMs).toBe(250);

      vi.useRealTimers();
    });
  });

  describe('getActiveToolNames', () => {
    it('returns names of active tools', () => {
      sm.handleToolStart({ type: 'tool_start', toolUseId: 't1', toolName: 'Read', input: {} });
      sm.handleToolStart({ type: 'tool_start', toolUseId: 't2', toolName: 'Grep', input: {} });

      const names = sm.getActiveToolNames();
      expect(names).toContain('Read');
      expect(names).toContain('Grep');
      expect(names).toHaveLength(2);
    });
  });

  describe('getActiveToolsByCategory', () => {
    it('filters active tools by category', () => {
      sm.handleToolStart({ type: 'tool_start', toolUseId: 't1', toolName: 'Read', input: {} });
      sm.handleToolStart({ type: 'tool_start', toolUseId: 't2', toolName: 'Edit', input: {} });
      sm.handleToolStart({ type: 'tool_start', toolUseId: 't3', toolName: 'Grep', input: {} });

      const readTools = sm.getActiveToolsByCategory('read');
      expect(readTools).toHaveLength(2);
      expect(readTools.map((t) => t.name)).toContain('Read');
      expect(readTools.map((t) => t.name)).toContain('Grep');

      const writeTools = sm.getActiveToolsByCategory('write');
      expect(writeTools).toHaveLength(1);
      expect(writeTools[0].name).toBe('Edit');
    });
  });

  describe('getCoalescedSummary', () => {
    it('returns "Waiting..." when idle with no active tools', () => {
      expect(sm.getCoalescedSummary()).toBe('Waiting...');
    });

    it('returns "Thinking..." when thinking with no active tools', () => {
      sm.handleText({ type: 'text', text: 'Hello' });
      expect(sm.getCoalescedSummary()).toBe('Thinking...');
    });

    it('returns done summary when phase is done', () => {
      sm.handleToolStart({ type: 'tool_start', toolUseId: 't1', toolName: 'Read', input: {} });
      sm.handleToolEnd({ type: 'tool_end', toolUseId: 't1', content: '', isError: false });
      sm.handleResult({ type: 'result', isError: false });

      expect(sm.getCoalescedSummary()).toBe('Done (1 tools)');
    });

    it('shows single tool with display name', () => {
      sm.handleToolStart({
        type: 'tool_start',
        toolUseId: 't1',
        toolName: 'Read',
        input: { file_path: '/path/to/file.ts' },
      });

      expect(sm.getCoalescedSummary()).toBe('Reading file.ts');
    });

    it('shows multiple tools of same category', () => {
      sm.handleToolStart({
        type: 'tool_start',
        toolUseId: 't1',
        toolName: 'Read',
        input: { file_path: '/a.ts' },
      });
      sm.handleToolStart({
        type: 'tool_start',
        toolUseId: 't2',
        toolName: 'Read',
        input: { file_path: '/b.ts' },
      });

      expect(sm.getCoalescedSummary()).toBe('Reading a.ts, b.ts');
    });

    it('shows count when more than 3 tools', () => {
      for (let i = 1; i <= 5; i++) {
        sm.handleToolStart({
          type: 'tool_start',
          toolUseId: `t${i}`,
          toolName: 'Read',
          input: { file_path: `/${i}.ts` },
        });
      }

      expect(sm.getCoalescedSummary()).toBe('Reading 5 items');
    });

    it('shows multiple categories separated by bullet', () => {
      sm.handleToolStart({
        type: 'tool_start',
        toolUseId: 't1',
        toolName: 'Read',
        input: { file_path: '/a.ts' },
      });
      sm.handleToolStart({
        type: 'tool_start',
        toolUseId: 't2',
        toolName: 'Bash',
        input: { command: 'npm test' },
      });

      const summary = sm.getCoalescedSummary();
      expect(summary).toContain('Reading');
      expect(summary).toContain('Running');
      expect(summary).toContain('•');
    });

    it('extracts file name from file_path input', () => {
      sm.handleToolStart({
        type: 'tool_start',
        toolUseId: 't1',
        toolName: 'Edit',
        input: { file_path: '/long/path/to/file.ts' },
      });

      expect(sm.getCoalescedSummary()).toBe('Editing file.ts');
    });

    it('extracts command from Bash input', () => {
      sm.handleToolStart({
        type: 'tool_start',
        toolUseId: 't1',
        toolName: 'Bash',
        input: { command: 'npm run test:coverage' },
      });

      expect(sm.getCoalescedSummary()).toBe('Running npm');
    });

    it('extracts pattern from Glob input', () => {
      sm.handleToolStart({
        type: 'tool_start',
        toolUseId: 't1',
        toolName: 'Glob',
        input: { pattern: '**/*.ts' },
      });

      expect(sm.getCoalescedSummary()).toBe('Reading **/*.ts');
    });
  });

  describe('getElapsedMs', () => {
    it('returns elapsed time since start', () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      const newSm = createStateMachine();

      vi.setSystemTime(now + 1000);
      expect(newSm.getElapsedMs()).toBe(1000);

      vi.setSystemTime(now + 5000);
      expect(newSm.getElapsedMs()).toBe(5000);

      vi.useRealTimers();
    });
  });

  describe('reset', () => {
    it('resets all state to initial values', () => {
      sm.handleText({ type: 'text', text: 'Task' });
      sm.handleToolStart({ type: 'tool_start', toolUseId: 't1', toolName: 'Read', input: {} });
      sm.handleToolEnd({ type: 'tool_end', toolUseId: 't1', content: '', isError: false });

      sm.reset();

      const state = sm.getState();
      expect(state.phase).toBe('idle');
      expect(state.taskText).toBeNull();
      expect(state.activeTools.size).toBe(0);
      expect(state.completedTools).toHaveLength(0);
      expect(state.toolGroups).toHaveLength(0);
      expect(state.stats.toolsStarted).toBe(0);
      expect(state.result).toBeNull();
    });

    it('preserves iteration numbers by default', () => {
      sm.reset();

      const state = sm.getState();
      expect(state.iteration).toBe(1);
      expect(state.totalIterations).toBe(5);
    });

    it('updates iteration numbers when provided', () => {
      sm.reset(3, 10);

      const state = sm.getState();
      expect(state.iteration).toBe(3);
      expect(state.totalIterations).toBe(10);
    });

    it('resets startTime to now', () => {
      vi.useFakeTimers();
      const original = Date.now();
      vi.setSystemTime(original);

      const newSm = createStateMachine();

      vi.setSystemTime(original + 5000);
      newSm.reset();

      expect(newSm.getState().startTime).toBe(original + 5000);

      vi.useRealTimers();
    });

    it('resets activityLog and lastCommit', () => {
      sm.handleText({ type: 'text', text: 'Task' });
      expect(sm.getState().activityLog.length).toBeGreaterThan(0);

      sm.reset();

      expect(sm.getState().activityLog).toHaveLength(0);
      expect(sm.getState().lastCommit).toBeNull();
    });
  });

  describe('phase priority', () => {
    it('prioritizes running > editing > reading > thinking', () => {
      sm.handleToolStart({ type: 'tool_start', toolUseId: 't1', toolName: 'Read', input: {} });
      sm.handleToolStart({ type: 'tool_start', toolUseId: 't2', toolName: 'Edit', input: {} });
      sm.handleToolStart({ type: 'tool_start', toolUseId: 't3', toolName: 'Bash', input: {} });
      sm.handleToolStart({ type: 'tool_start', toolUseId: 't4', toolName: 'TodoWrite', input: {} });

      expect(sm.getState().phase).toBe('thinking');

      sm.handleToolEnd({ type: 'tool_end', toolUseId: 't4', content: '', isError: false });
      expect(sm.getState().phase).toBe('running');

      sm.handleToolEnd({ type: 'tool_end', toolUseId: 't3', content: '', isError: false });
      expect(sm.getState().phase).toBe('editing');

      sm.handleToolEnd({ type: 'tool_end', toolUseId: 't2', content: '', isError: false });
      expect(sm.getState().phase).toBe('reading');

      sm.handleToolEnd({ type: 'tool_end', toolUseId: 't1', content: '', isError: false });
      expect(sm.getState().phase).toBe('thinking');
    });
  });

  describe('activity log cap', () => {
    it('caps activity log at 50 items', () => {
      for (let i = 0; i < 60; i++) {
        sm.handleText({ type: 'text', text: `Thought ${i}` });
      }

      const log = sm.getState().activityLog;
      expect(log).toHaveLength(50);
      expect((log[0] as ThoughtActivity).text).toBe('Thought 10');
      expect((log[49] as ThoughtActivity).text).toBe('Thought 59');
    });
  });

  describe('git commit detection', () => {
    describe('isGitCommitCommand', () => {
      it('detects git commit command', () => {
        expect(isGitCommitCommand('git commit')).toBe(true);
      });

      it('detects git commit with message flag', () => {
        expect(isGitCommitCommand('git commit -m "message"')).toBe(true);
      });

      it('detects git commit with all flag', () => {
        expect(isGitCommitCommand('git commit -a -m "message"')).toBe(true);
      });

      it('detects git commit with leading whitespace', () => {
        expect(isGitCommitCommand('  git commit -m "test"')).toBe(true);
      });

      it('returns false for git status', () => {
        expect(isGitCommitCommand('git status')).toBe(false);
      });

      it('returns false for git add', () => {
        expect(isGitCommitCommand('git add .')).toBe(false);
      });

      it('returns false for git push', () => {
        expect(isGitCommitCommand('git push origin main')).toBe(false);
      });

      it('returns false for npm commands', () => {
        expect(isGitCommitCommand('npm test')).toBe(false);
      });

      it('returns false for commands containing commit as substring', () => {
        expect(isGitCommitCommand('echo "commit"')).toBe(false);
      });
    });

    describe('parseGitCommitOutput', () => {
      it('parses standard git commit output', () => {
        const output = '[main a1b2c3d] feat: add new feature\n 2 files changed, 50 insertions(+)';
        const result = parseGitCommitOutput(output);
        expect(result).toEqual({
          hash: 'a1b2c3d',
          message: 'feat: add new feature',
        });
      });

      it('parses commit with branch containing slash', () => {
        const output = '[feature/auth abc1234] fix(auth): handle edge case\n 1 file changed';
        const result = parseGitCommitOutput(output);
        expect(result).toEqual({
          hash: 'abc1234',
          message: 'fix(auth): handle edge case',
        });
      });

      it('parses full 40-character hash', () => {
        const output = '[main a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2] initial commit';
        const result = parseGitCommitOutput(output);
        expect(result).toEqual({
          hash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
          message: 'initial commit',
        });
      });

      it('returns null for non-commit output', () => {
        const output = 'On branch main\nYour branch is up to date';
        expect(parseGitCommitOutput(output)).toBeNull();
      });

      it('returns null for empty output', () => {
        expect(parseGitCommitOutput('')).toBeNull();
      });

      it('returns null for error output', () => {
        const output = 'error: pathspec \'file.txt\' did not match any file(s)';
        expect(parseGitCommitOutput(output)).toBeNull();
      });

      it('parses commit with hyphenated branch name', () => {
        const output = '[fix-bug-123 def5678] docs: update readme';
        const result = parseGitCommitOutput(output);
        expect(result).toEqual({
          hash: 'def5678',
          message: 'docs: update readme',
        });
      });
    });

    describe('handleToolEnd with git commit', () => {
      it('detects git commit and adds to activity log', () => {
        sm.handleToolStart({
          type: 'tool_start',
          toolUseId: 't1',
          toolName: 'Bash',
          input: { command: 'git commit -m "feat: add feature"' },
        });

        sm.handleToolEnd({
          type: 'tool_end',
          toolUseId: 't1',
          content: '[main abc1234] feat: add feature\n 1 file changed',
          isError: false,
        });

        const log = sm.getState().activityLog;
        expect(log).toHaveLength(3);
        expect(log[2].type).toBe('commit');
        const commitActivity = log[2] as CommitActivity;
        expect(commitActivity.hash).toBe('abc1234');
        expect(commitActivity.message).toBe('feat: add feature');
      });

      it('sets lastCommit when git commit detected', () => {
        sm.handleToolStart({
          type: 'tool_start',
          toolUseId: 't1',
          toolName: 'Bash',
          input: { command: 'git commit -m "fix: bug fix"' },
        });

        sm.handleToolEnd({
          type: 'tool_end',
          toolUseId: 't1',
          content: '[main def5678] fix: bug fix\n 2 files changed',
          isError: false,
        });

        const lastCommit = sm.getState().lastCommit;
        expect(lastCommit).toEqual({
          hash: 'def5678',
          message: 'fix: bug fix',
        });
      });

      it('does not add commit activity when command errors', () => {
        sm.handleToolStart({
          type: 'tool_start',
          toolUseId: 't1',
          toolName: 'Bash',
          input: { command: 'git commit -m "test"' },
        });

        sm.handleToolEnd({
          type: 'tool_end',
          toolUseId: 't1',
          content: 'nothing to commit, working tree clean',
          isError: true,
        });

        const log = sm.getState().activityLog;
        expect(log.filter((a) => a.type === 'commit')).toHaveLength(0);
        expect(sm.getState().lastCommit).toBeNull();
      });

      it('does not add commit activity for non-Bash tools', () => {
        sm.handleToolStart({
          type: 'tool_start',
          toolUseId: 't1',
          toolName: 'Read',
          input: { file_path: '/path/to/file.ts' },
        });

        sm.handleToolEnd({
          type: 'tool_end',
          toolUseId: 't1',
          content: '[main abc1234] fake commit output',
          isError: false,
        });

        const log = sm.getState().activityLog;
        expect(log.filter((a) => a.type === 'commit')).toHaveLength(0);
      });

      it('does not add commit activity for non-git commit commands', () => {
        sm.handleToolStart({
          type: 'tool_start',
          toolUseId: 't1',
          toolName: 'Bash',
          input: { command: 'git status' },
        });

        sm.handleToolEnd({
          type: 'tool_end',
          toolUseId: 't1',
          content: 'On branch main',
          isError: false,
        });

        const log = sm.getState().activityLog;
        expect(log.filter((a) => a.type === 'commit')).toHaveLength(0);
      });

      it('does not add commit activity when output does not match pattern', () => {
        sm.handleToolStart({
          type: 'tool_start',
          toolUseId: 't1',
          toolName: 'Bash',
          input: { command: 'git commit --amend' },
        });

        sm.handleToolEnd({
          type: 'tool_end',
          toolUseId: 't1',
          content: 'nothing to commit, working tree clean',
          isError: false,
        });

        const log = sm.getState().activityLog;
        expect(log.filter((a) => a.type === 'commit')).toHaveLength(0);
      });
    });
  });
});
