import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

/**
 * Pricing configuration for different AI models
 */
export interface ModelPricing {
  /** Cost per 1M input tokens in USD */
  inputPer1M: number;
  /** Cost per 1M output tokens in USD */
  outputPer1M: number;
}

/**
 * Default pricing for supported models
 * Prices as of January 2025
 */
export const DEFAULT_PRICING: Record<string, ModelPricing> = {
  // Claude models (from Anthropic)
  'claude-sonnet': {
    inputPer1M: 3.0,
    outputPer1M: 15.0,
  },
  'claude-opus': {
    inputPer1M: 15.0,
    outputPer1M: 75.0,
  },
  'claude-haiku': {
    inputPer1M: 0.25,
    outputPer1M: 1.25,
  },
  // OpenAI models (via Codex)
  'gpt-4o': {
    inputPer1M: 2.5,
    outputPer1M: 10.0,
  },
  'gpt-4o-mini': {
    inputPer1M: 0.15,
    outputPer1M: 0.6,
  },
  'o1': {
    inputPer1M: 15.0,
    outputPer1M: 60.0,
  },
  'o1-mini': {
    inputPer1M: 3.0,
    outputPer1M: 12.0,
  },
};

/**
 * Load custom pricing from settings files
 * Priority: project settings > global settings > defaults
 */
export function loadPricing(cwd: string = process.cwd()): Record<string, ModelPricing> {
  const pricing = { ...DEFAULT_PRICING };

  // Try to load global settings
  const globalSettingsPath = join(homedir(), '.ralphie', 'settings.json');
  if (existsSync(globalSettingsPath)) {
    try {
      const globalSettings = JSON.parse(readFileSync(globalSettingsPath, 'utf-8'));
      if (globalSettings.pricing) {
        Object.assign(pricing, globalSettings.pricing);
      }
    } catch (error) {
      // Ignore parse errors
    }
  }

  // Try to load project settings (overrides global)
  const projectSettingsPath = join(cwd, '.ralphie', 'settings.json');
  if (existsSync(projectSettingsPath)) {
    try {
      const projectSettings = JSON.parse(readFileSync(projectSettingsPath, 'utf-8'));
      if (projectSettings.pricing) {
        Object.assign(pricing, projectSettings.pricing);
      }
    } catch (error) {
      // Ignore parse errors
    }
  }

  return pricing;
}

/**
 * Calculate cost in USD from token usage
 *
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @param model - Model name (e.g., 'claude-sonnet', 'gpt-4o')
 * @param cwd - Current working directory for loading custom pricing
 * @returns Cost in USD
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: string = 'claude-sonnet',
  cwd: string = process.cwd()
): number {
  const pricing = loadPricing(cwd);

  // Normalize model name (extract key part)
  let modelKey = model.toLowerCase();
  if (modelKey.includes('sonnet')) {
    modelKey = 'claude-sonnet';
  } else if (modelKey.includes('opus')) {
    modelKey = 'claude-opus';
  } else if (modelKey.includes('haiku')) {
    modelKey = 'claude-haiku';
  } else if (modelKey.includes('gpt-4o-mini')) {
    modelKey = 'gpt-4o-mini';
  } else if (modelKey.includes('gpt-4o')) {
    modelKey = 'gpt-4o';
  } else if (modelKey.includes('o1-mini')) {
    modelKey = 'o1-mini';
  } else if (modelKey.includes('o1')) {
    modelKey = 'o1';
  }

  const modelPricing = pricing[modelKey] || pricing['claude-sonnet']; // fallback to sonnet

  const inputCost = (inputTokens / 1_000_000) * modelPricing.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * modelPricing.outputPer1M;

  return inputCost + outputCost;
}

/**
 * Format token usage and cost for display
 *
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @param costUsd - Cost in USD
 * @returns Formatted string
 */
export function formatCost(inputTokens: number, outputTokens: number, costUsd: number): string {
  const formatNumber = (n: number) => n.toLocaleString('en-US');
  const formatUsd = (n: number) => `$${n.toFixed(4)}`;

  return `tokens: ${formatNumber(inputTokens)} in / ${formatNumber(outputTokens)} out | cost: ${formatUsd(costUsd)}`;
}
