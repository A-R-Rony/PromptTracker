import { TokenMetrics } from './types';
export interface ModelPrice {
    inputPerMillion: number;
    outputPerMillion: number;
    cacheReadPerMillion?: number;
    cacheWritePerMillion?: number;
}
export declare const EMBEDDED_PRICING_TABLE: Record<string, ModelPrice>;
export declare class PricingEngine {
    private static instance;
    private pricingTable;
    private cacheFilePath;
    private syncIntervalMs;
    private openRouterApiUrl;
    private constructor();
    static getInstance(): PricingEngine;
    private loadCachedPricing;
    /**
     * Syncs latest pricing from OpenRouter's live model registry every 24 hours
     */
    syncRemotePricingAsync(): void;
    estimateCost(modelName: string, tokens: TokenMetrics): number;
    getPricingTable(): Record<string, ModelPrice>;
}
export declare function estimateCost(modelName: string, tokens: TokenMetrics): number;
export declare function syncModelPricingInBackground(): void;
export declare function approximateTokens(text: string): number;
