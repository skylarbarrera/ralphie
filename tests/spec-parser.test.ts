import { describe, it, expect } from 'vitest';
import { parseSpecContent, getTaskForIteration, type SpecStructure } from '../src/lib/spec-parser.js';

const SAMPLE_SPEC = `# Project Name

Some description here.

## Summary: 10 Iterations

| Phase | Tasks | Iterations |
|-------|-------|------------|
| Phase 1 | 1.1, 1.2, 1.3, 1.4 | 4 |
| Phase 2 | 2.1, 2.2 | 2 |
| Phase 3 | 3.1, 3.2 | 2 |
| Phase 4 | 4.1, 4.2 | 2 |
| **Total** | | **10** |

---

## Phase 1: Setup & Foundation

- [ ] 1.1 Create project structure
- [ ] 1.2 Set up database
- [ ] 1.3 Configure authentication
- [ ] 1.4 Add basic routing

## Phase 2: Core Features

- [ ] 2.1 Implement user management
- [ ] 2.2 Add API endpoints

## Phase 3: Testing

- [ ] 3.1 Write unit tests
- [ ] 3.2 Write integration tests

## Phase 4: Polish

- [ ] 4.1 Add error handling
- [ ] 4.2 Final cleanup
`;

describe('spec-parser', () => {
  describe('parseSpecContent', () => {
    it('returns null for empty content', () => {
      expect(parseSpecContent('')).toBeNull();
    });

    it('returns null for content without summary table', () => {
      const content = '# Just a title\n\nSome text.';
      expect(parseSpecContent(content)).toBeNull();
    });

    it('parses total iterations from task count', () => {
      const result = parseSpecContent(SAMPLE_SPEC);
      expect(result?.totalIterations).toBe(10);
    });

    it('parses all tasks in order', () => {
      const result = parseSpecContent(SAMPLE_SPEC);
      expect(result?.tasks).toHaveLength(10);
      expect(result?.tasks.map((t) => t.taskNumber)).toEqual([
        '1.1', '1.2', '1.3', '1.4',
        '2.1', '2.2',
        '3.1', '3.2',
        '4.1', '4.2',
      ]);
    });

    it('associates tasks with correct phase numbers', () => {
      const result = parseSpecContent(SAMPLE_SPEC);
      expect(result?.tasks[0].phaseNumber).toBe(1);
      expect(result?.tasks[3].phaseNumber).toBe(1);
      expect(result?.tasks[4].phaseNumber).toBe(2);
      expect(result?.tasks[6].phaseNumber).toBe(3);
      expect(result?.tasks[8].phaseNumber).toBe(4);
    });

    it('extracts phase names from headings', () => {
      const result = parseSpecContent(SAMPLE_SPEC);
      expect(result?.tasks[0].phaseName).toBe('Setup & Foundation');
      expect(result?.tasks[4].phaseName).toBe('Core Features');
      expect(result?.tasks[6].phaseName).toBe('Testing');
      expect(result?.tasks[8].phaseName).toBe('Polish');
    });

    it('uses section name as phase name when not Phase heading', () => {
      const specWithSection = `## Features

- [ ] Add login
- [ ] Add logout
`;
      const result = parseSpecContent(specWithSection);
      expect(result?.tasks[0].phaseName).toBe('Features');
      expect(result?.tasks[0].taskText).toBe('Add login');
    });
  });

  describe('getTaskForIteration', () => {
    const spec: SpecStructure = {
      totalIterations: 4,
      tasks: [
        { taskNumber: '1.1', phaseNumber: 1, phaseName: 'Setup', taskText: 'Task 1.1' },
        { taskNumber: '1.2', phaseNumber: 1, phaseName: 'Setup', taskText: 'Task 1.2' },
        { taskNumber: '2.1', phaseNumber: 2, phaseName: 'Build', taskText: 'Task 2.1' },
        { taskNumber: '2.2', phaseNumber: 2, phaseName: 'Build', taskText: 'Task 2.2' },
      ],
    };

    it('returns correct task for iteration 1', () => {
      const task = getTaskForIteration(spec, 1);
      expect(task?.taskNumber).toBe('1.1');
      expect(task?.phaseName).toBe('Setup');
    });

    it('returns correct task for middle iteration', () => {
      const task = getTaskForIteration(spec, 3);
      expect(task?.taskNumber).toBe('2.1');
      expect(task?.phaseName).toBe('Build');
    });

    it('returns correct task for last iteration', () => {
      const task = getTaskForIteration(spec, 4);
      expect(task?.taskNumber).toBe('2.2');
    });

    it('returns null for iteration 0', () => {
      expect(getTaskForIteration(spec, 0)).toBeNull();
    });

    it('returns null for iteration beyond total', () => {
      expect(getTaskForIteration(spec, 5)).toBeNull();
    });
  });
});
