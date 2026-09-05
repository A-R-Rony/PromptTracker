import Database from 'better-sqlite3';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { NormalizedSession, PromptTurn, SessionMetadata, SourceSignals, TokenMetrics } from './types';

export interface SessionStorageOptions {
  databasePath?: string;
}

const CURRENT_SCHEMA_VERSION = 2;

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
  ingestion_state: 'complete' | 'content-evicted';
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

  constructor(options: SessionStorageOptions = {}) {
    const databasePath = options.databasePath ?? process.env.PROMPT_LENS_CACHE_PATH ??
      path.join(os.homedir(), '.prompttracker', 'data.db');
    const directory = path.dirname(databasePath);

    try {
      fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
      this.database = new Database(databasePath);
      this.database.pragma('foreign_keys = ON');
      this.database.pragma('journal_mode = WAL');
      this.migrate();
      try { fs.chmodSync(databasePath, 0o600); } catch {}
    } catch (error) {
      throw new SessionStorageError(`Unable to open Prompt Lens cache at ${databasePath}`, error);
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
    const turnsJson = JSON.stringify(session.turns);
    const now = new Date().toISOString();
    const signals = session.sourceSignals ?? {};
    try {
      this.database.transaction(() => {
        this.database.prepare(`
          INSERT INTO sessions (
            cache_key, source_session_id, tool_source, source_path, project_name, project_path,
            timestamp, session_date, model, token_metrics_json, estimated_cost_usd,
            turn_count, content_available, ingestion_state, ingested_at,
            source_mtime_ms, source_size_bytes, source_fingerprint
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'complete', ?, ?, ?, ?)
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
            content_available = 1,
            ingestion_state = 'complete',
            ingested_at = excluded.ingested_at,
            source_mtime_ms = excluded.source_mtime_ms,
            source_size_bytes = excluded.source_size_bytes,
            source_fingerprint = excluded.source_fingerprint
        `).run(cacheKey, session.id, session.toolSource, session.rawFilePath ?? null,
          session.projectName, session.projectPath ?? null, session.timestamp, session.date,
          session.model, JSON.stringify(session.totalTokens), session.estimatedCostUsd,
          session.turns.length, now,
          signals.mtimeMs ?? null, signals.sizeBytes ?? null, signals.fingerprint ?? null);
        this.database.prepare(`
          INSERT INTO session_content (cache_key, turns_json, byte_size, updated_at, last_accessed_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(cache_key) DO UPDATE SET
            turns_json = excluded.turns_json,
            byte_size = excluded.byte_size,
            updated_at = excluded.updated_at
        `).run(cacheKey, turnsJson, Buffer.byteLength(turnsJson, 'utf8'), now, now);
      })();
    } catch (error) {
      throw new SessionStorageError(`Unable to cache Session ${session.id}`, error);
    }
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
        .run(new Date().toISOString(), cacheKey);
      return turns as PromptTurn[];
    } catch (error) {
      if (error instanceof SessionStorageError) throw error;
      throw new SessionStorageError(`Unable to load complete Turns for Session ${session.id}`, error);
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

function isPromptTurnArray(value: unknown): value is PromptTurn[] {
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
