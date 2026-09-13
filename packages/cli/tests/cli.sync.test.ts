import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import { NormalizedSession, SessionMetadata, SessionStorageError, SessionStorageManager } from '@prompttracker/core';

const cliPath = fileURLToPath(new URL('../src/cli.js', import.meta.url));

const temporaryHomes: string[] = [];
afterEach(() => {
  for (const home of temporaryHomes.splice(0)) fs.rmSync(home, { recursive: true, force: true });
});

function newIsolatedHome(): string {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-lens-sync-e2e-'));
  temporaryHomes.push(home);
  return home;
}

function runCli(home: string, databasePath: string, args: string[]) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    encoding: 'utf8',
    env: { ...process.env, HOME: home, USERPROFILE: home, PROMPT_LENS_CACHE_PATH: databasePath }
  });
}

function listSessions(home: string, databasePath: string): SessionMetadata[] {
  const result = runCli(home, databasePath, ['list', '--json', '--all']);
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
  const projectDirectory = path.join(home, '.claude', 'projects', 'proj');
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
    id: name, name: 'Kiro Project', model: 'gpt-4o', createdAt: `${DAY}T08:00:00.000Z`,
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
  writeAntigravityFixture(home, 'ag-conv-a', 'Antigravity first prompt', 'Antigravity first response');
  writeClaudeFixture(home, 'cl-conv-a', 'Claude first prompt', 'Claude first response', 'D:/work/claudeproj');
  writeCodexFixture(home, 'cdx-conv-a', 'Codex first prompt', 'Codex first response', 'D:/work/codexproj');
  writeKiroFixture(home, 'kr-conv-a', 'Kiro first prompt', 'Kiro first response');
  writeOpenCodeFixture(home, 'oc-conv-a', 'OpenCode Project', 'OpenCode first prompt', 'OpenCode first response');
}

function exportSession(home: string, databasePath: string, sessionId: string, outPath: string): NormalizedSession {
  const result = runCli(home, databasePath, ['export', sessionId, '--format', 'json', '--out', outPath]);
  assert.strictEqual(result.status, 0, result.stderr);
  return JSON.parse(fs.readFileSync(outPath, 'utf8')) as NormalizedSession;
}

describe('Incremental sync across CLI process restarts', () => {
  const sqlite3Available = spawnSync('sqlite3', ['-version']).status === 0;

  it('indexes all five authoritative sources on a first scan', () => {
    if (!sqlite3Available) return;
    const home = newIsolatedHome();
    const databasePath = path.join(home, '.prompttracker', 'data.db');
    writeAllFixtures(home);

    const sessions = listSessions(home, databasePath);
    assert.strictEqual(sessions.length, 5);
    assert.deepStrictEqual(sessions.map(s => s.toolSource).sort(),
      ['antigravity', 'claude_code', 'codex', 'kiro', 'opencode']);
  });

  it('produces identical user-visible results and no duplication on a repeated scan', () => {
    if (!sqlite3Available) return;
    const home = newIsolatedHome();
    const databasePath = path.join(home, '.prompttracker', 'data.db');
    writeAllFixtures(home);

    const first = listSessions(home, databasePath);
    const repeated = listSessions(home, databasePath);
    assert.deepStrictEqual(repeated, first);
    assert.strictEqual(repeated.length, 5);
  });

  it('surfaces new source Sessions after an incremental scan', () => {
    const home = newIsolatedHome();
    const databasePath = path.join(home, '.prompttracker', 'data.db');
    writeAntigravityFixture(home, 'ag-conv-a', 'Antigravity first prompt', 'Antigravity first response');
    assert.strictEqual(listSessions(home, databasePath).length, 1);

    writeAntigravityFixture(home, 'ag-conv-b', 'Antigravity second prompt', 'Antigravity second response');
    const sessions = listSessions(home, databasePath);
    assert.strictEqual(sessions.length, 2);
    assert.ok(sessions.some(s => s.id === 'antigravity-ag-conv-b' && s.turnCount === 1));
  });

  it('replaces stale metadata and content for changed source Sessions', () => {
    if (!sqlite3Available) return;
    const home = newIsolatedHome();
    const databasePath = path.join(home, '.prompttracker', 'data.db');
    writeAllFixtures(home);
    listSessions(home, databasePath);

    writeCodexFixture(home, 'cdx-conv-a', 'Codex first prompt', 'A changed and longer Codex response', 'D:/work/codexproj2');
    const sessions = listSessions(home, databasePath);
    const codex = sessions.find(s => s.id === 'codex-cdx-conv-a');
    assert.ok(codex);
    assert.strictEqual(codex.projectName, 'codexproj2');

    const outPath = path.join(home, 'codex-export.json');
    const exported = exportSession(home, databasePath, 'codex-cdx-conv-a', outPath);
    assert.strictEqual(exported.turns[0].assistantResponse, 'A changed and longer Codex response');
  });

  it('reconciles deleted source Sessions out of the cache', () => {
    if (!sqlite3Available) return;
    const home = newIsolatedHome();
    const databasePath = path.join(home, '.prompttracker', 'data.db');
    writeAllFixtures(home);
    assert.strictEqual(listSessions(home, databasePath).length, 5);

    fs.rmSync(path.join(home, '.kiro'), { recursive: true, force: true });
    const sessions = listSessions(home, databasePath);
    assert.strictEqual(sessions.length, 4);
    assert.ok(!sessions.some(s => s.toolSource === 'kiro'));

    const result = runCli(home, databasePath, ['export', 'kiro-kr-conv-a', '--format', 'json', '--out', path.join(home, 'gone.json')]);
    assert.notStrictEqual(result.status, 0);
    assert.ok(result.stderr.includes('not found') || result.stdout.includes('not found'));
  });

  it('rehydrates evicted content from the authoritative source and recaches it', () => {
    if (!sqlite3Available) return;
    const home = newIsolatedHome();
    const databasePath = path.join(home, '.prompttracker', 'data.db');
    writeAllFixtures(home);
    listSessions(home, databasePath);

    const evictor = new SessionStorageManager({ databasePath });
    evictor.evictCachedContent({ id: 'codex-cdx-conv-a', toolSource: 'codex' });
    assert.strictEqual(
      evictor.listSessions().find(s => s.id === 'codex-cdx-conv-a')?.hasCachedContent, false);
    evictor.close();

    const outPath = path.join(home, 'rehydrated-export.json');
    const exported = exportSession(home, databasePath, 'codex-cdx-conv-a', outPath);
    assert.strictEqual(exported.turns[0].assistantResponse, 'Codex first response');

    const verifier = new SessionStorageManager({ databasePath });
    const recached = verifier.listSessions().find(s => s.id === 'codex-cdx-conv-a');
    assert.strictEqual(recached?.hasCachedContent, true);
    assert.strictEqual(verifier.loadFullTurns(recached!)[0].userPrompt, 'Codex first prompt');
    verifier.close();
  });

  it('warns and retains cached Sessions when an authoritative source becomes unreadable', () => {
    if (!sqlite3Available) return;
    const home = newIsolatedHome();
    const databasePath = path.join(home, '.prompttracker', 'data.db');
    writeAllFixtures(home);
    assert.strictEqual(listSessions(home, databasePath).length, 5);

    fs.writeFileSync(path.join(home, '.local', 'share', 'opencode', 'opencode.db'), 'this is not a database');
    const result = spawnSync(process.execPath, [cliPath, 'list', '--json', '--all'], {
      encoding: 'utf8',
      env: { ...process.env, HOME: home, USERPROFILE: home, PROMPT_LENS_CACHE_PATH: databasePath }
    });
    assert.strictEqual(result.status, 0, result.stderr);
    assert.ok(result.stderr.includes('opencode'));
    const sessions = JSON.parse(result.stdout) as SessionMetadata[];
    assert.strictEqual(sessions.length, 5);
    assert.ok(sessions.some(s => s.toolSource === 'opencode'));
    assert.ok(sessions.some(s => s.toolSource === 'codex'));
  });

  it('reconciles malformed changed records without corrupting unrelated cached Sessions', () => {
    if (!sqlite3Available) return;
    const home = newIsolatedHome();
    const databasePath = path.join(home, '.prompttracker', 'data.db');
    writeAllFixtures(home);
    assert.strictEqual(listSessions(home, databasePath).length, 5);

    fs.writeFileSync(path.join(home, '.kiro', 'sessions', 'kr-conv-a.json'), '{not valid json');
    const sessions = listSessions(home, databasePath);
    assert.strictEqual(sessions.length, 4);
    assert.ok(sessions.some(s => s.toolSource === 'codex'));
    assert.ok(sessions.some(s => s.toolSource === 'opencode'));
  });

  it('does not retain unique historical telemetry after every authoritative copy disappears', () => {
    if (!sqlite3Available) return;
    const home = newIsolatedHome();
    const databasePath = path.join(home, '.prompttracker', 'data.db');
    writeAllFixtures(home);
    listSessions(home, databasePath);

    fs.rmSync(path.join(home, '.kiro'), { recursive: true, force: true });
    listSessions(home, databasePath);

    const verifier = new SessionStorageManager({ databasePath });
    assert.ok(!verifier.listSessions().some(s => s.toolSource === 'kiro'));
    assert.throws(
      () => verifier.loadFullTurns({ id: 'kiro-kr-conv-a', toolSource: 'kiro' }),
      SessionStorageError
    );
    verifier.close();
  });
});
