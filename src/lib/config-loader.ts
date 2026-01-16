import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

import type { HarnessName } from './harness/types.js';

/**
 * Ralphie configuration from .ralphie/config.yml
 */
export interface RalphieConfig {
  /** The harness to use ('claude' or 'codex') */
  harness?: HarnessName;
}

/**
 * Valid harness names that Ralphie supports.
 */
const VALID_HARNESSES: HarnessName[] = ['claude', 'codex'];

/**
 * Get the harness name from configuration with priority order:
 * 1. CLI flag (explicit override)
 * 2. Environment variable (RALPH_HARNESS)
 * 3. Config file (.ralphie/config.yml)
 * 4. Default ('claude')
 *
 * @param cliHarness - Harness name from CLI flag
 * @param cwd - Working directory to search for config file
 * @returns The resolved harness name
 */
export function getHarnessName(cliHarness: string | undefined, cwd: string): HarnessName {
  const candidates = [
    cliHarness,
    process.env.RALPH_HARNESS,
    loadConfig(cwd)?.harness,
  ];

  for (const candidate of candidates) {
    if (candidate && VALID_HARNESSES.includes(candidate as HarnessName)) {
      return candidate as HarnessName;
    }
  }

  return 'claude';
}

/**
 * Load Ralphie configuration from .ralphie/config.yml
 *
 * @param cwd - Working directory to search for config file
 * @returns The parsed config or null if not found
 */
export function loadConfig(cwd: string): RalphieConfig | null {
  const configPath = path.join(cwd, '.ralphie', 'config.yml');

  try {
    if (!fs.existsSync(configPath)) {
      return null;
    }

    const content = fs.readFileSync(configPath, 'utf-8');
    const config = yaml.load(content) as RalphieConfig;

    return config;
  } catch (error) {
    return null;
  }
}
