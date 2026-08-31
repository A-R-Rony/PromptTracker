import { NormalizedSession } from '../../core/dist';

export type SessionProvider = () => Promise<NormalizedSession[]>;

export interface SessionCacheOptions {
  ttlMs?: number;
  now?: () => number;
}

export const DEFAULT_SESSION_CACHE_TTL_MS = 10_000;

export class SessionCache {
  private readonly provider: SessionProvider;
  private readonly ttlMs: number;
  private readonly now: () => number;
  private cached?: NormalizedSession[];
  private cachedAt = 0;
  private inFlight?: Promise<NormalizedSession[]>;

  constructor(provider: SessionProvider, options: SessionCacheOptions = {}) {
    this.provider = provider;
    this.ttlMs = options.ttlMs ?? DEFAULT_SESSION_CACHE_TTL_MS;
    this.now = options.now ?? Date.now;
  }

  public async get(force = false): Promise<NormalizedSession[]> {
    if (!force && this.cached !== undefined && this.now() - this.cachedAt < this.ttlMs) {
      return this.cached;
    }

    if (this.inFlight) {
      return this.inFlight;
    }

    this.inFlight = this.provider().then(
      sessions => {
        this.cached = sessions;
        this.cachedAt = this.now();
        this.inFlight = undefined;
        return sessions;
      },
      err => {
        this.inFlight = undefined;
        throw err;
      }
    );

    return this.inFlight;
  }
}
