import { TokenMetrics } from './types';

interface ModelPrice {
  inputPerMillion: number;
  outputPerMillion: number;
  cacheReadPerMillion?: number;
  cacheWritePerMillion?: number;
}

export const PRICING_TABLE: Record<string, ModelPrice> = {
  'gemini-2.5-pro': { inputPerMillion: 1.25, outputPerMillion: 5.0, cacheReadPerMillion: 0.31 },
  'gemini-2.5-flash': { inputPerMillion: 0.15, outputPerMillion: 0.6, cacheReadPerMillion: 0.0375 },
  'gemini-3.7-flash': { inputPerMillion: 0.15, outputPerMillion: 0.6, cacheReadPerMillion: 0.0375 },
  'claude-3-7-sonnet': { inputPerMillion: 3.0, outputPerMillion: 15.0, cacheReadPerMillion: 0.30 },
  'claude-3-5-sonnet': { inputPerMillion: 3.0, outputPerMillion: 15.0, cacheReadPerMillion: 0.30 },
  'claude-3-5-haiku': { inputPerMillion: 0.8, outputPerMillion: 4.0, cacheReadPerMillion: 0.08 },
  'gpt-4o': { inputPerMillion: 2.5, outputPerMillion: 10.0, cacheReadPerMillion: 1.25 },
  'gpt-4o-mini': { inputPerMillion: 0.15, outputPerMillion: 0.6, cacheReadPerMillion: 0.075 },
  'deepseek-chat': { inputPerMillion: 0.14, outputPerMillion: 0.28 },
  'default': { inputPerMillion: 1.0, outputPerMillion: 4.0 }
};

export function estimateCost(modelName: string, tokens: TokenMetrics): number {
  const normalizedKey = Object.keys(PRICING_TABLE).find(k => modelName.toLowerCase().includes(k)) || 'default';
  const pricing = PRICING_TABLE[normalizedKey];
  const inputCost = (tokens.input / 1000000) * pricing.inputPerMillion;
  const outputCost = (tokens.output / 1000000) * pricing.outputPerMillion;
  const cacheCost = tokens.cached ? (tokens.cached / 1000000) * (pricing.cacheReadPerMillion || 0) : 0;
  return +(inputCost + outputCost + cacheCost).toFixed(4);
}

export function approximateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}
