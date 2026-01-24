import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

/**
 * Path resolution utilities for .ralphie/ structure.
 * Supports backward compatibility with old specs/ structure.
 */

export interface PathConfig {
  /** Project root directory */
  projectRoot: string;
  /** Uses new .ralphie/ structure */
  usesNewStructure: boolean;
  /** Uses old specs/ structure */
  usesOldStructure: boolean;
}

/**
 * Detect which structure the project uses
 */
export function detectStructure(projectDir: string = process.cwd()): PathConfig {
  const newStructure = existsSync(join(projectDir, '.ralphie'));
  const oldStructure = existsSync(join(projectDir, 'specs'));

  return {
    projectRoot: projectDir,
    usesNewStructure: newStructure,
    usesOldStructure: oldStructure && !newStructure,
  };
}

/**
 * Get the ralphie root directory (.ralphie/ or project root for old structure)
 */
export function getRalphieRoot(projectDir: string = process.cwd()): string {
  const config = detectStructure(projectDir);

  if (config.usesNewStructure) {
    return join(projectDir, '.ralphie');
  }

  // Old structure: specs/ and STATE.txt at project root
  return projectDir;
}

/**
 * Get specs directory path
 */
export function getSpecsDirectory(projectDir: string = process.cwd()): string {
  const config = detectStructure(projectDir);

  if (config.usesNewStructure) {
    return join(projectDir, '.ralphie', 'specs');
  }

  return join(projectDir, 'specs');
}

/**
 * Get active specs directory path
 */
export function getActiveSpecsDirectory(projectDir: string = process.cwd()): string {
  return join(getSpecsDirectory(projectDir), 'active');
}

/**
 * Get completed specs directory path
 */
export function getCompletedSpecsDirectory(projectDir: string = process.cwd()): string {
  return join(getSpecsDirectory(projectDir), 'completed');
}

/**
 * Get spec templates directory path
 */
export function getSpecTemplatesDirectory(projectDir: string = process.cwd()): string {
  return join(getSpecsDirectory(projectDir), 'templates');
}

/**
 * Get archive directory path
 */
export function getArchiveDirectory(projectDir: string = process.cwd()): string {
  return join(getSpecsDirectory(projectDir), 'archive');
}

/**
 * Get lessons/learnings path (old: specs/lessons.md, new: .ralphie/learnings/)
 */
export function getLessonsPath(projectDir: string = process.cwd()): string {
  const config = detectStructure(projectDir);

  if (config.usesNewStructure) {
    // New structure uses learnings directory
    return join(projectDir, '.ralphie', 'learnings');
  }

  return join(projectDir, 'specs', 'lessons.md');
}

/**
 * Get STATE.txt path (old: ./STATE.txt, new: .ralphie/state.txt)
 */
export function getStatePath(projectDir: string = process.cwd()): string {
  const config = detectStructure(projectDir);

  if (config.usesNewStructure) {
    return join(projectDir, '.ralphie', 'state.txt');
  }

  return join(projectDir, 'STATE.txt');
}

/**
 * Get llms.txt path (new structure only)
 */
export function getLlmsTxtPath(projectDir: string = process.cwd()): string {
  return join(projectDir, '.ralphie', 'llms.txt');
}

/**
 * Get project learnings directory (new structure only)
 */
export function getProjectLearningsDirectory(projectDir: string = process.cwd()): string {
  return join(projectDir, '.ralphie', 'learnings');
}

/**
 * Get project settings.json path (new structure only)
 */
export function getProjectSettingsPath(projectDir: string = process.cwd()): string {
  return join(projectDir, '.ralphie', 'settings.json');
}

/**
 * Get global ralphie directory (~/.ralphie/)
 */
export function getGlobalRalphieDirectory(): string {
  return join(homedir(), '.ralphie');
}

/**
 * Get global learnings directory
 */
export function getGlobalLearningsDirectory(): string {
  return join(getGlobalRalphieDirectory(), 'learnings');
}

/**
 * Get global settings.json path
 */
export function getGlobalSettingsPath(): string {
  return join(getGlobalRalphieDirectory(), 'settings.json');
}

/**
 * Check if old structure exists and show migration message
 */
export function checkForOldStructure(projectDir: string = process.cwd()): boolean {
  const config = detectStructure(projectDir);
  return config.usesOldStructure;
}

/**
 * Get migration message for old structure
 */
export function getMigrationMessage(): string {
  return `
⚠️  Old project structure detected (specs/ + STATE.txt in root)
    Please see MIGRATION.md for upgrade instructions.

    Quick migration: Ask your AI to "Follow MIGRATION.md to upgrade this project"
`.trim();
}
