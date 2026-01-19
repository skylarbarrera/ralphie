export * from './types.js';

import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Harness, HarnessName } from './types.js';
import { claudeHarness } from './claude.js';
import { codexHarness } from './codex.js';
import { opencodeHarness } from './opencode.js';

interface HarnessEnvRequirement {
  vars: string[];
  anyOf?: boolean;
  hint: string;
}

const HARNESS_ENV_REQUIREMENTS: Record<HarnessName, HarnessEnvRequirement> = {
  claude: {
    vars: ['ANTHROPIC_API_KEY'],
    hint: 'export ANTHROPIC_API_KEY=sk-ant-...',
  },
  codex: {
    vars: ['OPENAI_API_KEY'],
    hint: 'export OPENAI_API_KEY=sk-...',
  },
  opencode: {
    vars: ['OPENCODE_SERVER_URL', 'OPENCODE_API_KEY'],
    anyOf: true,
    hint: 'export OPENCODE_SERVER_URL=http://localhost:4096 or export OPENCODE_API_KEY=...',
  },
};

function detectShellConfig(): string {
  const home = homedir();
  const configs = [
    { path: join(home, '.zshrc'), shell: 'zsh' },
    { path: join(home, '.bashrc'), shell: 'bash' },
    { path: join(home, '.bash_profile'), shell: 'bash' },
    { path: join(home, '.config', 'fish', 'config.fish'), shell: 'fish' },
  ];

  for (const { path, shell } of configs) {
    if (existsSync(path)) {
      return `Add to ${path} (${shell})`;
    }
  }
  return 'Add to your shell config';
}

export interface HarnessEnvValidation {
  valid: boolean;
  missing: string[];
  message: string;
}

/**
 * Validate that required environment variables are set for a harness.
 *
 * @param name - The harness name
 * @returns Validation result with missing vars and helpful message
 */
export function validateHarnessEnv(name: HarnessName): HarnessEnvValidation {
  const req = HARNESS_ENV_REQUIREMENTS[name];
  const missing = req.vars.filter((v) => !process.env[v]);

  if (req.anyOf) {
    // For 'anyOf', valid if at least one is set
    if (missing.length < req.vars.length) {
      return { valid: true, missing: [], message: '' };
    }
  } else {
    // All vars must be set
    if (missing.length === 0) {
      return { valid: true, missing: [], message: '' };
    }
  }

  const shellHint = detectShellConfig();
  const message = [
    `Missing required environment variable${missing.length > 1 ? 's' : ''} for ${name} harness:`,
    `  ${missing.join(', ')}`,
    '',
    `${shellHint}:`,
    `  ${req.hint}`,
    '',
    'Then restart your terminal or run: source ~/.zshrc',
  ].join('\n');

  return { valid: false, missing, message };
}

/**
 * Get a harness by name.
 *
 * Supports 'claude' (default), 'codex', and 'opencode'.
 *
 * @param name - The harness name ('claude', 'codex', or 'opencode')
 * @returns The harness implementation
 */
export function getHarness(name: HarnessName = 'claude'): Harness {
  switch (name) {
    case 'claude':
      return claudeHarness;
    case 'codex':
      return codexHarness;
    case 'opencode':
      return opencodeHarness;
  }
}

export { claudeHarness } from './claude.js';
export { codexHarness } from './codex.js';
export { opencodeHarness } from './opencode.js';
