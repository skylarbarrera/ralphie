import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { ToolList } from '../src/components/ToolList.js';
import type { ToolGroup, ActiveTool } from '../src/lib/state-machine.js';

describe('ToolList', () => {
  describe('empty state', () => {
    it('returns null when no tools', () => {
      const { lastFrame } = render(
        <ToolList toolGroups={[]} activeTools={[]} />
      );
      expect(lastFrame()).toBe('');
    });
  });

  describe('completed groups', () => {
    it('renders single completed read tool', () => {
      const groups: ToolGroup[] = [
        {
          category: 'read',
          tools: [{ id: '1', name: 'Read', category: 'read', durationMs: 800, isError: false }],
          totalDurationMs: 800,
        },
      ];

      const { lastFrame } = render(<ToolList toolGroups={groups} activeTools={[]} />);
      const output = lastFrame();
      expect(output).toContain('│');
      expect(output).toContain('✓');
      expect(output).toContain('Reading');
      expect(output).toContain('(0.8s)');
    });

    it('renders coalesced read group with multiple tools', () => {
      const groups: ToolGroup[] = [
        {
          category: 'read',
          tools: [
            { id: '1', name: 'Read', category: 'read', durationMs: 400, isError: false },
            { id: '2', name: 'Read', category: 'read', durationMs: 300, isError: false },
            { id: '3', name: 'Read', category: 'read', durationMs: 500, isError: false },
          ],
          totalDurationMs: 1200,
        },
      ];

      const { lastFrame } = render(<ToolList toolGroups={groups} activeTools={[]} />);
      const output = lastFrame();
      expect(output).toContain('✓');
      expect(output).toContain('Reading 3 files');
      expect(output).toContain('(1.2s)');
    });

    it('renders completed write group', () => {
      const groups: ToolGroup[] = [
        {
          category: 'write',
          tools: [
            { id: '1', name: 'Edit', category: 'write', durationMs: 600, isError: false },
            { id: '2', name: 'Edit', category: 'write', durationMs: 600, isError: false },
          ],
          totalDurationMs: 1200,
        },
      ];

      const { lastFrame } = render(<ToolList toolGroups={groups} activeTools={[]} />);
      const output = lastFrame();
      expect(output).toContain('✓');
      expect(output).toContain('Editing 2 files');
      expect(output).toContain('(1.2s)');
    });

    it('renders completed command group', () => {
      const groups: ToolGroup[] = [
        {
          category: 'command',
          tools: [{ id: '1', name: 'Bash', category: 'command', durationMs: 4100, isError: false }],
          totalDurationMs: 4100,
        },
      ];

      const { lastFrame } = render(<ToolList toolGroups={groups} activeTools={[]} />);
      const output = lastFrame();
      expect(output).toContain('✓');
      expect(output).toContain('Running');
      expect(output).toContain('(4.1s)');
    });

    it('renders completed meta group', () => {
      const groups: ToolGroup[] = [
        {
          category: 'meta',
          tools: [
            { id: '1', name: 'TodoWrite', category: 'meta', durationMs: 100, isError: false },
            { id: '2', name: 'Task', category: 'meta', durationMs: 200, isError: false },
          ],
          totalDurationMs: 300,
        },
      ];

      const { lastFrame } = render(<ToolList toolGroups={groups} activeTools={[]} />);
      const output = lastFrame();
      expect(output).toContain('✓');
      expect(output).toContain('Processing 2 tasks');
      expect(output).toContain('(0.3s)');
    });

    it('renders multiple groups in sequence', () => {
      const groups: ToolGroup[] = [
        {
          category: 'read',
          tools: [{ id: '1', name: 'Read', category: 'read', durationMs: 500, isError: false }],
          totalDurationMs: 500,
        },
        {
          category: 'write',
          tools: [{ id: '2', name: 'Edit', category: 'write', durationMs: 600, isError: false }],
          totalDurationMs: 600,
        },
      ];

      const { lastFrame } = render(<ToolList toolGroups={groups} activeTools={[]} />);
      const output = lastFrame();
      expect(output).toContain('Reading');
      expect(output).toContain('Editing');
    });

    it('shows error icon when group contains errors', () => {
      const groups: ToolGroup[] = [
        {
          category: 'read',
          tools: [
            { id: '1', name: 'Read', category: 'read', durationMs: 500, isError: false },
            { id: '2', name: 'Read', category: 'read', durationMs: 200, isError: true },
          ],
          totalDurationMs: 700,
        },
      ];

      const { lastFrame } = render(<ToolList toolGroups={groups} activeTools={[]} />);
      const output = lastFrame();
      expect(output).toContain('✗');
      expect(output).toContain('Reading 2 files');
    });
  });

  describe('active tools', () => {
    it('renders active read tool', () => {
      const activeTools: ActiveTool[] = [
        {
          id: '1',
          name: 'Read',
          category: 'read',
          startTime: Date.now(),
          input: { file_path: '/path/to/file.ts' },
        },
      ];

      const { lastFrame } = render(<ToolList toolGroups={[]} activeTools={activeTools} />);
      const output = lastFrame();
      expect(output).toContain('│');
      expect(output).toContain('Reading');
      expect(output).toContain('file.ts');
    });

    it('renders active write tool', () => {
      const activeTools: ActiveTool[] = [
        {
          id: '1',
          name: 'Edit',
          category: 'write',
          startTime: Date.now(),
          input: { file_path: '/src/auth.ts' },
        },
      ];

      const { lastFrame } = render(<ToolList toolGroups={[]} activeTools={activeTools} />);
      const output = lastFrame();
      expect(output).toContain('Editing');
      expect(output).toContain('auth.ts');
    });

    it('renders active command tool', () => {
      const activeTools: ActiveTool[] = [
        {
          id: '1',
          name: 'Bash',
          category: 'command',
          startTime: Date.now(),
          input: { command: 'npm test' },
        },
      ];

      const { lastFrame } = render(<ToolList toolGroups={[]} activeTools={activeTools} />);
      const output = lastFrame();
      expect(output).toContain('Running');
      expect(output).toContain('npm');
    });

    it('renders active meta tool', () => {
      const activeTools: ActiveTool[] = [
        {
          id: '1',
          name: 'Task',
          category: 'meta',
          startTime: Date.now(),
          input: {},
        },
      ];

      const { lastFrame } = render(<ToolList toolGroups={[]} activeTools={activeTools} />);
      const output = lastFrame();
      expect(output).toContain('Processing');
      expect(output).toContain('Task');
    });

    it('renders multiple active tools', () => {
      const activeTools: ActiveTool[] = [
        {
          id: '1',
          name: 'Read',
          category: 'read',
          startTime: Date.now(),
          input: { file_path: '/a.ts' },
        },
        {
          id: '2',
          name: 'Read',
          category: 'read',
          startTime: Date.now(),
          input: { file_path: '/b.ts' },
        },
      ];

      const { lastFrame } = render(<ToolList toolGroups={[]} activeTools={activeTools} />);
      const output = lastFrame();
      expect(output).toContain('a.ts');
      expect(output).toContain('b.ts');
    });
  });

  describe('mixed state', () => {
    it('renders completed groups followed by active tools', () => {
      const groups: ToolGroup[] = [
        {
          category: 'read',
          tools: [{ id: '1', name: 'Read', category: 'read', durationMs: 800, isError: false }],
          totalDurationMs: 800,
        },
      ];
      const activeTools: ActiveTool[] = [
        {
          id: '2',
          name: 'Edit',
          category: 'write',
          startTime: Date.now(),
          input: { file_path: '/src/index.ts' },
        },
      ];

      const { lastFrame } = render(<ToolList toolGroups={groups} activeTools={activeTools} />);
      const output = lastFrame();
      expect(output).toContain('✓');
      expect(output).toContain('Reading');
      expect(output).toContain('(0.8s)');
      expect(output).toContain('Editing');
      expect(output).toContain('index.ts');
    });

    it('renders complex mixed state with multiple groups and active tools', () => {
      const groups: ToolGroup[] = [
        {
          category: 'read',
          tools: [
            { id: '1', name: 'Read', category: 'read', durationMs: 300, isError: false },
            { id: '2', name: 'Glob', category: 'read', durationMs: 200, isError: false },
          ],
          totalDurationMs: 500,
        },
        {
          category: 'write',
          tools: [{ id: '3', name: 'Edit', category: 'write', durationMs: 400, isError: false }],
          totalDurationMs: 400,
        },
      ];
      const activeTools: ActiveTool[] = [
        {
          id: '4',
          name: 'Bash',
          category: 'command',
          startTime: Date.now(),
          input: { command: 'npm run build' },
        },
      ];

      const { lastFrame } = render(<ToolList toolGroups={groups} activeTools={activeTools} />);
      const output = lastFrame();
      expect(output).toContain('Reading 2 files');
      expect(output).toContain('(0.5s)');
      expect(output).toContain('Editing');
      expect(output).toContain('(0.4s)');
      expect(output).toContain('Running');
      expect(output).toContain('npm');
    });
  });

  describe('box-drawing prefix', () => {
    it('all rows have box-drawing character', () => {
      const groups: ToolGroup[] = [
        {
          category: 'read',
          tools: [{ id: '1', name: 'Read', category: 'read', durationMs: 100, isError: false }],
          totalDurationMs: 100,
        },
      ];
      const activeTools: ActiveTool[] = [
        {
          id: '2',
          name: 'Edit',
          category: 'write',
          startTime: Date.now(),
          input: {},
        },
      ];

      const { lastFrame } = render(<ToolList toolGroups={groups} activeTools={activeTools} />);
      const lines = lastFrame()?.split('\n') ?? [];
      for (const line of lines) {
        if (line.trim()) {
          expect(line).toContain('│');
        }
      }
    });
  });

  describe('noun pluralization', () => {
    it('uses singular noun for single read', () => {
      const groups: ToolGroup[] = [
        {
          category: 'read',
          tools: [{ id: '1', name: 'Read', category: 'read', durationMs: 100, isError: false }],
          totalDurationMs: 100,
        },
      ];

      const { lastFrame } = render(<ToolList toolGroups={groups} activeTools={[]} />);
      const output = lastFrame();
      expect(output).not.toContain('files');
    });

    it('uses singular noun for single command', () => {
      const groups: ToolGroup[] = [
        {
          category: 'command',
          tools: [{ id: '1', name: 'Bash', category: 'command', durationMs: 100, isError: false }],
          totalDurationMs: 100,
        },
      ];

      const { lastFrame } = render(<ToolList toolGroups={groups} activeTools={[]} />);
      const output = lastFrame();
      expect(output).not.toContain('commands');
    });

    it('uses plural noun for multiple commands', () => {
      const groups: ToolGroup[] = [
        {
          category: 'command',
          tools: [
            { id: '1', name: 'Bash', category: 'command', durationMs: 100, isError: false },
            { id: '2', name: 'Bash', category: 'command', durationMs: 100, isError: false },
          ],
          totalDurationMs: 200,
        },
      ];

      const { lastFrame } = render(<ToolList toolGroups={groups} activeTools={[]} />);
      const output = lastFrame();
      expect(output).toContain('Running 2 commands');
    });
  });
});
