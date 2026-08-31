import { describe, it } from 'node:test';
import assert from 'node:assert';
import { searchSessions, filterSessionsByDatePreset } from './filters';
import type { NormalizedSession } from '../../core/dist/types';

function session(overrides: Partial<NormalizedSession> = {}): NormalizedSession {
  return {
    id: 'sess',
    toolSource: 'claude_code',
    projectName: 'PromptTracker',
    timestamp: '2026-08-31T10:00:00.000Z',
    date: '2026-08-31',
    model: 'claude-3-7-sonnet',
    turns: [],
    totalTokens: { input: 0, output: 0, total: 0 },
    estimatedCostUsd: 0,
    ...overrides
  };
}

describe('searchSessions', () => {
  it('matches sessions by project name, case-insensitively', () => {
    const sessions = [
      session({ id: 'a', projectName: 'PromptTracker' }),
      session({ id: 'b', projectName: 'BackendService' })
    ];

    const results = searchSessions(sessions, 'prompttracker');
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].id, 'a');
  });

  it('matches sessions by tool source and model name', () => {
    const sessions = [
      session({ id: 'a', toolSource: 'antigravity' }),
      session({ id: 'b', model: 'gemini-3.7-flash' }),
      session({ id: 'c', toolSource: 'kiro', model: 'claude-3-7-sonnet' })
    ];

    assert.strictEqual(searchSessions(sessions, 'antigravity').length, 1);
    assert.strictEqual(searchSessions(sessions, 'antigravity')[0].id, 'a');

    assert.strictEqual(searchSessions(sessions, 'gemini').length, 1);
    assert.strictEqual(searchSessions(sessions, 'gemini')[0].id, 'b');

    assert.strictEqual(searchSessions(sessions, 'kiro').length, 1);
    assert.strictEqual(searchSessions(sessions, 'kiro')[0].id, 'c');
  });

  it('matches sessions by text inside any turn user prompt', () => {
    const sessions = [
      session({
        id: 'a',
        turns: [
          { turnIndex: 1, timestamp: '2026-08-31T10:00:00.000Z', userPrompt: 'Implement the login form', tokens: { input: 10, output: 10, total: 20 } },
          { turnIndex: 2, timestamp: '2026-08-31T10:05:00.000Z', userPrompt: 'Add validation', tokens: { input: 10, output: 10, total: 20 } }
        ]
      }),
      session({ id: 'b', turns: [{ turnIndex: 1, timestamp: '2026-08-31T11:00:00.000Z', userPrompt: 'Refactor the database', tokens: { input: 10, output: 10, total: 20 } }] })
    ];

    const results = searchSessions(sessions, 'validation');
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].id, 'a');
  });

  it('returns all sessions for a blank query', () => {
    const sessions = [session({ id: 'a' }), session({ id: 'b' })];
    assert.strictEqual(searchSessions(sessions, '').length, 2);
    assert.strictEqual(searchSessions(sessions, '   ').length, 2);
  });
});

describe('filterSessionsByDatePreset', () => {
  const NOW = new Date('2026-08-31T12:00:00.000Z').getTime();
  const now = () => NOW;

  const sessions = [
    session({ id: 's-today', date: '2026-08-31', timestamp: '2026-08-31T10:00:00.000Z' }),
    session({ id: 's-yesterday', date: '2026-08-30', timestamp: '2026-08-30T15:00:00.000Z' }),
    session({ id: 's-week', date: '2026-08-25', timestamp: '2026-08-25T10:00:00.000Z' }),
    session({ id: 's-old', date: '2026-07-01', timestamp: '2026-07-01T10:00:00.000Z' })
  ];

  it("preset 'today' keeps only sessions dated today", () => {
    const results = filterSessionsByDatePreset(sessions, 'today', now);
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].id, 's-today');
  });

  it("preset 'yesterday' keeps only sessions dated yesterday", () => {
    const results = filterSessionsByDatePreset(sessions, 'yesterday', now);
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].id, 's-yesterday');
  });

  it("preset '7d' keeps sessions timestamped within the last 7 days", () => {
    const results = filterSessionsByDatePreset(sessions, '7d', now);
    assert.deepStrictEqual(results.map(s => s.id), ['s-today', 's-yesterday', 's-week']);
  });

  it("preset '30d' keeps sessions timestamped within the last 30 days", () => {
    const results = filterSessionsByDatePreset(sessions, '30d', now);
    assert.deepStrictEqual(results.map(s => s.id), ['s-today', 's-yesterday', 's-week']);
  });

  it("preset 'all' keeps every session", () => {
    const results = filterSessionsByDatePreset(sessions, 'all', now);
    assert.strictEqual(results.length, 4);
  });
});
