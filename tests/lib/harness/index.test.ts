import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getHarness, claudeHarness, codexHarness, opencodeHarness, validateHarnessEnv } from '../../../src/lib/harness/index.js';
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

    it('should return opencodeHarness for "opencode"', () => {
      const harness = getHarness('opencode');
      expect(harness).toBe(opencodeHarness);
      expect(harness.name).toBe('opencode');
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

    it('should export opencodeHarness with run method', () => {
      expect(opencodeHarness.name).toBe('opencode');
      expect(typeof opencodeHarness.run).toBe('function');
    });
  });
});

describe('API key validation', () => {
  let originalAnthropicKey: string | undefined;
  let originalOpenaiKey: string | undefined;
  let originalOpencodeServerUrl: string | undefined;
  let originalOpencodeApiKey: string | undefined;

  beforeEach(() => {
    originalAnthropicKey = process.env.ANTHROPIC_API_KEY;
    originalOpenaiKey = process.env.OPENAI_API_KEY;
    originalOpencodeServerUrl = process.env.OPENCODE_SERVER_URL;
    originalOpencodeApiKey = process.env.OPENCODE_API_KEY;
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
    if (originalOpencodeServerUrl !== undefined) {
      process.env.OPENCODE_SERVER_URL = originalOpencodeServerUrl;
    } else {
      delete process.env.OPENCODE_SERVER_URL;
    }
    if (originalOpencodeApiKey !== undefined) {
      process.env.OPENCODE_API_KEY = originalOpencodeApiKey;
    } else {
      delete process.env.OPENCODE_API_KEY;
    }
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

  describe('opencodeHarness', () => {
    it('should have correct name and run method', () => {
      expect(opencodeHarness.name).toBe('opencode');
      expect(typeof opencodeHarness.run).toBe('function');
    });

    it('should handle missing opencode configuration gracefully', async () => {
      // Clear opencode environment variables
      delete process.env.OPENCODE_SERVER_URL;
      delete process.env.OPENCODE_API_KEY;

      const events: HarnessEvent[] = [];
      const onEvent = (event: HarnessEvent) => events.push(event);

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<import('../../../src/lib/harness/types.js').HarnessResult>((_, reject) => {
        setTimeout(() => reject(new Error('Test timeout')), 2000);
      });

      try {
        const result = await Promise.race([
          opencodeHarness.run('test prompt', { cwd: '/tmp' }, onEvent),
          timeoutPromise,
        ]);
        
        // If it completes quickly, should fail gracefully
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      } catch (error) {
        // If it times out, that's expected behavior when trying to start server
        expect((error as Error).message).toBe('Test timeout');
        expect(events.length).toBeGreaterThan(0);
      }
    }, 5000);

    it('should attempt to connect when OPENCODE_SERVER_URL is provided', async () => {
      // Set a server URL to avoid trying to start a local server
      process.env.OPENCODE_SERVER_URL = 'http://localhost:8080';

      const events: HarnessEvent[] = [];
      const onEvent = (event: HarnessEvent) => events.push(event);

      const result = await opencodeHarness.run('test prompt', { cwd: '/tmp' }, onEvent);

      // Should fail because the server doesn't actually exist, but should attempt to connect
      expect(result.success).toBe(false);
      expect(events.some(e => e.type === 'thinking')).toBe(true);
    });
  });
});

describe('validateHarnessEnv', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('claude harness', () => {
    it('should return valid when ANTHROPIC_API_KEY is set', () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      const result = validateHarnessEnv('claude');
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('should return invalid when ANTHROPIC_API_KEY is missing', () => {
      delete process.env.ANTHROPIC_API_KEY;
      const result = validateHarnessEnv('claude');
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('ANTHROPIC_API_KEY');
      expect(result.message).toContain('ANTHROPIC_API_KEY');
      expect(result.message).toContain('export');
    });
  });

  describe('codex harness', () => {
    it('should return valid when OPENAI_API_KEY is set', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      const result = validateHarnessEnv('codex');
      expect(result.valid).toBe(true);
    });

    it('should return invalid when OPENAI_API_KEY is missing', () => {
      delete process.env.OPENAI_API_KEY;
      const result = validateHarnessEnv('codex');
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('OPENAI_API_KEY');
    });
  });

  describe('opencode harness', () => {
    it('should return valid when OPENCODE_SERVER_URL is set', () => {
      process.env.OPENCODE_SERVER_URL = 'http://localhost:4096';
      delete process.env.OPENCODE_API_KEY;
      const result = validateHarnessEnv('opencode');
      expect(result.valid).toBe(true);
    });

    it('should return valid when OPENCODE_API_KEY is set', () => {
      delete process.env.OPENCODE_SERVER_URL;
      process.env.OPENCODE_API_KEY = 'test-key';
      const result = validateHarnessEnv('opencode');
      expect(result.valid).toBe(true);
    });

    it('should return invalid when neither OPENCODE var is set', () => {
      delete process.env.OPENCODE_SERVER_URL;
      delete process.env.OPENCODE_API_KEY;
      const result = validateHarnessEnv('opencode');
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('OPENCODE_SERVER_URL');
      expect(result.missing).toContain('OPENCODE_API_KEY');
    });
  });

  it('should include shell config hint in error message', () => {
    delete process.env.ANTHROPIC_API_KEY;
    const result = validateHarnessEnv('claude');
    expect(result.message).toMatch(/zshrc|bashrc|config\.fish/i);
  });
});
