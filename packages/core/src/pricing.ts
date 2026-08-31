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
  'gemini-2.5-flash': { inputPerMillion: 0.15, outputPerMillion: 0.6, cacheReadPerMillion: 0.0375 },
  'gemini-3.7-flash': { inputPerMillion: 0.15, outputPerMillion: 0.6, cacheReadPerMillion: 0.0375 },
  'claude-3-7-sonnet': { inputPerMillion: 3.0, outputPerMillion: 15.0, cacheReadPerMillion: 0.30 },
  'claude-3-5-sonnet': { inputPerMillion: 3.0, outputPerMillion: 15.0, cacheReadPerMillion: 0.30 },
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
  private remoteUrl: string = 'https://raw.githubusercontent.com/A-R-Rony/PromptTracker/main/data/pricing.json';

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
   * Syncs latest pricing from remote CDN/GitHub if cache is older than 24h
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

      // Non-blocking background fetch
      https.get(this.remoteUrl, (res) => {
        if (res.statusCode === 200) {
          let body = '';
          res.on('data', chunk => { body += chunk; });
          res.on('end', () => {
            try {
              const updated = JSON.parse(body);
              if (updated && typeof updated === 'object') {
                this.pricingTable = { ...this.pricingTable, ...updated };
                fs.writeFileSync(this.cacheFilePath, JSON.stringify(updated, null, 2), 'utf8');
              }
            } catch {}
          });
        }
      }).on('error', () => {
        // Silent network failure fallback to embedded/cached pricing
      });
    } catch {}
  }

  public estimateCost(modelName: string, tokens: TokenMetrics): number {
    const normalizedKey = Object.keys(this.pricingTable).find(k => modelName.toLowerCase().includes(k)) || 'default';
    const pricing = this.pricingTable[normalizedKey] || EMBEDDED_PRICING_TABLE.default;
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
