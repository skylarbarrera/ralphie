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
    it('should return CLI flag harness when provided', () => {
      const result = getHarnessName('codex', '/tmp');
      expect(result).toBe('codex');
    });

    it('should return environment variable when CLI flag not provided', () => {
      process.env.RALPH_HARNESS = 'opencode';
      const result = getHarnessName(undefined, '/tmp');
      expect(result).toBe('opencode');
    });

    it('should return config file harness when CLI and env not provided', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('harness: custom-harness\n');

      const result = getHarnessName(undefined, '/tmp');
      expect(result).toBe('custom-harness');
    });

    it('should return default "claude-code" when nothing provided', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = getHarnessName(undefined, '/tmp');
      expect(result).toBe('claude-code');
    });

    it('should prioritize CLI over env', () => {
      process.env.RALPH_HARNESS = 'env-harness';
      const result = getHarnessName('cli-harness', '/tmp');
      expect(result).toBe('cli-harness');
    });

    it('should prioritize env over config file', () => {
      process.env.RALPH_HARNESS = 'env-harness';
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('harness: config-harness\n');

      const result = getHarnessName(undefined, '/tmp');
      expect(result).toBe('env-harness');
    });

    it('should prioritize config file over default', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('harness: config-harness\n');

      const result = getHarnessName(undefined, '/tmp');
      expect(result).toBe('config-harness');
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
      vi.mocked(fs.readFileSync).mockReturnValue('harness: claude-code\n');

      const result = loadConfig('/tmp');
      expect(result).toEqual({ harness: 'claude-code' });
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
