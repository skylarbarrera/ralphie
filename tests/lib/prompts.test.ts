import { describe, it, expect } from 'vitest';
import { DEFAULT_PROMPT, GREEDY_PROMPT } from '../../src/lib/prompts.js';

describe('prompts', () => {
  describe('DEFAULT_PROMPT', () => {
    it('includes security requirements', () => {
      expect(DEFAULT_PROMPT).toContain('## Security Requirements');
      expect(DEFAULT_PROMPT).toContain('Input Validation');
      expect(DEFAULT_PROMPT).toContain('SQL Injection Prevention');
      expect(DEFAULT_PROMPT).toContain('XSS Prevention');
      expect(DEFAULT_PROMPT).toContain('No Secrets in Code');
    });

    it('includes performance guidelines', () => {
      expect(DEFAULT_PROMPT).toContain('## Performance Guidelines');
      expect(DEFAULT_PROMPT).toContain('Avoid N+1 Queries');
      expect(DEFAULT_PROMPT).toContain('Use Appropriate Data Structures');
      expect(DEFAULT_PROMPT).toContain('Consider Memory Usage');
      expect(DEFAULT_PROMPT).toContain('Database Indexes');
      expect(DEFAULT_PROMPT).toContain('Algorithm Complexity');
    });

    it('includes the main loop instructions', () => {
      expect(DEFAULT_PROMPT).toContain('## The Loop');
      expect(DEFAULT_PROMPT).toContain('Read the spec');
      expect(DEFAULT_PROMPT).toContain('Write plan');
      expect(DEFAULT_PROMPT).toContain('Update the task\'s Status field');
    });

    it('includes rules section', () => {
      expect(DEFAULT_PROMPT).toContain('## Rules');
      expect(DEFAULT_PROMPT).toContain('Plan BEFORE coding');
      expect(DEFAULT_PROMPT).toContain('Run Verify command BEFORE marking passed');
    });
  });

  describe('GREEDY_PROMPT', () => {
    it('includes security requirements', () => {
      expect(GREEDY_PROMPT).toContain('## Security Requirements');
      expect(GREEDY_PROMPT).toContain('Input Validation');
      expect(GREEDY_PROMPT).toContain('SQL Injection Prevention');
    });

    it('includes performance guidelines', () => {
      expect(GREEDY_PROMPT).toContain('## Performance Guidelines');
      expect(GREEDY_PROMPT).toContain('Avoid N+1 Queries');
      expect(GREEDY_PROMPT).toContain('Use Appropriate Data Structures');
      expect(GREEDY_PROMPT).toContain('Consider Memory Usage');
    });

    it('includes greedy mode instructions', () => {
      expect(GREEDY_PROMPT).toContain('GREEDY MODE');
      expect(GREEDY_PROMPT).toContain('AS MANY tasks as possible');
      expect(GREEDY_PROMPT).toContain('CONTINUE to next task');
    });
  });

  describe('Performance Guidelines content', () => {
    it('covers N+1 query prevention', () => {
      expect(DEFAULT_PROMPT).toContain('eager loading');
      expect(DEFAULT_PROMPT).toContain('joins');
      expect(DEFAULT_PROMPT).toContain('batching');
    });

    it('covers data structure usage', () => {
      expect(DEFAULT_PROMPT).toContain('Set for lookups');
      expect(DEFAULT_PROMPT).toContain('Map for caching');
    });

    it('covers memory management', () => {
      expect(DEFAULT_PROMPT).toContain('Stream large files');
      expect(DEFAULT_PROMPT).toContain('paginate large datasets');
      expect(DEFAULT_PROMPT).toContain('clean up resources');
    });

    it('covers database optimization', () => {
      expect(DEFAULT_PROMPT).toContain('indexes for frequently queried');
      expect(DEFAULT_PROMPT).toContain('foreign keys');
    });

    it('covers algorithm efficiency', () => {
      expect(DEFAULT_PROMPT).toContain('O(n²)');
      expect(DEFAULT_PROMPT).toContain('hot paths');
    });

    it('clarifies this is not premature optimization', () => {
      expect(DEFAULT_PROMPT).toContain('not premature optimization');
      expect(DEFAULT_PROMPT).toContain('obvious performance mistakes');
      expect(DEFAULT_PROMPT).toContain('Profile before complex optimizations');
    });
  });
});
