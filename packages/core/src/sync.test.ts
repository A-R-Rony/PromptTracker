import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { NormalizedSession, SourceSignals, ToolScanner } from './types';
import { SessionStorageError, SessionStorageManager } from './storage';
import { SessionSource, SyncReport, syncSessions } from './sync';

const temporaryDirectories: string[] = [];
function databasePath(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-lens-sync-'));
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
function source(name: ToolScanner['name'], sessions: NormalizedSession[]): SessionSource {
  return { name, scan: async () => sessions };
}
function failingSource(name: ToolScanner['name'], error: string): SessionSource {
  return { name, scan: async () => { throw new Error(error); } };
}
function totals(report: SyncReport): Pick<SyncReport, 'ingested' | 'updated' | 'skipped' | 'removed'> {
  return { ingested: report.ingested, updated: report.updated, skipped: report.skipped, removed: report.removed };
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

describe('Incremental Session sync', () => {
  it('indexes discovered Sessions on a first scan and lists their metadata', async () => {
    const storage = new SessionStorageManager({ databasePath: databasePath() });
    const report = await syncSessions(storage, [
      source('codex', [session(), session({ id: 'source/session:2' })])
    ]);
    assert.deepStrictEqual(totals(report), { ingested: 2, updated: 0, skipped: 0, removed: 0 });
    assert.deepStrictEqual(storage.listSessions().map(s => s.id).sort(), ['source/session:1', 'source/session:2']);
    storage.close();
  });

  it('skips unchanged source records on a repeated scan without duplicating Sessions', async () => {
    const storage = new SessionStorageManager({ databasePath: databasePath() });
    const record = session();
    await syncSessions(storage, [source('codex', [record])]);
    const report = await syncSessions(storage, [source('codex', [record])]);
    assert.deepStrictEqual(totals(report), { ingested: 0, updated: 0, skipped: 1, removed: 0 });
    assert.strictEqual(storage.listSessions().length, 1);
    storage.close();
  });

  it('ingests new source Sessions during an incremental scan', async () => {
    const storage = new SessionStorageManager({ databasePath: databasePath() });
    const record = session();
    await syncSessions(storage, [source('codex', [record])]);
    const newcomer = session({ id: 'source/session:2', sourceSignals: { mtimeMs: 1728000000500, sizeBytes: 256 } });
    const report = await syncSessions(storage, [source('codex', [record, newcomer])]);
    assert.deepStrictEqual(totals(report), { ingested: 1, updated: 0, skipped: 1, removed: 0 });
    assert.strictEqual(storage.listSessions().length, 2);
    storage.close();
  });

  it('replaces stale metadata and content when a changed source Session is rescanned', async () => {
    const storage = new SessionStorageManager({ databasePath: databasePath() });
    await syncSessions(storage, [source('codex', [session()])]);
    const changed = session({
      projectName: 'Renamed Project',
      turns: [{ turnIndex: 1, timestamp: '2026-09-05T09:00:00.000Z',
        userPrompt: 'Changed prompt', assistantResponse: 'Changed response',
        tokens: { input: 5, output: 6, total: 11 } }],
      totalTokens: { input: 5, output: 6, total: 11 },
      sourceSignals: { mtimeMs: 1728000900000, sizeBytes: 512 }
    });
    const report = await syncSessions(storage, [source('codex', [changed])]);
    assert.deepStrictEqual(totals(report), { ingested: 0, updated: 1, skipped: 0, removed: 0 });
    const cached = storage.listSessions();
    assert.strictEqual(cached.length, 1);
    assert.strictEqual(cached[0].projectName, 'Renamed Project');
    assert.strictEqual(storage.loadFullTurns(cached[0])[0].userPrompt, 'Changed prompt');
    storage.close();
  });

  it('reconciles Sessions removed from their source out of metadata and content', async () => {
    const storage = new SessionStorageManager({ databasePath: databasePath() });
    const survivor = session();
    const removed = session({ id: 'source/session:2', sourceSignals: { mtimeMs: 1728000000100, sizeBytes: 64 } });
    await syncSessions(storage, [source('codex', [survivor, removed])]);
    const report = await syncSessions(storage, [source('codex', [survivor])]);
    assert.deepStrictEqual(totals(report), { ingested: 0, updated: 0, skipped: 1, removed: 1 });
    assert.deepStrictEqual(storage.listSessions().map(s => s.id), ['source/session:1']);
    assert.throws(() => storage.loadFullTurns({ id: 'source/session:2', toolSource: 'codex' }), SessionStorageError);
    storage.close();
  });

  it('does not reconcile cached Sessions of a failed source and reports it actionably', async () => {
    const storage = new SessionStorageManager({ databasePath: databasePath() });
    await syncSessions(storage, [
      source('codex', [session()]),
      source('kiro', [session({ id: 'kiro/s:1', toolSource: 'kiro' })])
    ]);
    const report = await syncSessions(storage, [
      source('codex', [session()]),
      failingSource('kiro', 'source directory unavailable')
    ]);
    assert.deepStrictEqual(totals(report), { ingested: 0, updated: 0, skipped: 1, removed: 0 });
    assert.strictEqual(report.failedSources.length, 1);
    assert.strictEqual(report.failedSources[0].name, 'kiro');
    assert.ok(report.failedSources[0].error.includes('source directory unavailable'));
    assert.strictEqual(storage.listSessions().length, 2);
    storage.close();
  });

  it('reconciles only the failed source out when it later succeeds without the Session', async () => {
    const storage = new SessionStorageManager({ databasePath: databasePath() });
    await syncSessions(storage, [
      source('codex', [session()]),
      source('kiro', [session({ id: 'kiro/s:1', toolSource: 'kiro' })])
    ]);
    const report = await syncSessions(storage, [
      source('codex', [session()]),
      source('kiro', [])
    ]);
    assert.deepStrictEqual(totals(report), { ingested: 0, updated: 0, skipped: 1, removed: 1 });
    const remaining = storage.listSessions();
    assert.deepStrictEqual(remaining.map(s => s.toolSource).sort(), ['codex']);
    storage.close();
  });

  it('treats source records without signals as changed and refreshes them in place', async () => {
    const storage = new SessionStorageManager({ databasePath: databasePath() });
    const record = session({ sourceSignals: undefined });
    await syncSessions(storage, [source('codex', [record])]);
    const report = await syncSessions(storage, [source('codex', [record])]);
    assert.deepStrictEqual(totals(report), { ingested: 0, updated: 1, skipped: 0, removed: 0 });
    assert.strictEqual(storage.listSessions().length, 1);
    storage.close();
  });

  it('detects fingerprint-only changes even when modification time and size are identical', async () => {
    const storage = new SessionStorageManager({ databasePath: databasePath() });
    const signals = { mtimeMs: 1728000000000, sizeBytes: 128 };
    await syncSessions(storage, [source('codex', [session({ sourceSignals: { ...signals, fingerprint: 'aaa' } })])]);
    const report = await syncSessions(storage, [source('codex', [session({
      projectName: 'Fingerprinted Change',
      sourceSignals: { ...signals, fingerprint: 'bbb' }
    })])]);
    assert.deepStrictEqual(totals(report), { ingested: 0, updated: 1, skipped: 0, removed: 0 });
    assert.strictEqual(storage.listSessions()[0].projectName, 'Fingerprinted Change');
    storage.close();
  });

  it('skips via fingerprint even when modification time and size moved', async () => {
    const storage = new SessionStorageManager({ databasePath: databasePath() });
    await syncSessions(storage, [source('opencode', [session({
      toolSource: 'opencode', sourceSignals: { fingerprint: 'same-content' }
    })])]);
    const report = await syncSessions(storage, [source('opencode', [session({
      toolSource: 'opencode',
      sourceSignals: { mtimeMs: 9999999999999, sizeBytes: 4096, fingerprint: 'same-content' }
    })])]);
    assert.deepStrictEqual(totals(report), { ingested: 0, updated: 0, skipped: 1, removed: 0 });
    storage.close();
  });

  it('evicts cached content while keeping metadata available for rehydration', async () => {
    const storage = new SessionStorageManager({ databasePath: databasePath() });
    await syncSessions(storage, [source('codex', [session()])]);
    const cached = storage.listSessions()[0];
    storage.evictCachedContent(cached);
    const evicted = storage.listSessions();
    assert.strictEqual(evicted.length, 1);
    assert.strictEqual(evicted[0].hasCachedContent, false);
    assert.strictEqual(evicted[0].ingestionState, 'content-evicted');
    assert.throws(() => storage.loadFullTurns(evicted[0]), SessionStorageError);
    storage.close();
  });

  it('restores full content and state when an evicted Session is re-ingested', async () => {
    const storage = new SessionStorageManager({ databasePath: databasePath() });
    const record = session();
    await syncSessions(storage, [source('codex', [record])]);
    storage.evictCachedContent(storage.listSessions()[0]);
    await syncSessions(storage, [source('codex', [session({
      sourceSignals: { mtimeMs: 1728000500000, sizeBytes: 300 }
    })])]);
    const restored = storage.listSessions();
    assert.strictEqual(restored[0].hasCachedContent, true);
    assert.strictEqual(restored[0].ingestionState, 'complete');
    assert.strictEqual(storage.loadFullTurns(restored[0]).length, 1);
    storage.close();
  });
});

describe('Incremental reparse skipping', () => {
  it('lets sources skip re-parsing unchanged files and keeps their Sessions reconciled in', async () => {
    const storage = new SessionStorageManager({ databasePath: databasePath() });
    const record = session({ rawFilePath: 'D:/agent-data/session.jsonl' });
    await syncSessions(storage, [source('codex', [record])]);

    let parseCount = 0;
    const parsingSource: SessionSource = {
      name: 'codex',
      scan: async (hints) => {
        const signals = { mtimeMs: 1728000000000, sizeBytes: 128 };
        if (hints?.shouldSkipFile?.('D:/agent-data/session.jsonl', signals)) return [];
        parseCount++;
        return [record];
      }
    };
    const report = await syncSessions(storage, [parsingSource]);
    assert.strictEqual(parseCount, 0);
    assert.deepStrictEqual(totals(report), { ingested: 0, updated: 0, skipped: 1, removed: 0 });
    assert.strictEqual(storage.listSessions().length, 1);
    storage.close();
  });

  it('reparses a file when its signals changed and replaces the stale Session', async () => {
    const storage = new SessionStorageManager({ databasePath: databasePath() });
    await syncSessions(storage, [source('codex', [session({ rawFilePath: 'D:/agent-data/session.jsonl' })])]);

    const parsingSource: SessionSource = {
      name: 'codex',
      scan: async (hints) => {
        const signals = { mtimeMs: 1728000900000, sizeBytes: 512 };
        if (hints?.shouldSkipFile?.('D:/agent-data/session.jsonl', signals)) return [];
        return [session({
          projectName: 'Reparsed Change',
          sourceSignals: signals,
          rawFilePath: 'D:/agent-data/session.jsonl'
        })];
      }
    };
    const report = await syncSessions(storage, [parsingSource]);
    assert.deepStrictEqual(totals(report), { ingested: 0, updated: 1, skipped: 0, removed: 0 });
    assert.strictEqual(storage.listSessions()[0].projectName, 'Reparsed Change');
    storage.close();
  });

  it('reparses files whose Sessions are not cached yet and does not skip new files', async () => {
    const storage = new SessionStorageManager({ databasePath: databasePath() });
    const parsingSource: SessionSource = {
      name: 'codex',
      scan: async (hints) => {
        const signals = { mtimeMs: 1728000000000, sizeBytes: 128 };
        if (hints?.shouldSkipFile?.('D:/agent-data/session.jsonl', signals)) return [];
        return [session({ sourceSignals: signals, rawFilePath: 'D:/agent-data/session.jsonl' })];
      }
    };
    const report = await syncSessions(storage, [parsingSource]);
    assert.deepStrictEqual(totals(report), { ingested: 1, updated: 0, skipped: 0, removed: 0 });
    storage.close();
  });

  it('does not skip a file when only some of its cached Sessions match the signals', async () => {
    const storage = new SessionStorageManager({ databasePath: databasePath() });
    await syncSessions(storage, [source('kiro', [
      session({ id: 'kiro/file:a', toolSource: 'kiro', rawFilePath: 'D:/agent-data/multi.json',
        sourceSignals: { mtimeMs: 1728000000000, sizeBytes: 128 } }),
      session({ id: 'kiro/file:b', toolSource: 'kiro', rawFilePath: 'D:/agent-data/multi.json',
        sourceSignals: { mtimeMs: 1728000000100, sizeBytes: 256 } })
    ])]);

    const parsingSource: SessionSource = {
      name: 'kiro',
      scan: async (hints) => {
        const signals = { mtimeMs: 1728000000100, sizeBytes: 256 };
        if (hints?.shouldSkipFile?.('D:/agent-data/multi.json', signals)) return [];
        return [
          session({ id: 'kiro/file:a', toolSource: 'kiro', rawFilePath: 'D:/agent-data/multi.json',
            sourceSignals: signals }),
          session({ id: 'kiro/file:b', toolSource: 'kiro', rawFilePath: 'D:/agent-data/multi.json',
            sourceSignals: signals })
        ];
      }
    };
    const report = await syncSessions(storage, [parsingSource]);
    assert.deepStrictEqual(totals(report), { ingested: 0, updated: 1, skipped: 1, removed: 0 });
    assert.strictEqual(storage.listSessions().length, 2);
    storage.close();
  });

  it('skips a multi-session file when every cached Session in it matches the signals', async () => {
    const storage = new SessionStorageManager({ databasePath: databasePath() });
    const signals = { mtimeMs: 1728000000000, sizeBytes: 128 };
    await syncSessions(storage, [source('kiro', [
      session({ id: 'kiro/file:a', toolSource: 'kiro', rawFilePath: 'D:/agent-data/multi.json',
        sourceSignals: signals }),
      session({ id: 'kiro/file:b', toolSource: 'kiro', rawFilePath: 'D:/agent-data/multi.json',
        sourceSignals: signals })
    ])]);

    let parseCount = 0;
    const parsingSource: SessionSource = {
      name: 'kiro',
      scan: async (hints) => {
        if (hints?.shouldSkipFile?.('D:/agent-data/multi.json', signals)) return [];
        parseCount++;
        return [];
      }
    };
    const report = await syncSessions(storage, [parsingSource]);
    assert.strictEqual(parseCount, 0);
    assert.deepStrictEqual(totals(report), { ingested: 0, updated: 0, skipped: 2, removed: 0 });
    assert.strictEqual(storage.listSessions().length, 2);
    storage.close();
  });
});
