import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getHarnessName, loadConfig } from '../../src/lib/config-loader.js';
import fs from 'fs';

vi.mock('fs');

describe('config-loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.RALPH_HARNESS;
  });

  afterEach(() => {
    delete process.env.RALPH_HARNESS;
  });

  describe('getHarnessName', () => {
    it('should return CLI flag harness when provided and valid', () => {
      const result = getHarnessName('codex', '/tmp');
      expect(result).toBe('codex');
    });

    it('should return claude when CLI flag is provided', () => {
      const result = getHarnessName('claude', '/tmp');
      expect(result).toBe('claude');
    });

    it('should return environment variable when valid and CLI flag not provided', () => {
      process.env.RALPH_HARNESS = 'codex';
      const result = getHarnessName(undefined, '/tmp');
      expect(result).toBe('codex');
    });

    it('should return config file harness when valid and CLI/env not provided', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('harness: codex\n');

      const result = getHarnessName(undefined, '/tmp');
      expect(result).toBe('codex');
    });

    it('should return default "claude" when nothing provided', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = getHarnessName(undefined, '/tmp');
      expect(result).toBe('claude');
    });

    it('should return default "claude" when invalid harness provided', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = getHarnessName('invalid-harness', '/tmp');
      expect(result).toBe('claude');
    });

    it('should skip invalid env and use config file', () => {
      process.env.RALPH_HARNESS = 'invalid-harness';
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('harness: codex\n');

      const result = getHarnessName(undefined, '/tmp');
      expect(result).toBe('codex');
    });

    it('should prioritize CLI over env', () => {
      process.env.RALPH_HARNESS = 'codex';
      const result = getHarnessName('claude', '/tmp');
      expect(result).toBe('claude');
    });

    it('should prioritize env over config file', () => {
      process.env.RALPH_HARNESS = 'codex';
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('harness: claude\n');

      const result = getHarnessName(undefined, '/tmp');
      expect(result).toBe('codex');
    });

    it('should prioritize config file over default', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('harness: codex\n');

      const result = getHarnessName(undefined, '/tmp');
      expect(result).toBe('codex');
    });
  });

  describe('loadConfig', () => {
    it('should return null when config file does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = loadConfig('/tmp');
      expect(result).toBeNull();
    });

    it('should load config from .ralph/config.yml', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('harness: claude\n');

      const result = loadConfig('/tmp');
      expect(result).toEqual({ harness: 'claude' });
      expect(fs.readFileSync).toHaveBeenCalledWith('/tmp/.ralph/config.yml', 'utf-8');
    });

    it('should return null on read error', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('read error');
      });

      const result = loadConfig('/tmp');
      expect(result).toBeNull();
    });

    it('should return null on YAML parse error', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('invalid: yaml: content: [');

      const result = loadConfig('/tmp');
      expect(result).toBeNull();
    });
  });
});
