import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

/**
 * Ralph configuration from .ralph/config.yml
 */
export interface RalphConfig {
  /** The harness to use (e.g., "claude-code", "codex") */
  harness?: string;
}

/**
 * Get the harness name from configuration with priority order:
 * 1. CLI flag (explicit override)
 * 2. Environment variable (RALPH_HARNESS)
 * 3. Config file (.ralph/config.yml)
 * 4. Default ("claude-code")
 *
 * @param cliHarness - Harness name from CLI flag
 * @param cwd - Working directory to search for config file
 * @returns The resolved harness name
 */
export function getHarnessName(cliHarness: string | undefined, cwd: string): string {
  if (cliHarness) {
    return cliHarness;
  }

  const envHarness = process.env.RALPH_HARNESS;
  if (envHarness) {
    return envHarness;
  }

  const config = loadConfig(cwd);
  if (config?.harness) {
    return config.harness;
  }

  return 'claude-code';
}

/**
 * Load Ralph configuration from .ralph/config.yml
 *
 * @param cwd - Working directory to search for config file
 * @returns The parsed config or null if not found
 */
export function loadConfig(cwd: string): RalphConfig | null {
  const configPath = path.join(cwd, '.ralph', 'config.yml');

  try {
    if (!fs.existsSync(configPath)) {
      return null;
    }

    const content = fs.readFileSync(configPath, 'utf-8');
    const config = yaml.load(content) as RalphConfig;

    return config;
  } catch (error) {
    return null;
  }
}
