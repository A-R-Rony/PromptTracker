import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createHash } from 'crypto';
import Database from 'better-sqlite3';
import { NormalizedSession } from '../src/types';
import { SessionStorageError, SessionStorageManager } from '../src/storage';
import { CacheConfigError, loadCacheConfig } from '../src/config';

const temporaryDirectories: string[] = [];
function databasePath(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-lens-retention-'));
  temporaryDirectories.push(directory);
  return path.join(directory, 'data.db');
}
function session(overrides: Partial<NormalizedSession> = {}): NormalizedSession {
  return {
    id: 'source/session:1', toolSource: 'codex', projectName: 'PromptTracker',
    projectPath: 'D:/work/PromptTracker', timestamp: '2026-09-05T08:00:00.000Z',
    date: '2026-09-05', model: 'gpt-5',
    turns: [{ turnIndex: 1, timestamp: '2026-09-05T08:00:00.000Z',
      userPrompt: 'Store this complete prompt', assistantSummary: 'Stored it',
      assistantResponse: 'A complete response that must survive a restart.',
      tokens: { input: 11, output: 13, cached: 2, reasoning: 3, total: 29 } }],
    totalTokens: { input: 11, output: 13, cached: 2, reasoning: 3, total: 29 },
    estimatedCostUsd: 0.0042, rawFilePath: 'D:/agent-data/session.jsonl',
    sourceSignals: { mtimeMs: 1728000000000, sizeBytes: 128 }, ...overrides
  };
}
function largeResponse(paddingBytes: number): string {
  return 'R'.repeat(paddingBytes);
}
function backdateContentAccess(databaseFile: string, accessedAt: string): void {
  const connection = new Database(databaseFile);
  try {
    connection.prepare('UPDATE session_content SET last_accessed_at = ?').run(accessedAt);
  } finally {
    connection.close();
  }
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

describe('Cached Content retention defaults', () => {
  it('defaults to 30 days of content age and 250 MB of stored content', () => {
    const storage = new SessionStorageManager({ databasePath: databasePath() });
    const status = storage.getCacheStatus();
    assert.strictEqual(status.cacheFullContent, true);
    assert.strictEqual(status.maxAgeDays, 30);
    assert.strictEqual(status.maxBytes, 250 * 1024 * 1024);
    storage.close();
  });
});

describe('Cached Content age enforcement', () => {
  it('evicts content older than the configured age and preserves Session metadata', () => {
    const fixedNow = new Date('2026-09-05T12:00:00.000Z');
    const dbPath = databasePath();
    const storage = new SessionStorageManager({
      databasePath: dbPath, retention: { maxAgeDays: 30 }, now: () => fixedNow
    });
    storage.upsertSession(session());
    backdateContentAccess(dbPath, '2026-08-01T00:00:00.000Z');

    const report = storage.enforceRetention();
    assert.strictEqual(report.evictedCount, 1);
    assert.ok(report.bytesFreed > 0);

    const metadata = storage.listSessions();
    assert.strictEqual(metadata.length, 1);
    assert.strictEqual(metadata[0].hasCachedContent, false);
    assert.strictEqual(metadata[0].ingestionState, 'content-evicted');
    assert.throws(() => storage.loadFullTurns(metadata[0]), SessionStorageError);
    storage.close();
  });

  it('keeps content at or inside the age boundary', () => {
    const fixedNow = new Date('2026-09-05T12:00:00.000Z');
    const dbPath = databasePath();
    const storage = new SessionStorageManager({
      databasePath: dbPath, retention: { maxAgeDays: 30 }, now: () => fixedNow
    });
    storage.upsertSession(session());
    backdateContentAccess(dbPath, '2026-08-06T12:00:01.000Z');

    const report = storage.enforceRetention();
    assert.strictEqual(report.evictedCount, 0);
    assert.strictEqual(storage.listSessions()[0].hasCachedContent, true);
    storage.close();
  });

  it('treats recently loaded content as young because usage refreshes access time', () => {
    const fixedNow = new Date('2026-09-05T12:00:00.000Z');
    const dbPath = databasePath();
    const storage = new SessionStorageManager({
      databasePath: dbPath, retention: { maxAgeDays: 30 }, now: () => fixedNow
    });
    storage.upsertSession(session());
    backdateContentAccess(dbPath, '2026-08-01T00:00:00.000Z');
    storage.loadFullTurns(storage.listSessions()[0]);

    const report = storage.enforceRetention();
    assert.strictEqual(report.evictedCount, 0);
    assert.strictEqual(storage.listSessions()[0].hasCachedContent, true);
    storage.close();
  });
});

describe('Cached Content size enforcement', () => {
  function advancingClock(startIso: string) {
    const base = Date.parse(startIso);
    let tick = 0;
    return {
      next(): Date { return new Date(base + (tick++) * 60000); }
    };
  }

  it('evicts least-recently-accessed content first until the limit holds', () => {
    const clock = advancingClock('2026-09-01T12:00:00.000Z');
    const storage = new SessionStorageManager({
      databasePath: databasePath(),
      retention: { maxBytes: 1700 },
      now: () => clock.next()
    });
    const entry = (id: string, prompt: string) => session({ id, turns: [{
      turnIndex: 1, timestamp: '2026-09-01T12:00:00.000Z', userPrompt: prompt,
      assistantResponse: largeResponse(700), tokens: { input: 1, output: 1, total: 2 } }] });

    storage.upsertSession(entry('s:a', 'a'));
    storage.upsertSession(entry('s:b', 'b'));
    assert.strictEqual(storage.getCacheStatus().contentBearingSessions, 2);

    backdateOne(storage, 's:a', '2026-09-01T00:00:00.000Z');
    backdateOne(storage, 's:b', '2026-09-02T00:00:00.000Z');
    storage.upsertSession(entry('s:c', 'c'));

    const status = storage.getCacheStatus();
    assert.strictEqual(status.totalContentBytes <= 1700, true);
    assert.strictEqual(status.contentBearingSessions, 2);
    assert.deepStrictEqual(
      storage.listSessions().filter(s => s.hasCachedContent).map(s => s.id).sort(), ['s:b', 's:c']);
    assert.strictEqual(storage.listSessions().length, 3);
    const evictedA = storage.listSessions().find(s => s.id === 's:a');
    assert.strictEqual(evictedA?.hasCachedContent, false);
    assert.strictEqual(evictedA?.ingestionState, 'content-evicted');
    storage.close();
  });

  it('counts successful complete-Turn usage as the most recent access', () => {
    const clock = advancingClock('2026-09-01T12:00:00.000Z');
    const storage = new SessionStorageManager({
      databasePath: databasePath(),
      retention: { maxBytes: 1700 },
      now: () => clock.next()
    });
    const entry = (id: string, prompt: string) => session({ id, turns: [{
      turnIndex: 1, timestamp: '2026-09-01T12:00:00.000Z', userPrompt: prompt,
      assistantResponse: largeResponse(700), tokens: { input: 1, output: 1, total: 2 } }] });

    storage.upsertSession(entry('s:a', 'a'));
    storage.upsertSession(entry('s:b', 'b'));
    backdateOne(storage, 's:a', '2026-09-01T00:00:00.000Z');
    backdateOne(storage, 's:b', '2026-09-02T00:00:00.000Z');
    storage.upsertSession(entry('s:c', 'c'));
    assert.deepStrictEqual(
      storage.listSessions().filter(s => s.hasCachedContent).map(s => s.id).sort(), ['s:b', 's:c']);

    storage.loadFullTurns({ id: 's:b', toolSource: 'codex' });
    backdateOne(storage, 's:c', '2026-08-15T00:00:00.000Z');
    storage.upsertSession(entry('s:d', 'd'));

    assert.deepStrictEqual(
      storage.listSessions().filter(s => s.hasCachedContent).map(s => s.id).sort(), ['s:b', 's:d']);
    storage.close();
  });

  it('enforces the size limit automatically after each cache write', () => {
    const clock = advancingClock('2026-09-05T12:00:00.000Z');
    const storage = new SessionStorageManager({
      databasePath: databasePath(),
      retention: { maxBytes: 1500 },
      now: () => clock.next()
    });
    storage.upsertSession(session({ id: 's:a', turns: [{
      turnIndex: 1, timestamp: '2026-09-05T12:00:00.000Z', userPrompt: 'a',
      assistantResponse: largeResponse(700), tokens: { input: 1, output: 1, total: 2 } }] }));
    storage.upsertSession(session({ id: 's:b', turns: [{
      turnIndex: 1, timestamp: '2026-09-05T12:00:00.000Z', userPrompt: 'b',
      assistantResponse: largeResponse(700), tokens: { input: 1, output: 1, total: 2 } }] }));

    const status = storage.getCacheStatus();
    assert.strictEqual(status.contentBearingSessions, 1);
    assert.deepStrictEqual(
      storage.listSessions().filter(s => s.hasCachedContent).map(s => s.id), ['s:b']);
    assert.strictEqual(storage.listSessions().length, 2);
    storage.close();
  });

  it('reports evicted counts and freed bytes when enforcement removes content', () => {
    const fixedNow = new Date('2026-09-05T12:00:00.000Z');
    const dbPath = databasePath();
    const storage = new SessionStorageManager({
      databasePath: dbPath, retention: { maxAgeDays: 30 }, now: () => fixedNow
    });
    storage.upsertSession(session({ id: 's:a' }));
    storage.upsertSession(session({ id: 's:b' }));
    backdateContentAccess(dbPath, '2026-08-01T00:00:00.000Z');

    const report = storage.enforceRetention();
    assert.strictEqual(report.evictedCount, 2);
    assert.ok(report.bytesFreed > 0);
    assert.strictEqual(storage.getCacheStatus().contentBearingSessions, 0);
    assert.strictEqual(storage.listSessions().length, 2);
    storage.close();
  });
});

function backdateOne(storage: SessionStorageManager, id: string, accessedAt: string): void {
  const connection = new Database(storage.databasePath);
  try {
    connection.prepare('UPDATE session_content SET last_accessed_at = ? WHERE cache_key = ?')
      .run(accessedAt, createHash('sha256').update(`codex\0${id}`).digest('hex'));
  } finally {
    connection.close();
  }
}

describe('Disabled full-content caching', () => {
  it('keeps the metadata index and analytics without storing Turn content', () => {
    const storage = new SessionStorageManager({
      databasePath: databasePath(), cacheFullContent: false
    });
    storage.upsertSession(session());

    const metadata = storage.listSessions();
    assert.strictEqual(metadata.length, 1);
    assert.strictEqual(metadata[0].hasCachedContent, false);
    assert.strictEqual(metadata[0].ingestionState, 'metadata-only');
    assert.strictEqual(metadata[0].turnCount, 1);
    assert.strictEqual(metadata[0].totalTokens.total, 29);
    assert.throws(() => storage.loadFullTurns(metadata[0]), SessionStorageError);

    const status = storage.getCacheStatus();
    assert.strictEqual(status.cacheFullContent, false);
    assert.strictEqual(status.contentBearingSessions, 0);
    assert.strictEqual(status.totalContentBytes, 0);
    assert.strictEqual(status.totalSessions, 1);
    storage.close();
  });

  it('drops stored content when a disabled cache re-ingests a previously cached Session', () => {
    const storage = new SessionStorageManager({
      databasePath: databasePath(), cacheFullContent: false
    });
    const record = session();
    storage.upsertSession(record);
    storage.upsertSession({ ...record, sourceSignals: { mtimeMs: 999, sizeBytes: 1 } });

    const metadata = storage.listSessions();
    assert.strictEqual(metadata[0].hasCachedContent, false);
    assert.strictEqual(metadata[0].ingestionState, 'metadata-only');
    storage.close();
  });
});

describe('Cache clearing', () => {
  it('removes all cached content, preserves metadata, and is idempotent', () => {
    const storage = new SessionStorageManager({ databasePath: databasePath() });
    storage.upsertSession(session({ id: 's:a' }));
    storage.upsertSession(session({ id: 's:b' }));

    const first = storage.clearCachedContent();
    assert.strictEqual(first.evictedCount, 2);
    assert.ok(first.bytesFreed > 0);
    assert.strictEqual(storage.listSessions().length, 2);
    assert.ok(storage.listSessions().every(s => !s.hasCachedContent));

    const second = storage.clearCachedContent();
    assert.strictEqual(second.evictedCount, 0);
    assert.strictEqual(second.bytesFreed, 0);
    storage.close();
  });
});

describe('Cache status accounting', () => {
  it('reports stored content size and content-bearing Session count', () => {
    const storage = new SessionStorageManager({ databasePath: databasePath() });
    const turnsA = [{
      turnIndex: 1, timestamp: '2026-09-05T08:00:00.000Z', userPrompt: 'a',
      assistantResponse: largeResponse(500), tokens: { input: 1, output: 1, total: 2 } }];
    const turnsB = [{
      turnIndex: 1, timestamp: '2026-09-05T08:00:00.000Z', userPrompt: 'b',
      assistantResponse: largeResponse(300), tokens: { input: 1, output: 1, total: 2 } }];
    storage.upsertSession(session({ id: 's:a', turns: turnsA }));
    storage.upsertSession(session({ id: 's:b', turns: turnsB }));

    const status = storage.getCacheStatus();
    assert.strictEqual(status.contentBearingSessions, 2);
    assert.strictEqual(status.totalSessions, 2);
    const expectedBytes = JSON.stringify(turnsA).length + JSON.stringify(turnsB).length;
    assert.strictEqual(status.totalContentBytes, expectedBytes);
    storage.close();
  });
});

describe('Hostile source identifiers', () => {
  it('cannot escape the cache boundary or collide through source path characters', () => {
    const storage = new SessionStorageManager({ databasePath: databasePath() });
    const hostileIds = [
      '../../escape/attempt',
      'C:\\Windows\\System32\\config',
      'session\nwith\nnewlines',
      'склеп/🔥/emoji',
      'a/b/c/d/e/f',
      ''
    ];
    for (const [index, id] of hostileIds.entries()) {
      storage.upsertSession(session({ id, projectName: `hostile-${index}` }));
    }
    const cached = storage.listSessions();
    assert.strictEqual(cached.length, hostileIds.length);
    for (const [index, id] of hostileIds.entries()) {
      const match = cached.find(s => s.id === id);
      assert.ok(match, `missing hostile id ${JSON.stringify(id)}`);
      const turns = storage.loadFullTurns({ id, toolSource: 'codex' });
      assert.strictEqual(turns[0].userPrompt, 'Store this complete prompt');
      assert.strictEqual(match.projectName, `hostile-${index}`);
    }
    storage.close();
  });
});

describe('Maintenance failure surfacing', () => {
  it('throws an actionable error instead of silently claiming eviction success', () => {
    const storage = new SessionStorageManager({ databasePath: databasePath() });
    storage.close();
    assert.throws(() => storage.enforceRetention(), SessionStorageError);
    assert.throws(() => storage.clearCachedContent(), SessionStorageError);
    assert.throws(() => storage.getCacheStatus(), SessionStorageError);
  });
});

describe('Cache configuration file', () => {
  it('loads retention and full-content settings from config.json', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-lens-cfg-'));
    temporaryDirectories.push(directory);
    fs.writeFileSync(path.join(directory, 'config.json'), JSON.stringify({
      cache: { fullContent: false, maxAgeDays: 7, maxBytes: 1024 }
    }));

    const config = loadCacheConfig(path.join(directory, 'config.json'));
    assert.strictEqual(config.cacheFullContent, false);
    assert.deepStrictEqual(config.retention, { maxAgeDays: 7, maxBytes: 1024 });
  });

  it('applies documented defaults when no configuration file exists', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-lens-cfg-'));
    temporaryDirectories.push(directory);
    const config = loadCacheConfig(path.join(directory, 'config.json'));
    assert.deepStrictEqual(config, {
      cacheFullContent: true,
      retention: { maxAgeDays: 30, maxBytes: 250 * 1024 * 1024 }
    });
  });

  it('fails actionably on malformed or invalid configuration', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-lens-cfg-'));
    temporaryDirectories.push(directory);
    const configPath = path.join(directory, 'config.json');

    fs.writeFileSync(configPath, '{not json');
    assert.throws(() => loadCacheConfig(configPath), (error: unknown) =>
      error instanceof CacheConfigError && error.message.includes(configPath));

    fs.writeFileSync(configPath, JSON.stringify({ cache: { maxAgeDays: -5 } }));
    assert.throws(() => loadCacheConfig(configPath), CacheConfigError);

    fs.writeFileSync(configPath, JSON.stringify({ cache: { maxBytes: 'lots' } }));
    assert.throws(() => loadCacheConfig(configPath), CacheConfigError);

    fs.writeFileSync(configPath, JSON.stringify({ cache: { fullContent: 'yes' } }));
    assert.throws(() => loadCacheConfig(configPath), CacheConfigError);
  });

  it('uses the configuration file when the storage manager is constructed without explicit options', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-lens-cfg-'));
    temporaryDirectories.push(directory);
    const dbPath = path.join(directory, 'data.db');
    fs.writeFileSync(path.join(directory, 'config.json'), JSON.stringify({
      cache: { fullContent: false }
    }));

    const storage = new SessionStorageManager({ databasePath: dbPath });
    assert.strictEqual(storage.getCacheStatus().cacheFullContent, false);
    storage.close();
  });
});
