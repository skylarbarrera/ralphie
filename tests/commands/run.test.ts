import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateProject } from '../../src/commands/run.js';
import { resolvePrompt, type RunOptions } from '../../src/cli.js';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { tmpdir } from 'os';

const V2_SPEC = `# Test Spec

Goal: Test spec for validation.

## Tasks

### T001: Test task
- Status: pending
- Size: S

**Deliverables:**
- Test item

**Verify:** \`npm test\`
`;

function createV2Spec(dir: string): void {
  mkdirSync(join(dir, 'specs', 'active'), { recursive: true });
  writeFileSync(join(dir, 'specs', 'active', 'test-spec.md'), V2_SPEC);
}

describe('validateProject', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `ralphie-test-${Date.now()}`);
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
      expect(result.errors).toContain('Uncommitted changes detected. Commit or stash before running Ralphie.');
    });

    it('should pass when git repo is clean (with V2 spec and required files)', () => {
      // Initialize git repo
      execSync('git init', { cwd: testDir, stdio: 'pipe' });
      execSync('git config user.email "test@test.com"', { cwd: testDir, stdio: 'pipe' });
      execSync('git config user.name "Test"', { cwd: testDir, stdio: 'pipe' });

      // Create required files with V2 spec
      createV2Spec(testDir);
      mkdirSync(join(testDir, '.claude'), { recursive: true });
      writeFileSync(join(testDir, '.claude', 'ralphie.md'), '# Ralphie');
      mkdirSync(join(testDir, '.ai', 'ralphie'), { recursive: true });

      // Commit everything
      execSync('git add .', { cwd: testDir, stdio: 'pipe' });
      execSync('git commit -m "Initial commit"', { cwd: testDir, stdio: 'pipe' });

      const result = validateProject(testDir);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should not check git status in non-git directory', () => {
      // Create required files but no git repo (V2 spec)
      createV2Spec(testDir);
      mkdirSync(join(testDir, '.claude'), { recursive: true });
      writeFileSync(join(testDir, '.claude', 'ralphie.md'), '# Ralphie');
      mkdirSync(join(testDir, '.ai', 'ralphie'), { recursive: true });

      // Add a file that would be "uncommitted" if it were a git repo
      writeFileSync(join(testDir, 'dirty.txt'), 'not tracked');

      const result = validateProject(testDir);

      // Should pass - no git check in non-git directory
      expect(result.valid).toBe(true);
      expect(result.errors).not.toContain('Uncommitted changes detected. Commit or stash before running Ralphie.');
    });
  });

  describe('required files', () => {
    it('should fail when spec is missing', () => {
      const result = validateProject(testDir);

      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.includes('No spec found'))).toBe(true);
    });

    it('should fail when .claude/ralphie.md is missing', () => {
      createV2Spec(testDir);

      const result = validateProject(testDir);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('.claude/ralphie.md not found. Run `ralphie init` first.');
    });

    it('should fail when .ai/ralphie/ is missing', () => {
      createV2Spec(testDir);
      mkdirSync(join(testDir, '.claude'), { recursive: true });
      writeFileSync(join(testDir, '.claude', 'ralphie.md'), '# Ralphie');

      const result = validateProject(testDir);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('.ai/ralphie/ not found. Run `ralphie init` first.');
    });

    it('should fail when spec is not in .ralphie/specs/active/ or specs/active/', () => {
      // Spec must be in correct location, not at root
      mkdirSync(join(testDir, '.claude'), { recursive: true });
      writeFileSync(join(testDir, '.claude', 'ralphie.md'), '# Ralphie');
      mkdirSync(join(testDir, '.ai', 'ralphie'), { recursive: true });

      const result = validateProject(testDir);

      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.includes('No spec found'))).toBe(true);
    });
  });
});

describe('resolvePrompt with budget', () => {
  let testDir: string;

  const MULTI_TASK_SPEC = `# Multi Task Spec

Goal: Test budget selection.

## Tasks

### T001: Small task
- Status: pending
- Size: S

**Deliverables:**
- Item 1

**Verify:** \`npm test -- small\`

---

### T002: Medium task
- Status: pending
- Size: M

**Deliverables:**
- Item 2

**Verify:** \`npm test -- medium\`

---

### T003: Large task
- Status: pending
- Size: L

**Deliverables:**
- Item 3

**Verify:** \`npm test -- large\`
`;

  beforeEach(() => {
    testDir = join(tmpdir(), `ralphie-prompt-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    mkdirSync(join(testDir, 'specs', 'active'), { recursive: true });
    writeFileSync(join(testDir, 'specs', 'active', 'test-spec.md'), MULTI_TASK_SPEC);
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('includes task context when specPath is provided', () => {
    const specPath = join(testDir, 'specs', 'active', 'test-spec.md');
    const options: RunOptions = {
      cwd: testDir,
      iterations: 1,
      all: false,
      noBranch: true,
      stuckThreshold: 3,
      timeoutIdle: 300,
      greedy: false,
      budget: 4,
      quiet: false,
      headless: false,
    };

    const prompt = resolvePrompt(options, specPath);

    expect(prompt).toContain('## Task Selection');
    expect(prompt).toContain('Selected tasks');
  });

  it('respects budget limit - budget 1 selects only S task', () => {
    const specPath = join(testDir, 'specs', 'active', 'test-spec.md');
    const options: RunOptions = {
      cwd: testDir,
      iterations: 1,
      all: false,
      noBranch: true,
      stuckThreshold: 3,
      timeoutIdle: 300,
      greedy: false,
      budget: 1,
      quiet: false,
      headless: false,
    };

    const prompt = resolvePrompt(options, specPath);
    const taskSelection = prompt.split('## Task Selection')[1] || '';

    expect(taskSelection).toContain('T001');
    expect(taskSelection).not.toContain('T002');
    expect(taskSelection).not.toContain('T003');
  });

  it('respects budget limit - budget 3 selects S and M tasks', () => {
    const specPath = join(testDir, 'specs', 'active', 'test-spec.md');
    const options: RunOptions = {
      cwd: testDir,
      iterations: 1,
      all: false,
      noBranch: true,
      stuckThreshold: 3,
      timeoutIdle: 300,
      greedy: false,
      budget: 3,
      quiet: false,
      headless: false,
    };

    const prompt = resolvePrompt(options, specPath);
    const taskSelection = prompt.split('## Task Selection')[1] || '';

    expect(taskSelection).toContain('T001');
    expect(taskSelection).toContain('T002');
    expect(taskSelection).not.toContain('T003');
  });

  it('uses default budget 4 when not specified', () => {
    const specPath = join(testDir, 'specs', 'active', 'test-spec.md');
    const options: RunOptions = {
      cwd: testDir,
      iterations: 1,
      all: false,
      noBranch: true,
      stuckThreshold: 3,
      timeoutIdle: 300,
      greedy: false,
      budget: 4,
      quiet: false,
      headless: false,
    };

    const prompt = resolvePrompt(options, specPath);

    // Budget 4 can fit T001(1) + T002(2) = 3 or T003(4)
    // The greedy algorithm should pick T001 + T002
    expect(prompt).toContain('budget 4');
  });

  it('returns base prompt without task context when specPath is undefined', () => {
    const options: RunOptions = {
      cwd: testDir,
      iterations: 1,
      all: false,
      noBranch: true,
      stuckThreshold: 3,
      timeoutIdle: 300,
      greedy: false,
      budget: 4,
      quiet: false,
      headless: false,
    };

    const prompt = resolvePrompt(options, undefined);

    expect(prompt).toContain('You are Ralphie');
    expect(prompt).not.toContain('## Task Selection');
  });
});
