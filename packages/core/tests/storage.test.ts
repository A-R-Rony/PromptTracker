import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SessionStorageError, SessionStorageManager } from '../src/storage';
import { NormalizedSession } from '../src/types';

const temporaryDirectories: string[] = [];
function databasePath(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-lens-sqlite-'));
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
      toolCalls: [{ name: 'apply_patch', args: { patch: 'full payload' } }],
      tokens: { input: 11, output: 13, cached: 2, reasoning: 3, total: 29 } }],
    totalTokens: { input: 11, output: 13, cached: 2, reasoning: 3, total: 29 },
    estimatedCostUsd: 0.0042, rawFilePath: 'D:/agent-data/session.jsonl', ...overrides
  };
}
afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

describe('SQLite Session cache', () => {
  it('lists Session metadata without complete Turns and lazily restores full-fidelity content after restart', () => {
    const dbPath = databasePath();
    const original = session();
    const firstRun = new SessionStorageManager({ databasePath: dbPath });
    firstRun.upsertSession(original);
    firstRun.close();
    const secondRun = new SessionStorageManager({ databasePath: dbPath });
    const cached = secondRun.listSessions();
    assert.strictEqual(cached.length, 1);
    assert.strictEqual(cached[0].projectName, 'PromptTracker');
    assert.strictEqual(cached[0].turnCount, 1);
    assert.strictEqual(cached[0].hasCachedContent, true);
    assert.strictEqual(cached[0].ingestionState, 'complete');
    assert.deepStrictEqual(secondRun.loadFullTurns(cached[0]), original.turns);
    secondRun.close();
  });

  it('upserts the same authoritative Session idempotently', () => {
    const manager = new SessionStorageManager({ databasePath: databasePath() });
    manager.upsertSession(session());
    manager.upsertSession(session({ projectName: 'Renamed Project' }));
    const cached = manager.listSessions();
    assert.strictEqual(cached.length, 1);
    assert.strictEqual(cached[0].projectName, 'Renamed Project');
    assert.strictEqual(cached[0].totalTokens.total, 29);
    assert.strictEqual(manager.loadFullTurns(cached[0]).length, 1);
    manager.close();
  });

  it('can rebuild after its disposable database is deleted', () => {
    const dbPath = databasePath();
    const authoritative = session();
    const first = new SessionStorageManager({ databasePath: dbPath });
    first.upsertSession(authoritative);
    first.close();
    fs.rmSync(dbPath);
    const rebuilt = new SessionStorageManager({ databasePath: dbPath });
    assert.deepStrictEqual(rebuilt.listSessions(), []);
    rebuilt.upsertSession(authoritative);
    assert.strictEqual(rebuilt.listSessions().length, 1);
    rebuilt.close();
  });

  it('surfaces actionable database lifecycle failures', () => {
    const parentFile = databasePath();
    fs.writeFileSync(parentFile, 'not a directory');
    assert.throws(
      () => new SessionStorageManager({ databasePath: path.join(parentFile, 'data.db') }),
      (error: unknown) => error instanceof SessionStorageError &&
        error.message.includes('Unable to open Prompt Lens cache')
    );

    const manager = new SessionStorageManager({ databasePath: databasePath() });
    manager.close();
    assert.throws(
      () => manager.listSessions(),
      (error: unknown) => error instanceof SessionStorageError &&
        error.message === 'Unable to list cached Sessions'
    );
  });
});
