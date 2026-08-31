import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as https from 'https';
import { TokenMetrics } from './types';

export interface ModelPrice {
  inputPerMillion: number;
  outputPerMillion: number;
  cacheReadPerMillion?: number;
  cacheWritePerMillion?: number;
}

export const EMBEDDED_PRICING_TABLE: Record<string, ModelPrice> = {
  'gemini-2.5-pro': { inputPerMillion: 1.25, outputPerMillion: 5.0, cacheReadPerMillion: 0.31 },
  'gemini-2-5-pro': { inputPerMillion: 1.25, outputPerMillion: 5.0, cacheReadPerMillion: 0.31 },
  'gemini-2.5-flash': { inputPerMillion: 0.15, outputPerMillion: 0.6, cacheReadPerMillion: 0.0375 },
  'gemini-2-5-flash': { inputPerMillion: 0.15, outputPerMillion: 0.6, cacheReadPerMillion: 0.0375 },
  'gemini-3.7-flash': { inputPerMillion: 0.15, outputPerMillion: 0.6, cacheReadPerMillion: 0.0375 },
  'gemini-3-7-flash': { inputPerMillion: 0.15, outputPerMillion: 0.6, cacheReadPerMillion: 0.0375 },
  'claude-3.7-sonnet': { inputPerMillion: 3.0, outputPerMillion: 15.0, cacheReadPerMillion: 0.30 },
  'claude-3-7-sonnet': { inputPerMillion: 3.0, outputPerMillion: 15.0, cacheReadPerMillion: 0.30 },
  'claude-3.5-sonnet': { inputPerMillion: 3.0, outputPerMillion: 15.0, cacheReadPerMillion: 0.30 },
  'claude-3-5-sonnet': { inputPerMillion: 3.0, outputPerMillion: 15.0, cacheReadPerMillion: 0.30 },
  'claude-3.5-haiku': { inputPerMillion: 0.8, outputPerMillion: 4.0, cacheReadPerMillion: 0.08 },
  'claude-3-5-haiku': { inputPerMillion: 0.8, outputPerMillion: 4.0, cacheReadPerMillion: 0.08 },
  'gpt-4o': { inputPerMillion: 2.5, outputPerMillion: 10.0, cacheReadPerMillion: 1.25 },
  'gpt-4o-mini': { inputPerMillion: 0.15, outputPerMillion: 0.6, cacheReadPerMillion: 0.075 },
  'o3-mini': { inputPerMillion: 1.10, outputPerMillion: 4.40, cacheReadPerMillion: 0.55 },
  'deepseek-chat': { inputPerMillion: 0.14, outputPerMillion: 0.28 },
  'deepseek-reasoner': { inputPerMillion: 0.55, outputPerMillion: 2.19 },
  'default': { inputPerMillion: 1.0, outputPerMillion: 4.0 }
};

export class PricingEngine {
  private static instance: PricingEngine;
  private pricingTable: Record<string, ModelPrice>;
  private cacheFilePath: string;
  private syncIntervalMs: number = 24 * 60 * 60 * 1000; // 24 Hours
  private openRouterApiUrl: string = 'https://openrouter.ai/api/v1/models';

  private constructor() {
    const configDir = path.join(os.homedir(), '.prompttracker');
    if (!fs.existsSync(configDir)) {
      try { fs.mkdirSync(configDir, { recursive: true }); } catch {}
    }
    this.cacheFilePath = path.join(configDir, 'pricing.json');
    this.pricingTable = { ...EMBEDDED_PRICING_TABLE };

    this.loadCachedPricing();
  }

  public static getInstance(): PricingEngine {
    if (!PricingEngine.instance) {
      PricingEngine.instance = new PricingEngine();
    }
    return PricingEngine.instance;
  }

  private loadCachedPricing(): void {
    if (fs.existsSync(this.cacheFilePath)) {
      try {
        const raw = fs.readFileSync(this.cacheFilePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          this.pricingTable = { ...this.pricingTable, ...parsed };
        }
      } catch {}
    }
  }

  /**
   * Syncs latest pricing from OpenRouter's live model registry every 24 hours
   */
  public syncRemotePricingAsync(): void {
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        const stats = fs.statSync(this.cacheFilePath);
        const ageMs = Date.now() - stats.mtimeMs;
        if (ageMs < this.syncIntervalMs) {
          return; // Cache is still fresh (<24h)
        }
      }

      // Non-blocking background fetch to OpenRouter
      const req = https.get(this.openRouterApiUrl, { headers: { 'User-Agent': 'PromptTracker/0.1.0' } }, (res) => {
        if (res.statusCode === 200) {
          let body = '';
          res.on('data', chunk => { body += chunk; });
          res.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              if (parsed && Array.isArray(parsed.data)) {
                const updatedRates: Record<string, ModelPrice> = {};

                for (const m of parsed.data) {
                  if (m.id && m.pricing) {
                    const promptPrice = parseFloat(m.pricing.prompt || '0');
                    const completionPrice = parseFloat(m.pricing.completion || '0');
                    const inputPerMillion = +(promptPrice * 1_000_000).toFixed(4);
                    const outputPerMillion = +(completionPrice * 1_000_000).toFixed(4);

                    if (inputPerMillion > 0 || outputPerMillion > 0) {
                      // Normalize key (e.g., 'anthropic/claude-3.7-sonnet' -> 'claude-3.7-sonnet' & 'claude-3-7-sonnet')
                      const slug = m.id.split('/').pop() || m.id;
                      const cleanSlug = slug.replace(/\./g, '-');
                      updatedRates[slug.toLowerCase()] = { inputPerMillion, outputPerMillion };
                      updatedRates[cleanSlug.toLowerCase()] = { inputPerMillion, outputPerMillion };
                    }
                  }
                }

                if (Object.keys(updatedRates).length > 0) {
                  this.pricingTable = { ...this.pricingTable, ...updatedRates };
                  fs.writeFileSync(this.cacheFilePath, JSON.stringify(this.pricingTable, null, 2), 'utf8');
                }
              }
            } catch {}
          });
        }
      });

      req.on('error', () => {
        // Fallback silently if offline
      });
      req.setTimeout(5000, () => req.destroy());
    } catch {}
  }

  public estimateCost(modelName: string, tokens: TokenMetrics): number {
    const query = modelName.toLowerCase().replace(/\./g, '-');
    const sortedKeys = Object.keys(this.pricingTable).filter(k => k !== 'default').sort((a, b) => b.length - a.length);
    const matchedKey =
      sortedKeys.find(k => k.toLowerCase() === query) ||
      sortedKeys.find(k => query.includes(k.toLowerCase())) ||
      sortedKeys.find(k => k.toLowerCase().includes(query)) ||
      'default';
    const pricing = this.pricingTable[matchedKey] || EMBEDDED_PRICING_TABLE.default;
    const inputCost = (tokens.input / 1000000) * pricing.inputPerMillion;
    const outputCost = (tokens.output / 1000000) * pricing.outputPerMillion;
    const cacheCost = tokens.cached ? (tokens.cached / 1000000) * (pricing.cacheReadPerMillion || 0) : 0;
    return +(inputCost + outputCost + cacheCost).toFixed(4);
  }

  public getPricingTable(): Record<string, ModelPrice> {
    return { ...this.pricingTable };
  }
}

export function estimateCost(modelName: string, tokens: TokenMetrics): number {
  return PricingEngine.getInstance().estimateCost(modelName, tokens);
}

export function syncModelPricingInBackground(): void {
  PricingEngine.getInstance().syncRemotePricingAsync();
}

export function approximateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}
