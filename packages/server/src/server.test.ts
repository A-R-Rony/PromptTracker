import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as http from 'http';
import { Express } from 'express';
import { AddressInfo } from 'net';
import { NormalizedSession } from '../../core/dist';
import { createServer, ServerOptions } from './server';
import { makeSession, makeTurn } from './testHelpers';

function listen(app: Express): Promise<http.Server> {
  return new Promise(resolve => {
    const srv = app.listen(0, () => resolve(srv));
  });
}

function closeServer(srv: http.Server): Promise<void> {
  return new Promise(resolve => srv.close(() => resolve()));
}

describe('Express REST API (createServer)', () => {
  let server: http.Server;
  let baseUrl: string;
  let scans: number;
  let sessions: NormalizedSession[];
  let launchedPaths: string[];
  let exportedSessions: NormalizedSession[];
  let staticDir: string;

  beforeEach(() => {
    scans = 0;
    sessions = [
      makeSession({
        id: 'sess-1',
        turns: [makeTurn()],
        totalTokens: { input: 100, output: 300, total: 400 },
        estimatedCostUsd: 0.001
      }),
      makeSession({
        id: 'sess-2',
        toolSource: 'antigravity',
        model: 'gemini-3.7-flash',
        turns: [makeTurn()],
        totalTokens: { input: 100, output: 300, total: 400 },
        estimatedCostUsd: 0.001
      })
    ];
    launchedPaths = [];
    exportedSessions = [];
    staticDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prompttracker-server-test-'));
  });

  afterEach(async () => {
    if (server) await closeServer(server);
    try { fs.rmSync(staticDir, { recursive: true, force: true }); } catch {}
  });

  async function start(overrides: Partial<ServerOptions> = {}) {
    const app = createServer({
      sessionProvider: async () => {
        scans++;
        return sessions;
      },
      exporter: (s) => {
        exportedSessions.push(s);
        return path.join(staticDir, 'transcript-' + s.id + '.md');
      },
      launcher: (p) => launchedPaths.push(p),
      staticDir,
      ...overrides
    });
    server = await listen(app);
    baseUrl = 'http://127.0.0.1:' + (server.address() as AddressInfo).port;
  }

  it('GET /api/sessions returns all normalized sessions with count', async () => {
    await start();
    const res = await fetch(baseUrl + '/api/sessions');
    assert.strictEqual(res.status, 200);
    const body = await res.json();

    assert.strictEqual(body.success, true);
    assert.strictEqual(body.count, 2);
    assert.strictEqual(body.data.length, 2);
    assert.strictEqual(body.data[0].id, 'sess-1');
    assert.strictEqual(scans, 1);
  });

  it('GET /api/sessions serves from the 10s cache and only re-scans on force=true or refresh=true', async () => {
    await start();

    await fetch(baseUrl + '/api/sessions');
    assert.strictEqual(scans, 1);

    await fetch(baseUrl + '/api/sessions');
    assert.strictEqual(scans, 1);

    await fetch(baseUrl + '/api/sessions?force=true');
    assert.strictEqual(scans, 2);

    await fetch(baseUrl + '/api/sessions?refresh=true');
    assert.strictEqual(scans, 3);
  });

  it('GET /api/summary returns totals, tool aggregates, model spend breakdown, and daily summaries', async () => {
    await start();
    const res = await fetch(baseUrl + '/api/summary');
    assert.strictEqual(res.status, 200);
    const body = await res.json();

    assert.strictEqual(body.success, true);
    assert.strictEqual(body.summary.totalTokens, 800);
    assert.strictEqual(body.summary.totalPrompts, 2);
    assert.strictEqual(body.summary.totalCostUsd, 0.002);
    assert.strictEqual(body.summary.totalSessions, 2);
    assert.deepStrictEqual(body.summary.byTool['claude_code'], { prompts: 1, tokens: 400, cost: 0.001 });
    assert.deepStrictEqual(body.summary.byModel['gemini-3.7-flash'], { prompts: 1, tokens: 400, cost: 0.001 });
    assert.strictEqual(body.summary.daily.length, 1);
    assert.strictEqual(body.summary.daily[0].sessionsCount, 2);
  });

  it('POST /api/open-session exports the transcript, launches the IDE, and returns the path', async () => {
    await start();
    const res = await fetch(baseUrl + '/api/open-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'sess-2' })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();

    assert.strictEqual(body.success, true);
    assert.ok(body.transcriptPath.includes('transcript-sess-2.md'));
    assert.strictEqual(exportedSessions.length, 1);
    assert.strictEqual(exportedSessions[0].id, 'sess-2');
    assert.deepStrictEqual(launchedPaths, [body.transcriptPath]);
  });

  it('POST /api/open-session returns 404 for an unknown session id', async () => {
    await start();
    const res = await fetch(baseUrl + '/api/open-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'does-not-exist' })
    });
    assert.strictEqual(res.status, 404);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(launchedPaths.length, 0);
  });

  it('POST /api/open-session returns 400 when sessionId is missing', async () => {
    await start();
    const res = await fetch(baseUrl + '/api/open-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });

  it('responds 500 with an error payload when scanning fails', async () => {
    await start({
      sessionProvider: async () => {
        throw new Error('disk exploded');
      }
    });
    const res = await fetch(baseUrl + '/api/sessions');
    assert.strictEqual(res.status, 500);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error, 'disk exploded');
  });

  it('serves static files from the configured directory', async () => {
    fs.writeFileSync(path.join(staticDir, 'index.html'), '<html>dashboard</html>', 'utf8');
    await start();
    const res = await fetch(baseUrl + '/');
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('dashboard'));
  });
});
