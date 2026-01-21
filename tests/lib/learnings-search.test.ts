import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import {
  extractKeywords,
  parseFrontmatter,
  searchLearnings,
  formatLearningsForPrompt,
  type Learning,
  type LearningMetadata
} from '../../src/lib/learnings-search.js';

describe('learnings-search', () => {
  describe('extractKeywords', () => {
    it('should extract unique keywords from task title', () => {
      const keywords = extractKeywords('Add authentication with JWT tokens');
      expect(keywords).toContain('add');
      expect(keywords).toContain('authentication');
      expect(keywords).toContain('jwt');
      expect(keywords).toContain('tokens');
    });

    it('should extract keywords from title and deliverables', () => {
      const keywords = extractKeywords('Fix bug', 'Update type checking to handle null values');
      expect(keywords).toContain('fix');
      expect(keywords).toContain('bug');
      expect(keywords).toContain('update');
      expect(keywords).toContain('type');
      expect(keywords).toContain('checking');
      expect(keywords).toContain('null');
    });

    it('should filter out stopwords and short words', () => {
      const keywords = extractKeywords('Add a test for the API');
      expect(keywords).not.toContain('a');
      expect(keywords).not.toContain('for');
      expect(keywords).not.toContain('the');
      expect(keywords).toContain('add');
      expect(keywords).toContain('test');
      expect(keywords).toContain('api');
    });

    it('should deduplicate keywords', () => {
      const keywords = extractKeywords('Test test TEST');
      expect(keywords.filter(k => k === 'test')).toHaveLength(1);
    });

    it('should handle empty input', () => {
      const keywords = extractKeywords('');
      expect(keywords).toEqual([]);
    });
  });

  describe('parseFrontmatter', () => {
    it('should parse valid YAML frontmatter', () => {
      const content = `---
problem: Build failed
solution: Fix config
tags: [build, webpack]
---

Additional content here`;

      const result = parseFrontmatter(content);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.problem).toBe('Build failed');
      expect(result.metadata?.solution).toBe('Fix config');
      expect(result.metadata?.tags).toEqual(['build', 'webpack']);
      expect(result.body).toBe('Additional content here');
    });

    it('should handle content without frontmatter', () => {
      const content = 'Just regular markdown content';
      const result = parseFrontmatter(content);
      expect(result.metadata).toBeNull();
      expect(result.body).toBe(content);
    });

    it('should handle invalid YAML', () => {
      const content = `---
invalid: yaml: structure:
---

Content`;

      const result = parseFrontmatter(content);
      expect(result.metadata).toBeNull();
    });

    it('should parse all metadata fields', () => {
      const content = `---
problem: TypeScript error
symptoms: Type 'null' is not assignable
root-cause: Missing null check
solution: Add type guard
prevention: Use strict null checks
tags: [typescript, null-safety]
---

Details`;

      const result = parseFrontmatter(content);
      expect(result.metadata?.problem).toBe('TypeScript error');
      expect(result.metadata?.symptoms).toBe("Type 'null' is not assignable");
      expect(result.metadata?.['root-cause']).toBe('Missing null check');
      expect(result.metadata?.solution).toBe('Add type guard');
      expect(result.metadata?.prevention).toBe('Use strict null checks');
      expect(result.metadata?.tags).toEqual(['typescript', 'null-safety']);
    });
  });

  describe('searchLearnings', () => {
    const testDir = join(process.cwd(), 'test-learnings-tmp');
    const projectDir = join(testDir, '.ralphie', 'learnings');
    const globalDir = join(testDir, '.global-ralphie', 'learnings');

    beforeEach(() => {
      // Clean up any existing test directory
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }

      // Create test directories
      mkdirSync(join(projectDir, 'build-errors'), { recursive: true });
      mkdirSync(join(globalDir, 'patterns'), { recursive: true });
    });

    afterEach(() => {
      // Clean up test directory
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
    });

    it('should find learnings matching keywords', () => {
      // Create a learning file
      const learningContent = `---
problem: Build failed due to missing dependencies
solution: Run npm install before build
prevention: Add pre-build script
tags: [build-errors, npm]
---

Additional notes about the fix.`;

      writeFileSync(join(projectDir, 'build-errors', 'npm-install-missing.md'), learningContent);

      const results = searchLearnings('Fix build errors', 'npm dependencies not found', testDir, globalDir);
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Npm Install Missing');
      expect(results[0].metadata.problem).toBe('Build failed due to missing dependencies');
      expect(results[0].source).toBe('project');
    });

    it('should search project learnings first', () => {
      const projectLearning = `---
problem: Test failure
solution: Project solution
tags: [testing]
---
Project notes`;

      const globalLearning = `---
problem: Test failure
solution: Global solution
tags: [testing]
---
Global notes`;

      writeFileSync(join(projectDir, 'test-failure.md'), projectLearning);
      writeFileSync(join(globalDir, 'test-failure-global.md'), globalLearning);

      const results = searchLearnings('Fix test failure', '', testDir, globalDir);
      expect(results).toHaveLength(2);
      expect(results[0].source).toBe('project');
      expect(results[1].source).toBe('global');
    });

    it('should deduplicate learnings with same filename', () => {
      const learning = `---
problem: Common issue
solution: Fix it
tags: [common]
---
Notes`;

      // Same filename in both locations
      writeFileSync(join(projectDir, 'common-issue.md'), learning);
      writeFileSync(join(globalDir, 'common-issue.md'), learning);

      const results = searchLearnings('Common issue fix', '', testDir, globalDir);
      expect(results).toHaveLength(1);
      expect(results[0].source).toBe('project'); // Project takes precedence
    });

    it('should return empty array when no matches found', () => {
      const learning = `---
problem: Database connection error
solution: Check credentials
tags: [database]
---
Notes`;

      writeFileSync(join(projectDir, 'db-error.md'), learning);

      const results = searchLearnings('Build webpack configuration', '', testDir, globalDir);
      expect(results).toEqual([]);
    });

    it('should match on tags', () => {
      const learning = `---
problem: Issue X
solution: Fix X
tags: [typescript, type-safety]
---
Notes`;

      writeFileSync(join(projectDir, 'issue-x.md'), learning);

      const results = searchLearnings('Fix TypeScript errors', '', testDir, globalDir);
      expect(results).toHaveLength(1);
    });

    it('should ignore files with missing required fields', () => {
      const invalidLearning = `---
problem: Issue without solution
tags: [test]
---
Notes`;

      writeFileSync(join(projectDir, 'invalid.md'), invalidLearning);

      const results = searchLearnings('test issue', '', testDir, globalDir);
      expect(results).toEqual([]);
    });

    it('should handle nested subdirectories', () => {
      const learning = `---
problem: Nested issue
solution: Nested fix
tags: [nested]
---
Notes`;

      mkdirSync(join(projectDir, 'category', 'subcategory'), { recursive: true });
      writeFileSync(join(projectDir, 'category', 'subcategory', 'nested.md'), learning);

      const results = searchLearnings('nested issue', '', testDir, globalDir);
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Nested');
    });

    it('should handle missing learnings directories gracefully', () => {
      const nonExistentDir = join(testDir, 'nonexistent');
      const results = searchLearnings('anything', '', nonExistentDir, globalDir);
      expect(results).toEqual([]);
    });

    it('should return empty array when no keywords extracted', () => {
      const results = searchLearnings('a the an', '', testDir, globalDir);
      expect(results).toEqual([]);
    });
  });

  describe('formatLearningsForPrompt', () => {
    it('should format learnings as markdown', () => {
      const learnings: Learning[] = [
        {
          filename: 'test-issue',
          title: 'Test Issue',
          metadata: {
            problem: 'Tests failing',
            solution: 'Fix assertions',
            prevention: 'Add pre-commit hook',
            tags: ['testing', 'ci']
          },
          content: 'Details...',
          source: 'project'
        }
      ];

      const formatted = formatLearningsForPrompt(learnings);
      expect(formatted).toContain('## Relevant Learnings');
      expect(formatted).toContain('### Test Issue');
      expect(formatted).toContain('**Problem:** Tests failing');
      expect(formatted).toContain('**Solution:** Fix assertions');
      expect(formatted).toContain('**Prevention:** Add pre-commit hook');
      expect(formatted).toContain('**Tags:** testing, ci');
      expect(formatted).toContain('**Source:** Project learnings');
    });

    it('should format multiple learnings', () => {
      const learnings: Learning[] = [
        {
          filename: 'issue-1',
          title: 'Issue 1',
          metadata: {
            problem: 'Problem 1',
            solution: 'Solution 1'
          },
          content: '',
          source: 'project'
        },
        {
          filename: 'issue-2',
          title: 'Issue 2',
          metadata: {
            problem: 'Problem 2',
            solution: 'Solution 2'
          },
          content: '',
          source: 'global'
        }
      ];

      const formatted = formatLearningsForPrompt(learnings);
      expect(formatted).toContain('### Issue 1');
      expect(formatted).toContain('### Issue 2');
      expect(formatted).toContain('**Source:** Project learnings');
      expect(formatted).toContain('**Source:** Global learnings');
    });

    it('should handle optional fields gracefully', () => {
      const learnings: Learning[] = [
        {
          filename: 'minimal',
          title: 'Minimal',
          metadata: {
            problem: 'Just problem',
            solution: 'Just solution'
          },
          content: '',
          source: 'project'
        }
      ];

      const formatted = formatLearningsForPrompt(learnings);
      expect(formatted).toContain('**Problem:** Just problem');
      expect(formatted).toContain('**Solution:** Just solution');
      expect(formatted).not.toContain('**Prevention:**');
      expect(formatted).not.toContain('**Tags:**');
    });

    it('should return empty string for empty learnings array', () => {
      const formatted = formatLearningsForPrompt([]);
      expect(formatted).toBe('');
    });
  });
});
