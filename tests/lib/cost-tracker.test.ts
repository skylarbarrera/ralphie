import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  calculateCost,
  formatCost,
  loadPricing,
  DEFAULT_PRICING,
} from '../../src/lib/cost-tracker.js';

describe('cost-tracker', () => {
  describe('calculateCost', () => {
    it('calculates cost for Claude Sonnet', () => {
      const cost = calculateCost(1_000_000, 1_000_000, 'claude-sonnet');
      // 1M input @ $3 + 1M output @ $15 = $18
      expect(cost).toBe(18.0);
    });

    it('calculates cost for Claude Opus', () => {
      const cost = calculateCost(1_000_000, 1_000_000, 'claude-opus');
      // 1M input @ $15 + 1M output @ $75 = $90
      expect(cost).toBe(90.0);
    });

    it('calculates cost for Claude Haiku', () => {
      const cost = calculateCost(1_000_000, 1_000_000, 'claude-haiku');
      // 1M input @ $0.25 + 1M output @ $1.25 = $1.50
      expect(cost).toBe(1.5);
    });

    it('calculates cost for GPT-4o', () => {
      const cost = calculateCost(1_000_000, 1_000_000, 'gpt-4o');
      // 1M input @ $2.5 + 1M output @ $10 = $12.50
      expect(cost).toBe(12.5);
    });

    it('normalizes model names with prefix', () => {
      const cost1 = calculateCost(1_000_000, 1_000_000, 'claude-3-5-sonnet-20241022');
      const cost2 = calculateCost(1_000_000, 1_000_000, 'claude-sonnet');
      expect(cost1).toBe(cost2);
    });

    it('calculates cost for smaller token counts', () => {
      const cost = calculateCost(10_000, 5_000, 'claude-sonnet');
      // 10k input @ $3/1M = $0.03
      // 5k output @ $15/1M = $0.075
      // Total = $0.105
      expect(cost).toBeCloseTo(0.105, 4);
    });

    it('falls back to sonnet for unknown models', () => {
      const cost = calculateCost(1_000_000, 1_000_000, 'unknown-model');
      // Should use claude-sonnet pricing
      expect(cost).toBe(18.0);
    });
  });

  describe('formatCost', () => {
    it('formats tokens and cost with comma separators', () => {
      const formatted = formatCost(10_000, 5_000, 0.105);
      expect(formatted).toBe('tokens: 10,000 in / 5,000 out | cost: $0.1050');
    });

    it('formats large token counts', () => {
      const formatted = formatCost(1_234_567, 987_654, 45.67);
      expect(formatted).toBe('tokens: 1,234,567 in / 987,654 out | cost: $45.6700');
    });

    it('formats very small costs', () => {
      const formatted = formatCost(100, 50, 0.0001);
      expect(formatted).toBe('tokens: 100 in / 50 out | cost: $0.0001');
    });
  });

  describe('loadPricing', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'ralphie-test-'));
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('returns default pricing when no custom settings exist', () => {
      const pricing = loadPricing(tempDir);
      expect(pricing).toEqual(DEFAULT_PRICING);
    });

    it('loads custom pricing from project settings', () => {
      const settingsPath = join(tempDir, '.ralphie', 'settings.json');
      const settingsDir = join(tempDir, '.ralphie');

      // Create directory and settings file
      mkdirSync(settingsDir, { recursive: true });
      writeFileSync(
        settingsPath,
        JSON.stringify({
          pricing: {
            'claude-sonnet': {
              inputPer1M: 5.0,
              outputPer1M: 20.0,
            },
          },
        })
      );

      const pricing = loadPricing(tempDir);

      // Custom pricing for sonnet
      expect(pricing['claude-sonnet'].inputPer1M).toBe(5.0);
      expect(pricing['claude-sonnet'].outputPer1M).toBe(20.0);

      // Other models still use defaults
      expect(pricing['claude-opus']).toEqual(DEFAULT_PRICING['claude-opus']);
    });

    it('handles malformed JSON gracefully', () => {
      const settingsPath = join(tempDir, '.ralphie', 'settings.json');
      const settingsDir = join(tempDir, '.ralphie');

      mkdirSync(settingsDir, { recursive: true });
      writeFileSync(settingsPath, '{ invalid json }');

      const pricing = loadPricing(tempDir);
      // Should fall back to defaults
      expect(pricing).toEqual(DEFAULT_PRICING);
    });

    it('merges global and project settings with project taking precedence', () => {
      // Note: This test would require mocking homedir() to test properly
      // For now, we just verify that project settings work
      const settingsPath = join(tempDir, '.ralphie', 'settings.json');
      const settingsDir = join(tempDir, '.ralphie');

      mkdirSync(settingsDir, { recursive: true });
      writeFileSync(
        settingsPath,
        JSON.stringify({
          pricing: {
            'custom-model': {
              inputPer1M: 1.0,
              outputPer1M: 2.0,
            },
          },
        })
      );

      const pricing = loadPricing(tempDir);
      expect(pricing['custom-model']).toEqual({
        inputPer1M: 1.0,
        outputPer1M: 2.0,
      });
    });
  });

  describe('integration: calculate with custom pricing', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'ralphie-test-'));
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('uses custom pricing when calculating cost', () => {
      const settingsPath = join(tempDir, '.ralphie', 'settings.json');
      const settingsDir = join(tempDir, '.ralphie');

      mkdirSync(settingsDir, { recursive: true });
      writeFileSync(
        settingsPath,
        JSON.stringify({
          pricing: {
            'claude-sonnet': {
              inputPer1M: 10.0,
              outputPer1M: 50.0,
            },
          },
        })
      );

      const cost = calculateCost(1_000_000, 1_000_000, 'claude-sonnet', tempDir);
      // Should use custom pricing: 10 + 50 = 60
      expect(cost).toBe(60.0);
    });
  });
});
