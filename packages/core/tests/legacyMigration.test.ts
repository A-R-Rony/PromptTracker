import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PromptTurn } from '../src/types';
import { SessionStorageManager } from '../src/storage';
import { migrateLegacyJsonCache, parseLegacyFileName } from '../src/legacyMigration';

const temporaryDirectories: string[] = [];

function createTempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  temporaryDirectories.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of temporaryDirectories.splice(0)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {}
  }
});

function sampleTurns(content: string = 'Hello World'): PromptTurn[] {
  return [
    {
      turnIndex: 1,
      timestamp: '2026-08-30T10:00:00.000Z',
      userPrompt: 'Write a quick function',
      assistantSummary: 'Function created',
      assistantResponse: `Complete response: ${content}`,
      toolCalls: [{ name: 'write_to_file', args: { path: 'index.ts' } }],
      tokens: { input: 20, output: 40, total: 60 }
    }
  ];
}

describe('Legacy JSON cache migration', () => {
  it('parses legacy file names with tool prefixes and default fallbacks', () => {
    assert.deepStrictEqual(
      parseLegacyFileName('claude_code-sess-123.json'),
      { id: 'sess-123', toolSource: 'claude_code' }
    );
    assert.deepStrictEqual(
      parseLegacyFileName('codex-abc-def.json'),
      { id: 'abc-def', toolSource: 'codex' }
    );
    assert.deepStrictEqual(
      parseLegacyFileName('simple-sess.json', 'antigravity'),
      { id: 'simple-sess', toolSource: 'antigravity' }
    );
  });

  it('migrates valid legacy JSON files, verifies content in SQLite, and deletes legacy files', async () => {
    const legacyDir = createTempDir('legacy-cache-');
    const dbDir = createTempDir('sqlite-db-');
    const dbPath = path.join(dbDir, 'data.db');

    const turns1 = sampleTurns('Turn 1 payload');
    const turns2 = sampleTurns('Turn 2 payload');

    fs.writeFileSync(path.join(legacyDir, 'antigravity-sess-1.json'), JSON.stringify(turns1, null, 2));
    fs.writeFileSync(path.join(legacyDir, 'claude_code-sess-2.json'), JSON.stringify(turns2, null, 2));

    const storage = new SessionStorageManager({ databasePath: dbPath });

    const report = await migrateLegacyJsonCache(storage, { legacyCacheDir: legacyDir });

    assert.strictEqual(report.discovered, 2);
    assert.strictEqual(report.migrated, 2);
    assert.strictEqual(report.failed.length, 0);

    // Verify files were removed from legacy cache dir
    assert.strictEqual(fs.readdirSync(legacyDir).length, 0);

    // Verify stored content in SQLite matches exactly
    const loaded1 = storage.loadFullTurns({ id: 'sess-1', toolSource: 'antigravity' });
    assert.deepStrictEqual(loaded1, turns1);

    const loaded2 = storage.loadFullTurns({ id: 'sess-2', toolSource: 'claude_code' });
    assert.deepStrictEqual(loaded2, turns2);

    storage.close();
  });

  it('leaves malformed JSON and invalid schema files untouched with actionable diagnostics', async () => {
    const legacyDir = createTempDir('legacy-cache-');
    const dbDir = createTempDir('sqlite-db-');
    const dbPath = path.join(dbDir, 'data.db');

    // 1. Malformed JSON
    fs.writeFileSync(path.join(legacyDir, 'bad-json.json'), '{ invalid json');
    // 2. Valid JSON but invalid PromptTurn[] schema
    fs.writeFileSync(path.join(legacyDir, 'bad-schema.json'), JSON.stringify({ not: 'an array' }));
    // 3. Valid file
    const validTurns = sampleTurns('Valid content');
    fs.writeFileSync(path.join(legacyDir, 'valid.json'), JSON.stringify(validTurns));

    const storage = new SessionStorageManager({ databasePath: dbPath });

    const report = await migrateLegacyJsonCache(storage, { legacyCacheDir: legacyDir });

    assert.strictEqual(report.discovered, 3);
    assert.strictEqual(report.migrated, 1);
    assert.strictEqual(report.failed.length, 2);

    // Bad files remain on disk
    assert.ok(fs.existsSync(path.join(legacyDir, 'bad-json.json')));
    assert.ok(fs.existsSync(path.join(legacyDir, 'bad-schema.json')));
    // Valid file was removed
    assert.ok(!fs.existsSync(path.join(legacyDir, 'valid.json')));

    // Actionable errors reported
    assert.ok(report.failed.some(f => f.file === 'bad-json.json' && f.error.includes('Invalid JSON')));
    assert.ok(report.failed.some(f => f.file === 'bad-schema.json' && f.error.includes('PromptTurn[] schema')));

    storage.close();
  });

  it('is idempotent when run repeatedly or resuming an interrupted migration', async () => {
    const legacyDir = createTempDir('legacy-cache-');
    const dbDir = createTempDir('sqlite-db-');
    const dbPath = path.join(dbDir, 'data.db');

    const turns = sampleTurns('Idempotent payload');
    fs.writeFileSync(path.join(legacyDir, 'antigravity-sess-idemp.json'), JSON.stringify(turns));

    const storage = new SessionStorageManager({ databasePath: dbPath });

    // First run
    const report1 = await migrateLegacyJsonCache(storage, { legacyCacheDir: legacyDir });
    assert.strictEqual(report1.migrated, 1);

    // Second run with empty legacy directory
    const report2 = await migrateLegacyJsonCache(storage, { legacyCacheDir: legacyDir });
    assert.strictEqual(report2.discovered, 0);
    assert.strictEqual(report2.migrated, 0);

    // Verify data remains intact
    const loaded = storage.loadFullTurns({ id: 'sess-idemp', toolSource: 'antigravity' });
    assert.deepStrictEqual(loaded, turns);

    storage.close();
  });

  it('does not store full content when full-content caching is disabled', async () => {
    const legacyDir = createTempDir('legacy-cache-');
    const dbDir = createTempDir('sqlite-db-');
    const dbPath = path.join(dbDir, 'data.db');

    const turns = sampleTurns('Disabled content');
    fs.writeFileSync(path.join(legacyDir, 'antigravity-sess-nocache.json'), JSON.stringify(turns));

    const storage = new SessionStorageManager({
      databasePath: dbPath,
      cacheFullContent: false
    });

    const report = await migrateLegacyJsonCache(storage, { legacyCacheDir: legacyDir });
    assert.strictEqual(report.discovered, 1);
    assert.strictEqual(report.skipped, 1);
    assert.strictEqual(report.migrated, 0);

    // File remains untouched since full content caching is disabled
    assert.ok(fs.existsSync(path.join(legacyDir, 'antigravity-sess-nocache.json')));

    storage.close();
  });

  it('enforces retention policies on migrated content', async () => {
    const legacyDir = createTempDir('legacy-cache-');
    const dbDir = createTempDir('sqlite-db-');
    const dbPath = path.join(dbDir, 'data.db');

    const turnsLarge = [
      {
        turnIndex: 1,
        timestamp: '2026-08-30T10:00:00.000Z',
        userPrompt: 'Large prompt',
        assistantResponse: 'X'.repeat(5000),
        tokens: { input: 1000, output: 2000, total: 3000 }
      }
    ];
    fs.writeFileSync(path.join(legacyDir, 'antigravity-sess-huge.json'), JSON.stringify(turnsLarge));

    // Limit cache to 1000 bytes so 5000-byte turn is evicted by retention
    const storage = new SessionStorageManager({
      databasePath: dbPath,
      retention: { maxBytes: 1000 }
    });

    const report = await migrateLegacyJsonCache(storage, { legacyCacheDir: legacyDir });
    assert.strictEqual(report.migrated, 1);

    // Check status after retention enforcement
    const status = storage.getCacheStatus();
    assert.ok(status.totalContentBytes <= 1000);

    storage.close();
  });
});
