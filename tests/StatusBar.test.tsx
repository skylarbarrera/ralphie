import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { StatusBar, getPhaseLabel } from '../src/components/StatusBar.js';

describe('StatusBar', () => {
  describe('getPhaseLabel', () => {
    it('returns correct label for idle', () => {
      expect(getPhaseLabel('idle')).toBe('Waiting...');
    });

    it('returns correct label for reading', () => {
      expect(getPhaseLabel('reading')).toBe('Reading...');
    });

    it('returns correct label for editing', () => {
      expect(getPhaseLabel('editing')).toBe('Editing...');
    });

    it('returns correct label for running', () => {
      expect(getPhaseLabel('running')).toBe('Running...');
    });

    it('returns correct label for thinking', () => {
      expect(getPhaseLabel('thinking')).toBe('Thinking...');
    });

    it('returns correct label for done', () => {
      expect(getPhaseLabel('done')).toBe('Done');
    });
  });

  describe('rendering phases', () => {
    it('renders idle phase', () => {
      const { lastFrame } = render(<StatusBar phase="idle" elapsedSeconds={0} />);
      const output = lastFrame();
      expect(output).toContain('└─');
      expect(output).toContain('Waiting...');
      expect(output).toContain('(0:00)');
    });

    it('renders reading phase', () => {
      const { lastFrame } = render(<StatusBar phase="reading" elapsedSeconds={5} />);
      const output = lastFrame();
      expect(output).toContain('└─');
      expect(output).toContain('Reading...');
      expect(output).toContain('(0:05)');
    });

    it('renders editing phase', () => {
      const { lastFrame } = render(<StatusBar phase="editing" elapsedSeconds={15} />);
      const output = lastFrame();
      expect(output).toContain('└─');
      expect(output).toContain('Editing...');
      expect(output).toContain('(0:15)');
    });

    it('renders running phase', () => {
      const { lastFrame } = render(<StatusBar phase="running" elapsedSeconds={30} />);
      const output = lastFrame();
      expect(output).toContain('└─');
      expect(output).toContain('Running...');
      expect(output).toContain('(0:30)');
    });

    it('renders thinking phase', () => {
      const { lastFrame } = render(<StatusBar phase="thinking" elapsedSeconds={45} />);
      const output = lastFrame();
      expect(output).toContain('└─');
      expect(output).toContain('Thinking...');
      expect(output).toContain('(0:45)');
    });

    it('renders done phase', () => {
      const { lastFrame } = render(<StatusBar phase="done" elapsedSeconds={120} />);
      const output = lastFrame();
      expect(output).toContain('└─');
      expect(output).toContain('Done');
      expect(output).toContain('(2:00)');
    });
  });

  describe('elapsed time formatting', () => {
    it('formats seconds correctly', () => {
      const { lastFrame } = render(<StatusBar phase="idle" elapsedSeconds={42} />);
      expect(lastFrame()).toContain('(0:42)');
    });

    it('formats minutes and seconds correctly', () => {
      const { lastFrame } = render(<StatusBar phase="idle" elapsedSeconds={134} />);
      expect(lastFrame()).toContain('(2:14)');
    });

    it('formats hours correctly', () => {
      const { lastFrame } = render(<StatusBar phase="idle" elapsedSeconds={3661} />);
      expect(lastFrame()).toContain('(1:01:01)');
    });
  });

  describe('custom summary', () => {
    it('displays custom summary instead of phase label', () => {
      const { lastFrame } = render(
        <StatusBar phase="done" elapsedSeconds={134} summary="Completed 5 tasks" />
      );
      const output = lastFrame();
      expect(output).toContain('Completed 5 tasks');
      expect(output).not.toContain('Done');
      expect(output).not.toContain('(2:14)');
    });

    it('renders box-drawing characters with custom summary', () => {
      const { lastFrame } = render(
        <StatusBar phase="done" elapsedSeconds={0} summary="Custom status" />
      );
      expect(lastFrame()).toContain('└─');
    });
  });

  describe('visual styling', () => {
    it('contains trailing dashes', () => {
      const { lastFrame } = render(<StatusBar phase="idle" elapsedSeconds={0} />);
      const output = lastFrame() ?? '';
      const dashMatch = output.match(/─{4,}/);
      expect(dashMatch).toBeTruthy();
    });

    it('renders consistently with different phases', () => {
      const phases = ['idle', 'reading', 'editing', 'running', 'thinking', 'done'] as const;
      for (const phase of phases) {
        const { lastFrame } = render(<StatusBar phase={phase} elapsedSeconds={60} />);
        const output = lastFrame();
        expect(output).toContain('└─');
        expect(output).toMatch(/─{4,}/);
      }
    });
  });
});
