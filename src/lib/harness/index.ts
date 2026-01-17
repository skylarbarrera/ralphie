export * from './types.js';

import type { Harness, HarnessName } from './types.js';
import { claudeHarness } from './claude.js';
import { codexHarness } from './codex.js';
import { opencodeHarness } from './opencode.js';

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
