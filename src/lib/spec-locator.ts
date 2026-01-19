import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

export interface LocateSpecResult {
  path: string;
  isLegacy: boolean;
  warning?: string;
}

export class SpecLocatorError extends Error {
  constructor(
    message: string,
    public readonly code: 'NO_SPEC' | 'MULTIPLE_SPECS' | 'NO_DIRECTORY'
  ) {
    super(message);
    this.name = 'SpecLocatorError';
  }
}

export function locateActiveSpec(projectDir: string = process.cwd()): LocateSpecResult {
  const specsActiveDir = join(projectDir, 'specs', 'active');

  if (existsSync(specsActiveDir)) {
    const files = readdirSync(specsActiveDir).filter(
      (f) => f.endsWith('.md') && !f.startsWith('.')
    );

    if (files.length === 1) {
      return {
        path: join(specsActiveDir, files[0]),
        isLegacy: false,
      };
    }

    if (files.length > 1) {
      throw new SpecLocatorError(
        `Multiple specs found in specs/active/: ${files.join(', ')}. Only one active spec is allowed.`,
        'MULTIPLE_SPECS'
      );
    }
  }

  const legacySpecPath = join(projectDir, 'SPEC.md');
  if (existsSync(legacySpecPath)) {
    return {
      path: legacySpecPath,
      isLegacy: true,
      warning:
        'Using legacy SPEC.md at project root. Please migrate to specs/active/ directory.',
    };
  }

  throw new SpecLocatorError(
    'No spec found. Create a spec in specs/active/ or run `ralphie spec "description"`.',
    'NO_SPEC'
  );
}

export function hasActiveSpec(projectDir: string = process.cwd()): boolean {
  try {
    locateActiveSpec(projectDir);
    return true;
  } catch {
    return false;
  }
}

export function getSpecsDirectory(projectDir: string = process.cwd()): string {
  return join(projectDir, 'specs');
}

export function getActiveSpecsDirectory(projectDir: string = process.cwd()): string {
  return join(projectDir, 'specs', 'active');
}

export function getCompletedSpecsDirectory(projectDir: string = process.cwd()): string {
  return join(projectDir, 'specs', 'completed');
}

export function getSpecTemplatesDirectory(projectDir: string = process.cwd()): string {
  return join(projectDir, 'specs', 'templates');
}

export function getLessonsPath(projectDir: string = process.cwd()): string {
  return join(projectDir, 'specs', 'lessons.md');
}
