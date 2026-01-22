import { existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { locateActiveSpec, SpecLocatorError } from '../lib/spec-locator.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  specPath?: string;
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
  let specPath: string | undefined;

  if (isGitRepo(cwd) && hasUncommittedChanges(cwd)) {
    errors.push('Uncommitted changes detected. Commit or stash before running Ralphie.');
  }

  try {
    const located = locateActiveSpec(cwd);
    specPath = located.path;
  } catch (err) {
    if (err instanceof SpecLocatorError) {
      errors.push(err.message);
    } else {
      errors.push('No spec found. Create a spec in .ralphie/specs/active/ or run `ralphie spec "description"`.');
    }
  }

  const ralphieMdPath = join(cwd, '.claude', 'ralphie.md');
  if (!existsSync(ralphieMdPath)) {
    errors.push('.claude/ralphie.md not found. Run `ralphie init` first.');
  }

  const ralphiePath = join(cwd, '.ralphie');
  if (!existsSync(ralphiePath)) {
    errors.push('.ralphie/ not found. Run `ralphie init` first.');
  }

  const valid = errors.length === 0;

  return { valid, errors, warnings, specPath };
}
