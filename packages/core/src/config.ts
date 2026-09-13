import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface CacheRetentionConfig {
  maxAgeDays: number;
  maxBytes: number;
}

export interface CacheConfig {
  cacheFullContent: boolean;
  retention: CacheRetentionConfig;
}

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  cacheFullContent: true,
  retention: { maxAgeDays: 30, maxBytes: 250 * 1024 * 1024 }
};

export class CacheConfigError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'CacheConfigError';
  }
}

export function defaultCacheDatabasePath(): string {
  return process.env.PROMPT_LENS_CACHE_PATH ??
    path.join(os.homedir(), '.prompttracker', 'data.db');
}

export function defaultCacheConfigPath(): string {
  return process.env.PROMPT_LENS_CONFIG_PATH ??
    path.join(path.dirname(defaultCacheDatabasePath()), 'config.json');
}

function positiveNumber(value: unknown, field: string, configPath: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new CacheConfigError(
      `Invalid cache configuration in ${configPath}: "cache.${field}" must be a positive number`);
  }
  return value;
}

export function loadCacheConfig(configPath: string = defaultCacheConfigPath()): CacheConfig {
  let raw: string;
  try {
    raw = fs.readFileSync(configPath, 'utf8');
  } catch {
    return DEFAULT_CACHE_CONFIG;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new CacheConfigError(
      `Cache configuration file ${configPath} is not valid JSON. Fix or remove the file to use default retention.`, error);
  }

  const root = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  const cache = root.cache && typeof root.cache === 'object'
    ? (root.cache as Record<string, unknown>)
    : {};

  const config: CacheConfig = {
    cacheFullContent: DEFAULT_CACHE_CONFIG.cacheFullContent,
    retention: { ...DEFAULT_CACHE_CONFIG.retention }
  };

  if ('fullContent' in cache) {
    if (typeof cache.fullContent !== 'boolean') {
      throw new CacheConfigError(
        `Invalid cache configuration in ${configPath}: "cache.fullContent" must be a boolean`);
    }
    config.cacheFullContent = cache.fullContent;
  }
  if ('maxAgeDays' in cache) {
    config.retention.maxAgeDays = positiveNumber(cache.maxAgeDays, 'maxAgeDays', configPath);
  }
  if ('maxBytes' in cache) {
    config.retention.maxBytes = positiveNumber(cache.maxBytes, 'maxBytes', configPath);
  }

  return config;
}
