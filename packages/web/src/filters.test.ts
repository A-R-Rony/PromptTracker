import { describe, it } from 'node:test';
import assert from 'node:assert';
import { filterSessionsByDatePreset } from './filters';
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
