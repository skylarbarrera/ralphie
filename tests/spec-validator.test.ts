import { describe, it, expect } from 'vitest';
import {
  validateSpecContent,
  formatValidationResult,
  type ValidationResult,
} from '../src/lib/spec-validator.js';

describe('spec-validator', () => {
  describe('validateSpecContent', () => {
    it('returns valid for clean spec', () => {
      const content = `# AI Factory Pipeline Fixes

## Goal
Fix worker pipeline to reliably push commits and create PRs.

## Tasks

- [ ] Fix PR creation flow
  - Detect unpushed commits (not uncommitted changes)
  - Push and create PR when commits exist
  - Pass auth token correctly to gh CLI

- [ ] Add test infrastructure to worker
  - Install test runners in worker container
  - Run actual tests after Ralphie completes
  - Add timeout protection
`;
      const result = validateSpecContent(content);
      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('detects code snippets', () => {
      const content = `# Fix Bug

## Tasks

- [ ] Fix the auth bug

## Technical Details

\`\`\`typescript
const unpushedResult = await exec("git", ["rev-list", "--count", "origin/HEAD..HEAD"]);
const unpushedCount = parseInt(unpushedResult.stdout.trim(), 10);
\`\`\`
`;
      const result = validateSpecContent(content);
      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.type === 'code_snippet')).toBe(true);
    });

    it('detects file:line references', () => {
      const content = `# Fix Bug

## Tasks

- [ ] Fix the bug in setup.ts:150
  - The issue is at src/auth/middleware.ts:42
`;
      const result = validateSpecContent(content);
      expect(result.valid).toBe(false);
      expect(result.violations.filter((v) => v.type === 'file_line_reference')).toHaveLength(2);
    });

    it('detects shell commands in task lists', () => {
      const content = `# Fix Bug

## Tasks

- [ ] Fix PR creation
  - npm install jest ts-jest
  - git log origin/main..HEAD --oneline
`;
      const result = validateSpecContent(content);
      expect(result.valid).toBe(false);
      expect(result.violations.filter((v) => v.type === 'shell_command')).toHaveLength(2);
    });

    it('detects Technical Notes sections', () => {
      const content = `# Fix Bug

## Tasks

- [ ] Fix the bug

## Technical Notes

Some implementation details here.

### Fix Approach

More implementation stuff.
`;
      const result = validateSpecContent(content);
      expect(result.valid).toBe(false);
      const techNotes = result.violations.filter((v) => v.type === 'technical_notes_section');
      expect(techNotes.length).toBeGreaterThanOrEqual(1);
    });

    it('detects implementation instructions', () => {
      const content = `# Fix Bug

## Tasks

- [ ] Fix PR creation
  - Use \`git rev-list\` to check unpushed commits
  - Remove the early return at line 152
  - Add \`--token\` flag to the command
  - Change line 50 to use async
`;
      const result = validateSpecContent(content);
      expect(result.valid).toBe(false);
      expect(result.violations.filter((v) => v.type === 'implementation_instruction').length).toBeGreaterThan(0);
    });

    it('allows code blocks in example sections', () => {
      const content = `# Spec Writing Guide

## Good Example

\`\`\`markdown
- [ ] Fix auth
\`\`\`

## Bad Example

\`\`\`markdown
- [ ] Fix auth at line 50
\`\`\`
`;
      const result = validateSpecContent(content);
      expect(result.violations.filter((v) => v.type === 'code_snippet')).toHaveLength(0);
    });

    it('catches the problematic spec from the issue', () => {
      const badSpec = `# AI Factory Pipeline Fixes

## Goal
Fix the worker pipeline to reliably push commits and create PRs.

## Tasks

### Phase 1: Fix PR Creation Flow
- [ ] Fix \`createPullRequest\` in \`setup.ts\` to check for unpushed commits instead of uncommitted changes
  - Use \`git log origin/main..HEAD --oneline\` or similar to detect unpushed commits
  - Always attempt push if there are commits ahead of origin
  - Remove the misleading "No changes to commit" early return

## Technical Notes

### Current PR Flow Bug (setup.ts:150-156)
\`\`\`typescript
const statusResult = await exec("git", ["status", "--porcelain"], { cwd: repoDir });
if (statusResult.stdout.trim() === "") {
  console.log("No changes to commit");
  return null;
}
\`\`\`
`;
      const result = validateSpecContent(badSpec);
      expect(result.valid).toBe(false);
      expect(result.violations.length).toBeGreaterThanOrEqual(3);

      const violationTypes = result.violations.map((v) => v.type);
      expect(violationTypes).toContain('code_snippet');
      expect(violationTypes).toContain('technical_notes_section');
      expect(violationTypes).toContain('file_line_reference');
    });
  });

  describe('formatValidationResult', () => {
    it('formats valid result', () => {
      const result: ValidationResult = {
        valid: true,
        violations: [],
        warnings: [],
      };
      expect(formatValidationResult(result)).toBe('✓ Spec follows conventions');
    });

    it('formats violations', () => {
      const result: ValidationResult = {
        valid: false,
        violations: [
          {
            type: 'code_snippet',
            line: 10,
            content: '```typescript',
            message: 'Code snippets belong in plan.md',
          },
        ],
        warnings: [],
      };
      const formatted = formatValidationResult(result);
      expect(formatted).toContain('1 violation');
      expect(formatted).toContain('Line 10');
      expect(formatted).toContain('code_snippet');
    });
  });
});
