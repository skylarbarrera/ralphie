import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getHarness, claudeHarness, codexHarness } from '../../../src/lib/harness/index.js';
import type { HarnessEvent } from '../../../src/lib/harness/types.js';

describe('harness factory', () => {
  describe('getHarness', () => {
    it('should return claudeHarness by default', () => {
      const harness = getHarness();
      expect(harness).toBe(claudeHarness);
      expect(harness.name).toBe('claude');
    });

    it('should return claudeHarness for "claude"', () => {
      const harness = getHarness('claude');
      expect(harness).toBe(claudeHarness);
      expect(harness.name).toBe('claude');
    });

    it('should return codexHarness for "codex"', () => {
      const harness = getHarness('codex');
      expect(harness).toBe(codexHarness);
      expect(harness.name).toBe('codex');
    });
  });

  describe('harness exports', () => {
    it('should export claudeHarness with run method', () => {
      expect(claudeHarness.name).toBe('claude');
      expect(typeof claudeHarness.run).toBe('function');
    });

    it('should export codexHarness with run method', () => {
      expect(codexHarness.name).toBe('codex');
      expect(typeof codexHarness.run).toBe('function');
    });
  });
});

describe('API key validation', () => {
  let originalAnthropicKey: string | undefined;
  let originalOpenaiKey: string | undefined;

  beforeEach(() => {
    originalAnthropicKey = process.env.ANTHROPIC_API_KEY;
    originalOpenaiKey = process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    if (originalAnthropicKey !== undefined) {
      process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }
    if (originalOpenaiKey !== undefined) {
      process.env.OPENAI_API_KEY = originalOpenaiKey;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
  });

  describe('claudeHarness', () => {
    it('should fail with clear error when ANTHROPIC_API_KEY is missing', async () => {
      delete process.env.ANTHROPIC_API_KEY;

      const events: HarnessEvent[] = [];
      const onEvent = (event: HarnessEvent) => events.push(event);

      const result = await claudeHarness.run('test prompt', { cwd: '/tmp' }, onEvent);

      expect(result.success).toBe(false);
      expect(result.error).toContain('ANTHROPIC_API_KEY');
      expect(result.error).toContain('export ANTHROPIC_API_KEY=');
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('error');
    });
  });

  describe('codexHarness', () => {
    it('should fail with clear error when OPENAI_API_KEY is missing', async () => {
      delete process.env.OPENAI_API_KEY;

      const events: HarnessEvent[] = [];
      const onEvent = (event: HarnessEvent) => events.push(event);

      const result = await codexHarness.run('test prompt', { cwd: '/tmp' }, onEvent);

      expect(result.success).toBe(false);
      expect(result.error).toContain('OPENAI_API_KEY');
      expect(result.error).toContain('export OPENAI_API_KEY=');
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('error');
    });
  });
});
