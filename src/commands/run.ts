import { existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function isGitRepo(cwd: string): boolean {
  try {
    execSync('git rev-parse --is-inside-work-tree', { cwd, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function hasUncommittedChanges(cwd: string): boolean {
  try {
    const status = execSync('git status --porcelain', { cwd, encoding: 'utf-8' });
    return status.trim().length > 0;
  } catch {
    return false;
  }
}

export function validateProject(cwd: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (isGitRepo(cwd) && hasUncommittedChanges(cwd)) {
    errors.push('Uncommitted changes detected. Commit or stash before running Ralphie.');
  }

  const specPath = join(cwd, 'SPEC.md');
  if (!existsSync(specPath)) {
    errors.push('SPEC.md not found. Create a SPEC.md with your project tasks.');
  }

  const ralphieMdPath = join(cwd, '.claude', 'ralphie.md');
  if (!existsSync(ralphieMdPath)) {
    errors.push('.claude/ralphie.md not found. Run `ralphie init` first.');
  }

  const aiRalphiePath = join(cwd, '.ai', 'ralphie');
  if (!existsSync(aiRalphiePath)) {
    errors.push('.ai/ralphie/ not found. Run `ralphie init` first.');
  }

  const valid = errors.length === 0;

  return { valid, errors, warnings };
}
