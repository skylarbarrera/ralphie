import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  slugify,
  detectCategory,
  decideLearningScope,
  createLearning,
  generateLearningFromFailure,
} from '../../../src/lib/learnings/manager.js';
import type { CreateLearningInput, LearningCategory } from '../../../src/lib/learnings/types.js';

describe('learnings/manager', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'ralphie-test-'));
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('slugify', () => {
    it('should convert title to slug', () => {
      expect(slugify('Fix TypeScript Error')).toBe('fix-typescript-error');
      expect(slugify('Add User Authentication')).toBe('add-user-authentication');
      expect(slugify('TEST-123: Handle Edge Case')).toBe('test-123-handle-edge-case');
    });

    it('should handle special characters', () => {
      expect(slugify('Fix: API Error (404)')).toBe('fix-api-error-404');
      expect(slugify('Handle $special @chars')).toBe('handle-special-chars');
    });

    it('should handle multiple spaces and dashes', () => {
      expect(slugify('  multiple   spaces  ')).toBe('multiple-spaces');
      expect(slugify('dash--dash---dash')).toBe('dash-dash-dash');
    });
  });

  describe('detectCategory', () => {
    it('should detect build-errors', () => {
      expect(detectCategory('TypeScript compilation error')).toBe('build-errors');
      expect(detectCategory('Build failed with error')).toBe('build-errors');
      expect(detectCategory('Compile time issue', ['build'])).toBe('build-errors');
    });

    it('should detect test-failures', () => {
      expect(detectCategory('Jest test failed')).toBe('test-failures');
      expect(detectCategory('Vitest unit test error')).toBe('test-failures');
      expect(detectCategory('Integration test issue', ['test'])).toBe('test-failures');
    });

    it('should detect runtime-errors', () => {
      expect(detectCategory('Application crashed at runtime')).toBe('runtime-errors');
      expect(detectCategory('Uncaught exception thrown')).toBe('runtime-errors');
      expect(detectCategory('Server error', ['runtime', 'crash'])).toBe('runtime-errors');
    });

    it('should default to patterns', () => {
      expect(detectCategory('Refactoring approach')).toBe('patterns');
      expect(detectCategory('Code organization strategy')).toBe('patterns');
      expect(detectCategory('Best practice for hooks', ['patterns'])).toBe('patterns');
    });
  });

  describe('decideLearningScope', () => {
    it('should return global for build-errors', () => {
      expect(decideLearningScope('build-errors', 'TypeScript error', [])).toBe('global');
      expect(decideLearningScope('build-errors', 'Any build issue', ['build'])).toBe('global');
    });

    it('should return project for project-specific keywords', () => {
      expect(decideLearningScope('patterns', 'Issue specific to this project', [])).toBe('project');
      expect(decideLearningScope('runtime-errors', 'Bug in our codebase', [])).toBe('project');
      expect(decideLearningScope('test-failures', 'Our app has a custom setup', [])).toBe('project');
    });

    it('should return global for generic issues', () => {
      expect(decideLearningScope('test-failures', 'Jest mock issue', [])).toBe('global');
      expect(decideLearningScope('runtime-errors', 'Promise rejection error', [])).toBe('global');
      expect(decideLearningScope('patterns', 'React hooks pattern', [])).toBe('global');
    });
  });

  describe('createLearning', () => {
    it('should create learning file with correct structure', () => {
      const input: CreateLearningInput = {
        title: 'Fix TypeScript Error',
        metadata: {
          problem: 'TypeScript compilation failed',
          symptoms: 'Type error on line 42',
          'root-cause': 'Missing type annotation',
          solution: 'Added explicit type',
          prevention: 'Enable strict mode',
          tags: ['typescript', 'build'],
        },
        content: '## Additional Notes\n\nSome extra context',
        category: 'build-errors',
        scope: 'global',
      };

      const result = createLearning(input, testDir);

      expect(result.scope).toBe('global');
      expect(result.category).toBe('build-errors');
      expect(existsSync(result.path)).toBe(true);

      const content = readFileSync(result.path, 'utf-8');

      // Check frontmatter
      expect(content).toContain('---');
      expect(content).toContain('problem: TypeScript compilation failed');
      expect(content).toContain('symptoms: Type error on line 42');
      expect(content).toContain('root-cause: Missing type annotation');
      expect(content).toContain('solution: Added explicit type');
      expect(content).toContain('prevention: Enable strict mode');
      expect(content).toContain('tags:');
      expect(content).toContain('  - typescript');
      expect(content).toContain('  - build');
      expect(content).toContain('category: build-errors');
      expect(content).toContain('date:');

      // Check body
      expect(content).toContain('## Additional Notes');
      expect(content).toContain('Some extra context');
    });

    it('should auto-detect category if not provided', () => {
      const input: CreateLearningInput = {
        title: 'Jest Test Failed',
        metadata: {
          problem: 'Test failed with timeout',
          solution: 'Increased jest timeout',
          tags: ['test', 'jest'],
        },
      };

      const result = createLearning(input, testDir);

      expect(result.category).toBe('test-failures');
    });

    it('should auto-decide scope if not provided', () => {
      const input: CreateLearningInput = {
        title: 'Build Error',
        metadata: {
          problem: 'TypeScript build error',
          solution: 'Fixed tsconfig',
        },
        category: 'build-errors',
      };

      const result = createLearning(input, testDir);

      expect(result.scope).toBe('global'); // build-errors default to global
    });

    it('should create category directory if missing', () => {
      const input: CreateLearningInput = {
        title: 'New Pattern',
        metadata: {
          problem: 'Need better state management',
          solution: 'Used Zustand',
        },
        category: 'patterns',
        scope: 'project',
      };

      const result = createLearning(input, testDir);

      const categoryDir = join(testDir, '.ralphie', 'learnings', 'patterns');
      expect(existsSync(categoryDir)).toBe(true);
    });

    it('should add date to metadata if not present', () => {
      const input: CreateLearningInput = {
        title: 'Test Learning',
        metadata: {
          problem: 'Test problem',
          solution: 'Test solution',
        },
      };

      const result = createLearning(input, testDir);
      const content = readFileSync(result.path, 'utf-8');

      // Date can be quoted or unquoted in YAML
      expect(content).toMatch(/date: ['"]?\d{4}-\d{2}-\d{2}['"]?/);
    });
  });

  describe('generateLearningFromFailure', () => {
    it('should generate learning input from task failure', () => {
      const context = {
        taskId: 'T001',
        taskTitle: 'Add user authentication',
        errorMessage: 'Tests failed: expected 200, got 401',
        logs: 'Error: Unauthorized\n  at login.test.ts:42',
      };

      const input = generateLearningFromFailure(context);

      expect(input.title).toBe('t001-add-user-authentication');
      expect(input.metadata.problem).toContain('T001');
      expect(input.metadata.problem).toContain('Add user authentication');
      expect(input.metadata.symptoms).toContain('Tests failed');
      expect(input.metadata.tags).toContain('t001');
      expect(input.metadata.tags).toContain('task-failure');
      expect(input.content).toContain('Task: Add user authentication');
      expect(input.content).toContain('Task ID: T001');
      expect(input.content).toContain('Error: Unauthorized');
    });

    it('should handle missing error message and logs', () => {
      const context = {
        taskId: 'T002',
        taskTitle: 'Fix bug',
      };

      const input = generateLearningFromFailure(context);

      expect(input.title).toBe('t002-fix-bug');
      expect(input.metadata.symptoms).toBe('Task failed with errors');
      expect(input.content).toContain('Task: Fix bug');
      expect(input.content).not.toContain('## Error Logs');
    });
  });
});
