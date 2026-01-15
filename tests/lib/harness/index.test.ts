import { describe, it, expect } from 'vitest';
import { createHarness, ClaudeCodeHarness } from '../../../src/lib/harness/index.js';

describe('harness factory', () => {
  describe('createHarness', () => {
    it('should create ClaudeCodeHarness for "claude-code"', () => {
      const harness = createHarness('claude-code');
      expect(harness).toBeInstanceOf(ClaudeCodeHarness);
      expect(harness.name).toBe('claude-code');
    });

    it('should throw error for unknown harness', () => {
      expect(() => createHarness('unknown')).toThrow('Unknown harness: unknown');
    });

    it('should include supported harnesses in error message', () => {
      expect(() => createHarness('codex')).toThrow('Supported harnesses: claude-code');
    });
  });
});
