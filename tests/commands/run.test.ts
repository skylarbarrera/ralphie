import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateProject } from '../../src/commands/run.js';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { tmpdir } from 'os';

describe('validateProject', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `ralph-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('uncommitted changes detection', () => {
    it('should fail when git repo has uncommitted changes', () => {
      // Initialize git repo
      execSync('git init', { cwd: testDir, stdio: 'pipe' });
      execSync('git config user.email "test@test.com"', { cwd: testDir, stdio: 'pipe' });
      execSync('git config user.name "Test"', { cwd: testDir, stdio: 'pipe' });

      // Create initial commit
      writeFileSync(join(testDir, 'README.md'), '# Test');
      execSync('git add .', { cwd: testDir, stdio: 'pipe' });
      execSync('git commit -m "Initial commit"', { cwd: testDir, stdio: 'pipe' });

      // Create uncommitted change
      writeFileSync(join(testDir, 'dirty.txt'), 'uncommitted');

      const result = validateProject(testDir);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Uncommitted changes detected. Commit or stash before running Ralph.');
    });

    it('should pass when git repo is clean (with other required files)', () => {
      // Initialize git repo
      execSync('git init', { cwd: testDir, stdio: 'pipe' });
      execSync('git config user.email "test@test.com"', { cwd: testDir, stdio: 'pipe' });
      execSync('git config user.name "Test"', { cwd: testDir, stdio: 'pipe' });

      // Create required files
      writeFileSync(join(testDir, 'SPEC.md'), '# Spec\n- [ ] Task 1');
      mkdirSync(join(testDir, '.claude'), { recursive: true });
      writeFileSync(join(testDir, '.claude', 'ralph.md'), '# Ralph');
      mkdirSync(join(testDir, '.ai', 'ralph'), { recursive: true });

      // Commit everything
      execSync('git add .', { cwd: testDir, stdio: 'pipe' });
      execSync('git commit -m "Initial commit"', { cwd: testDir, stdio: 'pipe' });

      const result = validateProject(testDir);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should not check git status in non-git directory', () => {
      // Create required files but no git repo
      writeFileSync(join(testDir, 'SPEC.md'), '# Spec\n- [ ] Task 1');
      mkdirSync(join(testDir, '.claude'), { recursive: true });
      writeFileSync(join(testDir, '.claude', 'ralph.md'), '# Ralph');
      mkdirSync(join(testDir, '.ai', 'ralph'), { recursive: true });

      // Add a file that would be "uncommitted" if it were a git repo
      writeFileSync(join(testDir, 'dirty.txt'), 'not tracked');

      const result = validateProject(testDir);

      // Should pass - no git check in non-git directory
      expect(result.valid).toBe(true);
      expect(result.errors).not.toContain('Uncommitted changes detected. Commit or stash before running Ralph.');
    });
  });

  describe('required files', () => {
    it('should fail when SPEC.md is missing', () => {
      const result = validateProject(testDir);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('SPEC.md not found. Create a SPEC.md with your project tasks.');
    });

    it('should fail when .claude/ralph.md is missing', () => {
      writeFileSync(join(testDir, 'SPEC.md'), '# Spec');

      const result = validateProject(testDir);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('.claude/ralph.md not found. Run `ralph init` first.');
    });

    it('should fail when .ai/ralph/ is missing', () => {
      writeFileSync(join(testDir, 'SPEC.md'), '# Spec');
      mkdirSync(join(testDir, '.claude'), { recursive: true });
      writeFileSync(join(testDir, '.claude', 'ralph.md'), '# Ralph');

      const result = validateProject(testDir);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('.ai/ralph/ not found. Run `ralph init` first.');
    });
  });
});
