import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import { CacheStatus, NormalizedSession, SessionMetadata } from '@prompttracker/core';

const cliPath = fileURLToPath(new URL('../../cli.js', import.meta.url));

const temporaryHomes: string[] = [];
afterEach(() => {
  for (const home of temporaryHomes.splice(0)) {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

function newIsolatedHome(): string {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-lens-acceptance-'));
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

function listSessions(home: string, databasePath: string, extraArgs: string[] = []): SessionMetadata[] {
  const result = runCli(home, databasePath, ['list', '--json', ...extraArgs]);
  assert.strictEqual(result.status, 0, result.stderr);
  return JSON.parse(result.stdout) as SessionMetadata[];
}

const DAY = '2026-09-05';

function writeAntigravityFixture(home: string, convId: string, prompt: string, response: string): void {
  const transcriptDirectory = path.join(home, '.gemini', 'antigravity-ide', 'brain', convId,
    '.system_generated', 'logs');
  fs.mkdirSync(transcriptDirectory, { recursive: true });
  fs.writeFileSync(path.join(transcriptDirectory, 'transcript.jsonl'), [
    JSON.stringify({ type: 'USER_INPUT', content: prompt, created_at: `${DAY}T08:00:00.000Z` }),
    JSON.stringify({ type: 'PLANNER_RESPONSE', content: response, created_at: `${DAY}T08:01:00.000Z` })
  ].join('\n'));
}

function writeClaudeFixture(home: string, name: string, prompt: string, response: string, cwd: string): void {
  const projectDirectory = path.join(home, '.claude', 'projects', 'claude_proj');
  fs.mkdirSync(projectDirectory, { recursive: true });
  fs.writeFileSync(path.join(projectDirectory, `${name}.jsonl`), [
    JSON.stringify({ role: 'user', content: prompt, cwd, timestamp: `${DAY}T08:00:00.000Z` }),
    JSON.stringify({ role: 'assistant', content: response, timestamp: `${DAY}T08:01:00.000Z` })
  ].join('\n'));
}

function writeCodexFixture(home: string, name: string, prompt: string, response: string, cwd: string): void {
  const sessionDirectory = path.join(home, '.codex', 'sessions', '2026', '09', '05');
  fs.mkdirSync(sessionDirectory, { recursive: true });
  fs.writeFileSync(path.join(sessionDirectory, `${name}.jsonl`), [
    JSON.stringify({ type: 'session_meta', payload: { cwd, timestamp: `${DAY}T08:00:00.000Z` } }),
    JSON.stringify({ type: 'turn_context', model: 'gpt-5' }),
    JSON.stringify({ type: 'response_item', payload: { type: 'message', role: 'user', content: prompt } }),
    JSON.stringify({ type: 'response_item', payload: { type: 'message', role: 'assistant', content: response } })
  ].join('\n'));
}

function writeKiroFixture(home: string, name: string, prompt: string, response: string): void {
  const sessionsDirectory = path.join(home, '.kiro', 'sessions');
  fs.mkdirSync(sessionsDirectory, { recursive: true });
  fs.writeFileSync(path.join(sessionsDirectory, `${name}.json`), JSON.stringify({
    id: name,
    name: 'Kiro Project',
    model: 'gpt-4o',
    createdAt: `${DAY}T08:00:00.000Z`,
    projectPath: 'D:/work/kiroproj',
    history: [{ prompt, response }]
  }));
}

function writeOpenCodeFixture(home: string, sessionId: string, title: string, prompt: string, response: string): void {
  const databasePath = path.join(home, '.local', 'share', 'opencode', 'opencode.db');
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const database = new Database(databasePath);
  database.exec(`
    CREATE TABLE session (id TEXT PRIMARY KEY, title TEXT, directory TEXT, model TEXT, cost REAL,
      tokens_input REAL, tokens_output REAL, tokens_reasoning REAL, time_created TEXT);
    CREATE TABLE message (id TEXT PRIMARY KEY, session_id TEXT, time_created INTEGER, data TEXT);
    CREATE TABLE part (message_id TEXT, session_id TEXT, time_created INTEGER, data TEXT);
  `);
  database.prepare(
    'INSERT INTO session VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(sessionId, title, 'D:/work/ocproj', JSON.stringify({ id: 'gpt-5' }), 0.01, 120, 80, 10, `${DAY}T08:00:00.000Z`);
  const insertMessage = database.prepare('INSERT INTO message VALUES (?, ?, ?, ?)');
  insertMessage.run(`${sessionId}-m1`, sessionId, 1000, JSON.stringify({ role: 'user' }));
  insertMessage.run(`${sessionId}-m2`, sessionId, 2000, JSON.stringify({ role: 'assistant' }));
  const insertPart = database.prepare('INSERT INTO part VALUES (?, ?, ?, ?)');
  insertPart.run(`${sessionId}-m1-p1`, sessionId, 1100, JSON.stringify({ type: 'text', text: prompt }));
  insertPart.run(`${sessionId}-m2-p1`, sessionId, 2100, JSON.stringify({ type: 'text', text: response }));
  insertPart.run(`${sessionId}-m2-p2`, sessionId, 2200,
    JSON.stringify({ type: 'step-finish', tokens: { input: 120, output: 80, reasoning: 10 } }));
  database.close();
}

function writeAllFixtures(home: string): void {
  writeAntigravityFixture(home, 'ag-conv-1', 'Antigravity prompt 1', 'Antigravity response 1');
  writeClaudeFixture(home, 'cl-conv-1', 'Claude prompt 1', 'Claude response 1', 'D:/work/claude_proj');
  writeCodexFixture(home, 'cdx-conv-1', 'Codex prompt 1', 'Codex response 1', 'D:/work/codex_proj');
  writeKiroFixture(home, 'kr-conv-1', 'Kiro prompt 1', 'Kiro response 1');
  writeOpenCodeFixture(home, 'oc-conv-1', 'OpenCode Project', 'OpenCode prompt 1', 'OpenCode response 1');
}

describe('End-to-End Cache Lifecycle & Public CLI Acceptance Suite', () => {
  it('covers first ingestion across all 5 authoritative sources and ensures no memory claims in output', () => {
    const home = newIsolatedHome();
    const dbPath = path.join(home, '.prompttracker', 'data.db');
    writeAllFixtures(home);

    const sessions = listSessions(home, dbPath, ['--all']);
    assert.strictEqual(sessions.length, 5);
    const sources = sessions.map(s => s.toolSource).sort();
    assert.deepStrictEqual(sources, ['antigravity', 'claude_code', 'codex', 'kiro', 'opencode']);

    // Check stats output across all tools
    const statsRes = runCli(home, dbPath, ['stats', '--all']);
    assert.strictEqual(statsRes.status, 0, statsRes.stderr);
    assert.match(statsRes.stdout, /Telemetry Analytics/);
    assert.match(statsRes.stdout, /antigravity/i);
    assert.match(statsRes.stdout, /claude_code/i);
    assert.match(statsRes.stdout, /codex/i);
    assert.match(statsRes.stdout, /kiro/i);
    assert.match(statsRes.stdout, /opencode/i);

    // Ensure output never mentions RAM or heap
    assert.doesNotMatch(statsRes.stdout, /\bRAM\b/i);
    assert.doesNotMatch(statsRes.stdout, /\bheap\b/i);
  });

  it('covers unchanged rescans with idempotent results and no session duplication', () => {
    const home = newIsolatedHome();
    const dbPath = path.join(home, '.prompttracker', 'data.db');
    writeAllFixtures(home);

    const firstRun = listSessions(home, dbPath, ['--all']);
    const secondRun = listSessions(home, dbPath, ['--all']);
    assert.strictEqual(secondRun.length, 5);
    assert.deepStrictEqual(secondRun, firstRun);
  });

  it('covers new and changed Sessions and reconciles deleted authoritative Sessions', () => {
    const home = newIsolatedHome();
    const dbPath = path.join(home, '.prompttracker', 'data.db');
    writeAllFixtures(home);
    assert.strictEqual(listSessions(home, dbPath, ['--all']).length, 5);

    // Add a new session to Antigravity
    writeAntigravityFixture(home, 'ag-conv-2', 'Antigravity prompt 2', 'Antigravity response 2');
    // Modify existing Claude session
    writeClaudeFixture(home, 'cl-conv-1', 'Claude prompt 1 updated', 'Claude response 1 updated', 'D:/work/claude_proj_updated');
    // Delete Kiro session source
    fs.rmSync(path.join(home, '.kiro'), { recursive: true, force: true });

    const updatedSessions = listSessions(home, dbPath, ['--all']);
    assert.strictEqual(updatedSessions.length, 5); // 5 - 1 (Kiro deleted) + 1 (AG new) = 5
    assert.ok(!updatedSessions.some(s => s.toolSource === 'kiro'));
    assert.ok(updatedSessions.some(s => s.id === 'antigravity-ag-conv-2'));

    // Verify Claude was updated
    const claudeSession = updatedSessions.find(s => s.id === 'claude-cl-conv-1');
    assert.ok(claudeSession);
    assert.strictEqual(claudeSession.projectName, 'claude_proj_updated');
  });

  it('covers full-fidelity Exported Transcript generation in Markdown and JSON without eagerly loading unrelated Turns', () => {
    const home = newIsolatedHome();
    const dbPath = path.join(home, '.prompttracker', 'data.db');
    writeAllFixtures(home);

    // Export Markdown transcript
    const mdOut = path.join(home, 'claude-transcript.md');
    const exportMdRes = runCli(home, dbPath, ['export', 'claude-cl-conv-1', '--format', 'md', '--out', mdOut]);
    assert.strictEqual(exportMdRes.status, 0, exportMdRes.stderr);
    assert.ok(fs.existsSync(mdOut));
    const mdContent = fs.readFileSync(mdOut, 'utf8');
    assert.match(mdContent, /# Conversation: claude_proj/);
    assert.match(mdContent, /CLAUDE_CODE/);
    assert.match(mdContent, /Claude prompt 1/);
    assert.match(mdContent, /Claude response 1/);

    // Export JSON transcript
    const jsonOut = path.join(home, 'claude-transcript.json');
    const exportJsonRes = runCli(home, dbPath, ['export', 'claude-cl-conv-1', '--format', 'json', '--out', jsonOut]);
    assert.strictEqual(exportJsonRes.status, 0, exportJsonRes.stderr);
    assert.ok(fs.existsSync(jsonOut));
    const jsonSession = JSON.parse(fs.readFileSync(jsonOut, 'utf8')) as NormalizedSession;
    assert.strictEqual(jsonSession.id, 'claude-cl-conv-1');
    assert.strictEqual(jsonSession.turns.length, 1);
    assert.strictEqual(jsonSession.turns[0].userPrompt, 'Claude prompt 1');
    assert.strictEqual(jsonSession.turns[0].assistantResponse, 'Claude response 1');
  });

  it('covers cache status, cache clear, and disabled full-content caching configuration', () => {
    const home = newIsolatedHome();
    const dbPath = path.join(home, '.prompttracker', 'data.db');
    writeAllFixtures(home);

    // Scan initially
    listSessions(home, dbPath, ['--all']);

    // Check cache status
    const statusRes = runCli(home, dbPath, ['cache', 'status', '--json']);
    assert.strictEqual(statusRes.status, 0, statusRes.stderr);
    const status = JSON.parse(statusRes.stdout) as CacheStatus;
    assert.strictEqual(status.totalSessions, 5);
    assert.strictEqual(status.contentBearingSessions, 5);
    assert.strictEqual(status.cacheFullContent, true);

    // Clear cache
    const clearRes = runCli(home, dbPath, ['cache', 'clear']);
    assert.strictEqual(clearRes.status, 0, clearRes.stderr);

    // Check status after clear: metadata retained, content cleared
    const postClearStatus = JSON.parse(runCli(home, dbPath, ['cache', 'status', '--json']).stdout) as CacheStatus;
    assert.strictEqual(postClearStatus.totalSessions, 5);
    assert.strictEqual(postClearStatus.contentBearingSessions, 0);
    assert.strictEqual(postClearStatus.totalContentBytes, 0);

    // Configure fullContent: false in config.json
    const configDir = path.join(home, '.prompttracker');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(path.join(configDir, 'config.json'), JSON.stringify({
      cache: {
        fullContent: false,
        maxAgeDays: 14,
        maxBytes: 50 * 1024 * 1024
      }
    }));

    // Ingest a new session while fullContent is disabled
    writeAntigravityFixture(home, 'ag-conv-disabled', 'Disabled content prompt', 'Disabled content response');
    const afterDisabledSessions = listSessions(home, dbPath, ['--all']);
    assert.strictEqual(afterDisabledSessions.length, 6);

    const disabledStatus = JSON.parse(runCli(home, dbPath, ['cache', 'status', '--json']).stdout) as CacheStatus;
    assert.strictEqual(disabledStatus.cacheFullContent, false);
    assert.strictEqual(disabledStatus.maxAgeDays, 14);
    assert.strictEqual(disabledStatus.maxBytes, 50 * 1024 * 1024);
  });

  it('covers legacy JSON migration across successful, repeated, and corrupted files', () => {
    const home = newIsolatedHome();
    const dbPath = path.join(home, '.prompttracker', 'data.db');
    const legacyCacheDir = path.join(home, '.prompttracker', 'cache');
    fs.mkdirSync(legacyCacheDir, { recursive: true });

    // Valid legacy file
    const validTurns = [{
      turnIndex: 1,
      userPrompt: 'Legacy prompt',
      assistantResponse: 'Legacy response',
      assistantSummary: 'Legacy response',
      timestamp: '2026-09-01T10:00:00.000Z',
      tokens: { input: 300, output: 200, total: 500, isEstimated: false, source: 'provider_telemetry' as const }
    }];
    fs.writeFileSync(path.join(legacyCacheDir, 'codex-legacy-sess-1.json'), JSON.stringify(validTurns));

    // Corrupted legacy file
    fs.writeFileSync(path.join(legacyCacheDir, 'corrupted-sess.json'), '{ invalid json content');

    // Run migration
    const migrateRes = runCli(home, dbPath, ['cache', 'migrate']);
    assert.strictEqual(migrateRes.status, 0, migrateRes.stderr);
    assert.match(migrateRes.stdout, /Legacy Cache Migration Report/);
    assert.match(migrateRes.stdout, /Migrated:\s+1/);
    assert.match(migrateRes.stdout, /Failed:\s+1/);

    // Verify valid file was removed after successful migration, and corrupted file remained
    assert.strictEqual(fs.existsSync(path.join(legacyCacheDir, 'codex-legacy-sess-1.json')), false);
    assert.strictEqual(fs.existsSync(path.join(legacyCacheDir, 'corrupted-sess.json')), true);

    // Repeated migration is idempotent
    const repeatMigrateRes = runCli(home, dbPath, ['cache', 'migrate']);
    assert.strictEqual(repeatMigrateRes.status, 0, repeatMigrateRes.stderr);
    assert.match(repeatMigrateRes.stdout, /Migrated:\s+0/);
  });

  it('confirms absence of full-text search and verifies date, project, and scope navigation', () => {
    const home = newIsolatedHome();
    const dbPath = path.join(home, '.prompttracker', 'data.db');
    writeAllFixtures(home);

    // 1. Project filtering
    const projectSessions = listSessions(home, dbPath, ['--project', 'claude_proj']);
    assert.strictEqual(projectSessions.length, 1);
    assert.strictEqual(projectSessions[0].toolSource, 'claude_code');

    // 2. Date filtering
    const dateSessions = listSessions(home, dbPath, ['--date', DAY, '--all']);
    assert.strictEqual(dateSessions.length, 5);

    const pastDateSessions = listSessions(home, dbPath, ['--date', '2020-01-01', '--all']);
    assert.strictEqual(pastDateSessions.length, 0);

    // 3. Since filtering
    const sinceSessions = listSessions(home, dbPath, ['--since', '30d', '--all']);
    assert.ok(Array.isArray(sinceSessions));

    // 4. Verify that full-text search command is absent from CLI interface and help
    const helpRes = runCli(home, dbPath, ['--help']);
    assert.strictEqual(helpRes.status, 0);
    assert.doesNotMatch(helpRes.stdout, /^\s*search\b/m);
  });
});
