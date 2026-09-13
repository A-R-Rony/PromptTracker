import Database from 'better-sqlite3';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { NormalizedSession, PromptTurn, SessionMetadata, SourceSignals, TokenMetrics } from './types';
import { CacheRetentionConfig, defaultCacheDatabasePath, loadCacheConfig } from './config';

export interface SessionStorageOptions {
  databasePath?: string;
  retention?: Partial<CacheRetentionConfig>;
  cacheFullContent?: boolean;
  now?: () => Date;
}

const CURRENT_SCHEMA_VERSION = 2;

export interface CacheStatus {
  cacheFullContent: boolean;
  maxAgeDays: number;
  maxBytes: number;
  totalContentBytes: number;
  contentBearingSessions: number;
  totalSessions: number;
}

export interface CacheMaintenanceReport {
  evictedCount: number;
  bytesFreed: number;
}

export type IngestionState = 'complete' | 'content-evicted' | 'metadata-only';

interface SessionRow {
  cache_key: string;
  source_session_id: string;
  tool_source: NormalizedSession['toolSource'];
  source_path: string | null;
  project_name: string;
  project_path: string | null;
  timestamp: string;
  session_date: string;
  model: string;
  token_metrics_json: string;
  estimated_cost_usd: number;
  turn_count: number;
  content_available: number;
  ingestion_state: IngestionState;
  source_mtime_ms: number | null;
  source_size_bytes: number | null;
  source_fingerprint: string | null;
}

export interface SessionSyncState {
  toolSource: NormalizedSession['toolSource'];
  sourceSessionId: string;
  sourcePath: string | undefined;
  signals: SourceSignals;
}

export class SessionStorageError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'SessionStorageError';
  }
}

export class SessionStorageManager {
  private readonly database: Database.Database;
  private readonly cacheFullContent: boolean;
  private readonly retention: CacheRetentionConfig;
  private readonly now: () => Date;
  readonly databasePath: string;

  constructor(options: SessionStorageOptions = {}) {
    this.databasePath = options.databasePath ?? defaultCacheDatabasePath();
    const directory = path.dirname(this.databasePath);

    let configCacheFullContent: boolean | undefined;
    let configRetention: Partial<CacheRetentionConfig> | undefined;
    if (options.retention === undefined && options.cacheFullContent === undefined) {
      const config = loadCacheConfig(path.join(directory, 'config.json'));
      configCacheFullContent = config.cacheFullContent;
      configRetention = config.retention;
    }

    this.cacheFullContent = options.cacheFullContent ?? configCacheFullContent ?? true;
    this.retention = {
      maxAgeDays: options.retention?.maxAgeDays ?? configRetention?.maxAgeDays ?? 30,
      maxBytes: options.retention?.maxBytes ?? configRetention?.maxBytes ?? 250 * 1024 * 1024
    };
    this.now = options.now ?? (() => new Date());

    try {
      fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
      this.database = new Database(this.databasePath);
      this.database.pragma('foreign_keys = ON');
      this.database.pragma('journal_mode = WAL');
      this.migrate();
      if (process.platform !== 'win32') {
        try {
          fs.chmodSync(directory, 0o700);
          fs.chmodSync(this.databasePath, 0o600);
        } catch (error) {
          throw new SessionStorageError(
            `Unable to restrict cache permissions on ${this.databasePath}`, error);
        }
      }
    } catch (error) {
      if (error instanceof SessionStorageError) throw error;
      throw new SessionStorageError(`Unable to open Prompt Lens cache at ${this.databasePath}`, error);
    }
  }

  private migrate(): void {
    const version = this.database.pragma('user_version', { simple: true }) as number;
    if (version > CURRENT_SCHEMA_VERSION) {
      throw new SessionStorageError(`Prompt Lens cache schema ${version} is newer than this application supports`);
    }
    if (version === CURRENT_SCHEMA_VERSION) return;

    try {
      this.database.transaction(() => {
        if (version === 0) {
          this.database.exec(`
            CREATE TABLE sessions (
              cache_key TEXT PRIMARY KEY,
              source_session_id TEXT NOT NULL,
              tool_source TEXT NOT NULL,
              source_path TEXT,
              project_name TEXT NOT NULL,
              project_path TEXT,
              timestamp TEXT NOT NULL,
              session_date TEXT NOT NULL,
              model TEXT NOT NULL,
              token_metrics_json TEXT NOT NULL,
              estimated_cost_usd REAL NOT NULL,
              turn_count INTEGER NOT NULL,
              content_available INTEGER NOT NULL DEFAULT 0,
              ingestion_state TEXT NOT NULL DEFAULT 'complete',
              ingested_at TEXT NOT NULL,
              source_mtime_ms REAL,
              source_size_bytes INTEGER,
              source_fingerprint TEXT
            );
            CREATE INDEX sessions_timestamp_idx ON sessions(timestamp DESC);
            CREATE INDEX sessions_date_idx ON sessions(session_date);
            CREATE INDEX sessions_project_idx ON sessions(project_name);
            CREATE TABLE session_content (
              cache_key TEXT PRIMARY KEY REFERENCES sessions(cache_key) ON DELETE CASCADE,
              turns_json TEXT NOT NULL,
              byte_size INTEGER NOT NULL,
              updated_at TEXT NOT NULL,
              last_accessed_at TEXT NOT NULL
            );
          `);
        } else if (version === 1) {
          this.database.exec(`
            ALTER TABLE sessions ADD COLUMN source_mtime_ms REAL;
            ALTER TABLE sessions ADD COLUMN source_size_bytes INTEGER;
            ALTER TABLE sessions ADD COLUMN source_fingerprint TEXT;
          `);
        }
        this.database.pragma(`user_version = ${CURRENT_SCHEMA_VERSION}`);
      })();
    } catch (error) {
      throw new SessionStorageError('Unable to migrate Prompt Lens cache schema', error);
    }
  }

  private cacheKey(session: Pick<NormalizedSession, 'toolSource' | 'id'>): string {
    return createHash('sha256').update(`${session.toolSource}\0${session.id}`).digest('hex');
  }

  public upsertSession(session: NormalizedSession): void {
    const cacheKey = this.cacheKey(session);
    const now = this.now().toISOString();
    const signals = session.sourceSignals ?? {};
    const ingestionState: IngestionState = this.cacheFullContent ? 'complete' : 'metadata-only';
    const turnsJson = JSON.stringify(session.turns);
    try {
      this.database.transaction(() => {
        this.database.prepare(`
          INSERT INTO sessions (
            cache_key, source_session_id, tool_source, source_path, project_name, project_path,
            timestamp, session_date, model, token_metrics_json, estimated_cost_usd,
            turn_count, content_available, ingestion_state, ingested_at,
            source_mtime_ms, source_size_bytes, source_fingerprint
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(cache_key) DO UPDATE SET
            source_session_id = excluded.source_session_id,
            source_path = excluded.source_path,
            project_name = excluded.project_name,
            project_path = excluded.project_path,
            timestamp = excluded.timestamp,
            session_date = excluded.session_date,
            model = excluded.model,
            token_metrics_json = excluded.token_metrics_json,
            estimated_cost_usd = excluded.estimated_cost_usd,
            turn_count = excluded.turn_count,
            content_available = excluded.content_available,
            ingestion_state = excluded.ingestion_state,
            ingested_at = excluded.ingested_at,
            source_mtime_ms = excluded.source_mtime_ms,
            source_size_bytes = excluded.source_size_bytes,
            source_fingerprint = excluded.source_fingerprint
        `).run(cacheKey, session.id, session.toolSource, session.rawFilePath ?? null,
          session.projectName, session.projectPath ?? null, session.timestamp, session.date,
          session.model, JSON.stringify(session.totalTokens), session.estimatedCostUsd,
          session.turns.length, this.cacheFullContent ? 1 : 0, ingestionState, now,
          signals.mtimeMs ?? null, signals.sizeBytes ?? null, signals.fingerprint ?? null);
        if (this.cacheFullContent) {
          this.database.prepare(`
            INSERT INTO session_content (cache_key, turns_json, byte_size, updated_at, last_accessed_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(cache_key) DO UPDATE SET
              turns_json = excluded.turns_json,
              byte_size = excluded.byte_size,
              updated_at = excluded.updated_at
          `).run(cacheKey, turnsJson, Buffer.byteLength(turnsJson, 'utf8'), now, now);
        } else {
          this.database.prepare('DELETE FROM session_content WHERE cache_key = ?').run(cacheKey);
        }
      })();
    } catch (error) {
      throw new SessionStorageError(`Unable to cache Session ${session.id}`, error);
    }
    if (this.cacheFullContent) this.enforceRetention();
  }

  public listSessions(): SessionMetadata[] {
    try {
      const rows = this.database.prepare(
        'SELECT * FROM sessions ORDER BY timestamp DESC, cache_key'
      ).all() as SessionRow[];
      return rows.map(row => this.toSession(row));
    } catch (error) {
      throw new SessionStorageError('Unable to list cached Sessions', error);
    }
  }

  public listSyncStates(): SessionSyncState[] {
    try {
      const rows = this.database.prepare(
        'SELECT tool_source, source_session_id, source_path, source_mtime_ms, source_size_bytes, source_fingerprint FROM sessions'
      ).all() as Array<Pick<SessionRow, 'tool_source' | 'source_session_id' | 'source_path' | 'source_mtime_ms' | 'source_size_bytes' | 'source_fingerprint'>>;
      return rows.map(row => ({
        toolSource: row.tool_source,
        sourceSessionId: row.source_session_id,
        sourcePath: row.source_path ?? undefined,
        signals: {
          mtimeMs: row.source_mtime_ms ?? undefined,
          sizeBytes: row.source_size_bytes ?? undefined,
          fingerprint: row.source_fingerprint ?? undefined
        }
      }));
    } catch (error) {
      throw new SessionStorageError('Unable to read cached source states', error);
    }
  }

  public removeSession(session: Pick<NormalizedSession, 'id' | 'toolSource'>): void {
    try {
      this.database.prepare('DELETE FROM sessions WHERE cache_key = ?').run(this.cacheKey(session));
    } catch (error) {
      throw new SessionStorageError(`Unable to remove cached Session ${session.id}`, error);
    }
  }

  public evictCachedContent(session: Pick<NormalizedSession, 'id' | 'toolSource'>): void {
    const cacheKey = this.cacheKey(session);
    try {
      this.database.transaction(() => {
        this.database.prepare('DELETE FROM session_content WHERE cache_key = ?').run(cacheKey);
        this.database.prepare(
          "UPDATE sessions SET content_available = 0, ingestion_state = 'content-evicted' WHERE cache_key = ?"
        ).run(cacheKey);
      })();
    } catch (error) {
      throw new SessionStorageError(`Unable to evict cached content for Session ${session.id}`, error);
    }
  }

  private toSession(row: SessionRow): SessionMetadata {
    let totalTokens: TokenMetrics;
    try {
      totalTokens = JSON.parse(row.token_metrics_json) as TokenMetrics;
    } catch (error) {
      throw new SessionStorageError(`Cached Token Metrics are invalid for Session ${row.source_session_id}`, error);
    }
    return {
      id: row.source_session_id,
      toolSource: row.tool_source,
      projectName: row.project_name,
      projectPath: row.project_path ?? undefined,
      timestamp: row.timestamp,
      date: row.session_date,
      model: row.model,
      turnCount: row.turn_count,
      hasCachedContent: row.content_available === 1,
      ingestionState: row.ingestion_state,
      totalTokens,
      estimatedCostUsd: row.estimated_cost_usd,
      rawFilePath: row.source_path ?? undefined
    };
  }

  public loadFullTurns(session: Pick<NormalizedSession, 'id' | 'toolSource'>): PromptTurn[] {
    const cacheKey = this.cacheKey(session);
    try {
      const row = this.database.prepare('SELECT turns_json FROM session_content WHERE cache_key = ?')
        .get(cacheKey) as { turns_json: string } | undefined;
      if (!row) throw new SessionStorageError(`Complete Turns are not cached for Session ${session.id}`);
      const turns = JSON.parse(row.turns_json) as unknown;
      if (!isPromptTurnArray(turns)) throw new Error('Turn payload does not match the Prompt Turn schema');
      this.database.prepare('UPDATE session_content SET last_accessed_at = ? WHERE cache_key = ?')
        .run(this.now().toISOString(), cacheKey);
      return turns as PromptTurn[];
    } catch (error) {
      if (error instanceof SessionStorageError) throw error;
      throw new SessionStorageError(`Unable to load complete Turns for Session ${session.id}`, error);
    }
  }

  public isCachingFullContent(): boolean {
    return this.cacheFullContent;
  }

  public enforceRetention(): CacheMaintenanceReport {
    try {
      return this.database.transaction(() => {
        const before = this.totalContentBytes();
        const evictedCount = this.evictExpiredContent() + this.evictOversizeContent();
        return { evictedCount, bytesFreed: before - this.totalContentBytes() };
      })();
    } catch (error) {
      if (error instanceof SessionStorageError) throw error;
      throw new SessionStorageError('Unable to enforce Cached Content retention limits', error);
    }
  }

  public clearCachedContent(): CacheMaintenanceReport {
    try {
      return this.database.transaction(() => {
        const before = this.totalContentBytes();
        const evictedCount = (this.database.prepare('SELECT COUNT(*) AS n FROM session_content')
          .get() as { n: number }).n;
        this.database.prepare(`
          UPDATE sessions SET
            content_available = 0,
            ingestion_state = CASE WHEN ingestion_state = 'metadata-only'
              THEN 'metadata-only' ELSE 'content-evicted' END
        `).run();
        this.database.prepare('DELETE FROM session_content').run();
        return { evictedCount, bytesFreed: before };
      })();
    } catch (error) {
      if (error instanceof SessionStorageError) throw error;
      throw new SessionStorageError('Unable to clear Cached Content', error);
    }
  }

  public getCacheStatus(): CacheStatus {
    try {
      const totals = this.database.prepare(`
        SELECT
          (SELECT COUNT(*) FROM sessions) AS total_sessions,
          (SELECT COUNT(*) FROM sessions WHERE content_available = 1) AS content_sessions,
          (SELECT COALESCE(SUM(byte_size), 0) FROM session_content) AS total_bytes
      `).get() as { total_sessions: number; content_sessions: number; total_bytes: number };
      return {
        cacheFullContent: this.cacheFullContent,
        maxAgeDays: this.retention.maxAgeDays,
        maxBytes: this.retention.maxBytes,
        totalContentBytes: totals.total_bytes,
        contentBearingSessions: totals.content_sessions,
        totalSessions: totals.total_sessions
      };
    } catch (error) {
      if (error instanceof SessionStorageError) throw error;
      throw new SessionStorageError('Unable to read Cached Content status', error);
    }
  }

  private totalContentBytes(): number {
    return (this.database.prepare('SELECT COALESCE(SUM(byte_size), 0) AS total FROM session_content')
      .get() as { total: number }).total;
  }

  private evictExpiredContent(): number {
    const cutoff = new Date(this.now().getTime() - this.retention.maxAgeDays * 24 * 60 * 60 * 1000);
    const stale = this.database.prepare(`
      SELECT s.cache_key FROM session_content c
      JOIN sessions s ON s.cache_key = c.cache_key
      WHERE c.last_accessed_at <= ?
    `).all(cutoff.toISOString()) as Array<{ cache_key: string }>;
    for (const row of stale) this.evictInsideTransaction(row.cache_key);
    return stale.length;
  }

  private evictOversizeContent(): number {
    let evicted = 0;
    for (;;) {
      if (this.totalContentBytes() <= this.retention.maxBytes) break;
      const oldest = this.database.prepare(`
        SELECT cache_key FROM session_content
        ORDER BY last_accessed_at ASC, cache_key ASC LIMIT 1
      `).get() as { cache_key: string } | undefined;
      if (!oldest) break;
      this.evictInsideTransaction(oldest.cache_key);
      evicted++;
    }
    return evicted;
  }

  private evictInsideTransaction(cacheKey: string): void {
    this.database.prepare('DELETE FROM session_content WHERE cache_key = ?').run(cacheKey);
    this.database.prepare(`
      UPDATE sessions SET content_available = 0, ingestion_state = 'content-evicted'
      WHERE cache_key = ?
    `).run(cacheKey);
  }

  public importLegacySessionTurns(
    session: Pick<NormalizedSession, 'id' | 'toolSource'>,
    turns: PromptTurn[]
  ): boolean {
    if (!this.cacheFullContent) return false;
    const cacheKey = this.cacheKey(session);
    const now = this.now().toISOString();
    const turnsJson = JSON.stringify(turns);
    const byteSize = Buffer.byteLength(turnsJson, 'utf8');

    try {
      return this.database.transaction(() => {
        const existingSession = this.database.prepare(
          'SELECT cache_key, content_available, ingestion_state FROM sessions WHERE cache_key = ?'
        ).get(cacheKey) as { cache_key: string; content_available: number; ingestion_state: IngestionState } | undefined;

        if (existingSession) {
          this.database.prepare(`
            INSERT INTO session_content (cache_key, turns_json, byte_size, updated_at, last_accessed_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(cache_key) DO UPDATE SET
              turns_json = excluded.turns_json,
              byte_size = excluded.byte_size,
              updated_at = excluded.updated_at
          `).run(cacheKey, turnsJson, byteSize, now, now);

          this.database.prepare(`
            UPDATE sessions SET content_available = 1, ingestion_state = 'complete'
            WHERE cache_key = ?
          `).run(cacheKey);
        } else {
          // If the session row does not exist yet, create a placeholder session metadata row so content foreign key succeeds
          const firstTurn = turns[0];
          const timestamp = firstTurn?.timestamp || now;
          const sessionDate = timestamp.slice(0, 10);
          const totalTokens: TokenMetrics = turns.reduce(
            (acc, t) => ({
              input: acc.input + (t.tokens?.input || 0),
              output: acc.output + (t.tokens?.output || 0),
              cached: (acc.cached || 0) + (t.tokens?.cached || 0),
              reasoning: (acc.reasoning || 0) + (t.tokens?.reasoning || 0),
              total: acc.total + (t.tokens?.total || 0)
            }),
            { input: 0, output: 0, cached: 0, reasoning: 0, total: 0 }
          );

          this.database.prepare(`
            INSERT INTO sessions (
              cache_key, source_session_id, tool_source, source_path, project_name, project_path,
              timestamp, session_date, model, token_metrics_json, estimated_cost_usd,
              turn_count, content_available, ingestion_state, ingested_at
            ) VALUES (?, ?, ?, NULL, ?, NULL, ?, ?, 'default', ?, 0.0, ?, 1, 'complete', ?)
          `).run(
            cacheKey,
            session.id,
            session.toolSource,
            firstTurn?.userPrompt?.slice(0, 50) || session.id,
            timestamp,
            sessionDate,
            JSON.stringify(totalTokens),
            turns.length,
            now
          );

          this.database.prepare(`
            INSERT INTO session_content (cache_key, turns_json, byte_size, updated_at, last_accessed_at)
            VALUES (?, ?, ?, ?, ?)
          `).run(cacheKey, turnsJson, byteSize, now, now);
        }

        // Verify write
        const row = this.database.prepare('SELECT turns_json FROM session_content WHERE cache_key = ?')
          .get(cacheKey) as { turns_json: string } | undefined;
        if (!row) throw new Error(`Failed to read back stored content for Session ${session.id}`);
        const readBack = JSON.parse(row.turns_json);
        if (JSON.stringify(readBack) !== turnsJson) {
          throw new Error(`Verification mismatch for Session ${session.id}`);
        }

        return true;
      })();
    } catch (error) {
      if (error instanceof SessionStorageError) throw error;
      throw new SessionStorageError(`Unable to import legacy turns for Session ${session.id}`, error);
    }
  }

  public close(): void {
    this.database.close();
  }
}

export function withTurns(metadata: SessionMetadata, turns: PromptTurn[]): NormalizedSession {
  const { turnCount: _turnCount, hasCachedContent: _hasCachedContent,
    ingestionState: _ingestionState, ...sessionFields } = metadata;
  return { ...sessionFields, turns };
}

export function isPromptTurnArray(value: unknown): value is PromptTurn[] {
  if (!Array.isArray(value)) return false;
  return value.every(turn => {
    if (!turn || typeof turn !== 'object') return false;
    const candidate = turn as Partial<PromptTurn>;
    const tokens = candidate.tokens as Partial<TokenMetrics> | undefined;
    return typeof candidate.turnIndex === 'number' &&
      typeof candidate.timestamp === 'string' &&
      typeof candidate.userPrompt === 'string' &&
      (!candidate.toolCalls || (Array.isArray(candidate.toolCalls) && candidate.toolCalls.every(call =>
        Boolean(call) && typeof call === 'object' && typeof call.name === 'string'))) &&
      Boolean(tokens) && typeof tokens?.input === 'number' && typeof tokens.output === 'number' &&
      typeof tokens.total === 'number';
  });
}

