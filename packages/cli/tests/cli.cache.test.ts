import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { CacheStatus, SessionMetadata } from '@prompttracker/core';

const cliPath = fileURLToPath(new URL('../../cli.js', import.meta.url));

const temporaryHomes: string[] = [];
afterEach(() => {
  for (const home of temporaryHomes.splice(0)) fs.rmSync(home, { recursive: true, force: true });
});

function newIsolatedHome(): string {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-lens-cache-e2e-'));
  temporaryHomes.push(home);
  return home;
}

function runCli(home: string, databasePath: string, args: string[], extraEnv: Record<string, string> = {}) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      HOME: home,
      USERPROFILE: home,
      PROMPT_LENS_CACHE_PATH: databasePath,
      ...extraEnv
    }
  });
}

function writeAntigravityFixture(home: string, convId: string, prompt: string, response: string): void {
  const transcriptDirectory = path.join(home, '.gemini', 'antigravity-ide', 'brain', convId,
    '.system_generated', 'logs');
  fs.mkdirSync(transcriptDirectory, { recursive: true });
  fs.writeFileSync(path.join(transcriptDirectory, 'transcript.jsonl'), [
    JSON.stringify({ type: 'USER_INPUT', content: prompt, created_at: '2026-09-05T08:00:00.000Z' }),
    JSON.stringify({ type: 'PLANNER_RESPONSE', content: response, created_at: '2026-09-05T08:01:00.000Z' })
  ].join('\n'));
}

describe('CLI cache commands', () => {
  it('reports Cached Content status with unambiguous naming and without memory labels', () => {
    const home = newIsolatedHome();
    const dbPath = path.join(home, '.prompttracker', 'data.db');
    writeAntigravityFixture(home, 'conv-1', 'Prompt 1', 'Response 1');

    // First scan and populate cache
    const listRes = runCli(home, dbPath, ['list', '--json', '--all']);
    assert.strictEqual(listRes.status, 0, listRes.stderr);

    // Run cache status in human-readable table format
    const statusRes = runCli(home, dbPath, ['cache', 'status']);
    assert.strictEqual(statusRes.status, 0, statusRes.stderr);
    assert.match(statusRes.stdout, /Prompt Lens Cached Content Status/);
    assert.match(statusRes.stdout, /Full-Content Caching/);
    assert.match(statusRes.stdout, /Cached Content Size/);
    assert.match(statusRes.stdout, /Content-Bearing Sessions/);
    assert.match(statusRes.stdout, /Configured Size Limit/);
    assert.match(statusRes.stdout, /Configured Age Limit/);
    assert.match(statusRes.stdout, /never transmitted/);

    // Verify no RAM / heap / RSS labeling
    assert.doesNotMatch(statusRes.stdout, /\bRAM\b/i);
    assert.doesNotMatch(statusRes.stdout, /\bheap\b/i);
    assert.doesNotMatch(statusRes.stdout, /\bRSS\b/i);
    assert.doesNotMatch(statusRes.stdout, /process memory/i);

    // Run cache status in JSON format
    const jsonRes = runCli(home, dbPath, ['cache', 'status', '--json']);
    assert.strictEqual(jsonRes.status, 0, jsonRes.stderr);
    const parsed = JSON.parse(jsonRes.stdout) as CacheStatus;
    assert.strictEqual(parsed.cacheFullContent, true);
    assert.strictEqual(parsed.contentBearingSessions, 1);
    assert.strictEqual(parsed.totalSessions, 1);
    assert.strictEqual(parsed.maxAgeDays, 30);
    assert.strictEqual(parsed.maxBytes, 250 * 1024 * 1024);
    assert.ok(parsed.totalContentBytes > 0);
  });

  it('safely clears cached content, retains Session metadata, and is idempotent', () => {
    const home = newIsolatedHome();
    const dbPath = path.join(home, '.prompttracker', 'data.db');
    writeAntigravityFixture(home, 'conv-1', 'Prompt 1', 'Response 1');
    writeAntigravityFixture(home, 'conv-2', 'Prompt 2', 'Response 2');

    // Ingest sessions
    runCli(home, dbPath, ['list', '--all']);

    // Check status before clear
    const beforeStatus = JSON.parse(runCli(home, dbPath, ['cache', 'status', '--json']).stdout) as CacheStatus;
    assert.strictEqual(beforeStatus.contentBearingSessions, 2);
    assert.strictEqual(beforeStatus.totalSessions, 2);
    assert.ok(beforeStatus.totalContentBytes > 0);

    // Run cache clear
    const clearRes = runCli(home, dbPath, ['cache', 'clear']);
    assert.strictEqual(clearRes.status, 0, clearRes.stderr);
    assert.match(clearRes.stdout, /Cleared Cached Content: evicted 2 sessions/);
    assert.match(clearRes.stdout, /Session metadata index and analytics have been preserved/);

    // Check status after clear
    const afterStatus = JSON.parse(runCli(home, dbPath, ['cache', 'status', '--json']).stdout) as CacheStatus;
    assert.strictEqual(afterStatus.contentBearingSessions, 0);
    assert.strictEqual(afterStatus.totalSessions, 2);
    assert.strictEqual(afterStatus.totalContentBytes, 0);

    // Verify session metadata is still present
    const listRes = runCli(home, dbPath, ['list', '--json', '--all']);
    assert.strictEqual(listRes.status, 0, listRes.stderr);
    const sessions = JSON.parse(listRes.stdout) as SessionMetadata[];
    assert.strictEqual(sessions.length, 2);
    assert.ok(sessions.every(s => !s.hasCachedContent));

    // Clearing a second time is idempotent
    const secondClear = runCli(home, dbPath, ['cache', 'clear']);
    assert.strictEqual(secondClear.status, 0, secondClear.stderr);
    assert.match(secondClear.stdout, /Cleared Cached Content: evicted 0 sessions/);
  });

  it('respects configuration file disabling full-content caching across CLI runs', () => {
    const home = newIsolatedHome();
    const configDir = path.join(home, '.prompttracker');
    fs.mkdirSync(configDir, { recursive: true });
    const configPath = path.join(configDir, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify({
      cache: { fullContent: false, maxAgeDays: 14, maxBytes: 50 * 1024 * 1024 }
    }));

    const dbPath = path.join(configDir, 'data.db');
    writeAntigravityFixture(home, 'conv-1', 'Prompt 1', 'Response 1');

    // Ingest with full content caching disabled
    const listRes = runCli(home, dbPath, ['list', '--json', '--all'], { PROMPT_LENS_CONFIG_PATH: configPath });
    assert.strictEqual(listRes.status, 0, listRes.stderr);
    const sessions = JSON.parse(listRes.stdout) as SessionMetadata[];
    assert.strictEqual(sessions.length, 1);
    assert.strictEqual(sessions[0].hasCachedContent, false);
    assert.strictEqual(sessions[0].ingestionState, 'metadata-only');

    // Check cache status
    const statusRes = runCli(home, dbPath, ['cache', 'status', '--json'], { PROMPT_LENS_CONFIG_PATH: configPath });
    assert.strictEqual(statusRes.status, 0, statusRes.stderr);
    const status = JSON.parse(statusRes.stdout) as CacheStatus;
    assert.strictEqual(status.cacheFullContent, false);
    assert.strictEqual(status.maxAgeDays, 14);
    assert.strictEqual(status.maxBytes, 50 * 1024 * 1024);
    assert.strictEqual(status.contentBearingSessions, 0);
    assert.strictEqual(status.totalSessions, 1);
    assert.strictEqual(status.totalContentBytes, 0);
  });

  it('migrates legacy JSON cache files automatically on scan or via cache migrate subcommand', () => {
    const home = newIsolatedHome();
    const dbPath = path.join(home, '.prompttracker', 'data.db');
    const legacyDir = path.join(home, '.prompttracker', 'cache');
    fs.mkdirSync(legacyDir, { recursive: true });

    const turns = [
      {
        turnIndex: 1,
        timestamp: '2026-08-30T10:00:00.000Z',
        userPrompt: 'Legacy prompt to migrate',
        assistantSummary: 'Legacy done',
        assistantResponse: 'Legacy complete response',
        tokens: { input: 15, output: 30, total: 45 }
      }
    ];
    fs.writeFileSync(path.join(legacyDir, 'antigravity-legacy-1.json'), JSON.stringify(turns, null, 2));

    // Explicit cache migrate command
    const migrateRes = runCli(home, dbPath, ['cache', 'migrate', '--dir', legacyDir]);
    assert.strictEqual(migrateRes.status, 0, migrateRes.stderr);
    assert.match(migrateRes.stdout, /Legacy Cache Migration Report/);
    assert.match(migrateRes.stdout, /Discovered: 1/);
    assert.match(migrateRes.stdout, /Migrated:\s+1/);

    // Verify file was cleaned up from legacy cache directory
    assert.strictEqual(fs.readdirSync(legacyDir).length, 0);

    // Check status in SQLite
    const statusRes = runCli(home, dbPath, ['cache', 'status', '--json']);
    assert.strictEqual(statusRes.status, 0, statusRes.stderr);
    const status = JSON.parse(statusRes.stdout) as CacheStatus;
    assert.strictEqual(status.contentBearingSessions, 1);
    assert.strictEqual(status.totalSessions, 1);
  });
});

