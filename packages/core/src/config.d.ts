export interface CacheRetentionConfig {
    maxAgeDays: number;
    maxBytes: number;
}
export interface CacheConfig {
    cacheFullContent: boolean;
    retention: CacheRetentionConfig;
}
export declare const DEFAULT_CACHE_CONFIG: CacheConfig;
export declare class CacheConfigError extends Error {
    constructor(message: string, cause?: unknown);
}
export declare function defaultCacheDatabasePath(): string;
export declare function defaultCacheConfigPath(): string;
export declare function loadCacheConfig(configPath?: string): CacheConfig;
