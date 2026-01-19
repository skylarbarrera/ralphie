import { existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { locateActiveSpec, SpecLocatorError } from '../lib/spec-locator.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  specPath?: string;
  isLegacySpec?: boolean;
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
  let isLegacySpec = false;

  if (isGitRepo(cwd) && hasUncommittedChanges(cwd)) {
    errors.push('Uncommitted changes detected. Commit or stash before running Ralphie.');
  }

  try {
    const located = locateActiveSpec(cwd);
    specPath = located.path;
    isLegacySpec = located.isLegacy;
    if (located.isLegacy) {
      // V2-only: Legacy SPEC.md is now an error, not a warning
      errors.push(
        'Legacy SPEC.md found at project root. Migrate to V2 format: move to specs/active/ and use task IDs (T001, T002).'
      );
    }
  } catch (err) {
    if (err instanceof SpecLocatorError) {
      if (err.code === 'MULTIPLE_SPECS') {
        errors.push(err.message);
      } else {
        errors.push('No spec found. Create a spec in specs/active/ or run `ralphie spec "description"`.');
      }
    } else {
      errors.push('No spec found. Create a spec in specs/active/ or run `ralphie spec "description"`.');
    }
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

  return { valid, errors, warnings, specPath, isLegacySpec };
}
