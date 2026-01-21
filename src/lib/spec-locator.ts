import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  getActiveSpecsDirectory,
  getSpecsDirectory,
  getCompletedSpecsDirectory,
  getSpecTemplatesDirectory,
  getLessonsPath,
  checkForOldStructure,
  getMigrationMessage,
} from './paths.js';

export interface LocateSpecResult {
  path: string;
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
  const specsActiveDir = getActiveSpecsDirectory(projectDir);

  if (existsSync(specsActiveDir)) {
    const files = readdirSync(specsActiveDir).filter(
      (f) => f.endsWith('.md') && !f.startsWith('.')
    );

    if (files.length === 1) {
      return {
        path: join(specsActiveDir, files[0]),
      };
    }

    if (files.length > 1) {
      throw new SpecLocatorError(
        `Multiple specs found in ${specsActiveDir}: ${files.join(', ')}. Only one active spec is allowed.`,
        'MULTIPLE_SPECS'
      );
    }
  }

  // Show migration message if old structure detected
  const migrationHint = checkForOldStructure(projectDir)
    ? `\n\n${getMigrationMessage()}`
    : '';

  throw new SpecLocatorError(
    `No spec found. Create a spec in .ralphie/specs/active/ or run \`ralphie spec "description"\`.${migrationHint}`,
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

// Re-export from paths module for backward compatibility
export { getSpecsDirectory, getActiveSpecsDirectory, getCompletedSpecsDirectory, getSpecTemplatesDirectory, getLessonsPath };
