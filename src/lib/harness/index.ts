export * from './types.js';
export * from './claude-code-harness.js';

import { Harness } from './types.js';
import { ClaudeCodeHarness } from './claude-code-harness.js';

/**
 * Create a harness instance by name.
 *
 * Currently only supports "claude-code". Other harnesses (codex, opencode, etc.)
 * can be added in the future by implementing the Harness interface.
 *
 * @param name - The harness name (e.g., "claude-code", "codex")
 * @returns A Harness instance
 * @throws Error if the harness name is not recognized
 */
export function createHarness(name: string): Harness {
  switch (name) {
    case 'claude-code':
      return new ClaudeCodeHarness();
    default:
      throw new Error(`Unknown harness: ${name}. Supported harnesses: claude-code`);
  }
}
