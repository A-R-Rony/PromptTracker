import { describe, it } from 'node:test';
import assert from 'node:assert';
import { computeSummary } from './summary';
import { makeSession, makeTurn } from './testHelpers';

const fixtures = [
  makeSession({
    id: 's1',
    date: '2026-08-30',
    projectName: 'Alpha',
    turns: [makeTurn(), makeTurn({ turnIndex: 2, timestamp: '2026-08-30T10:05:00.000Z', userPrompt: 'b' })],
    totalTokens: { input: 200, output: 600, total: 800 },
    estimatedCostUsd: 0.01
  }),
  makeSession({
    id: 's2',
    toolSource: 'antigravity',
    model: 'gemini-3.7-flash',
    date: '2026-08-30',
    projectName: 'Beta',
    turns: [makeTurn({ timestamp: '2026-08-30T12:00:00.000Z', userPrompt: 'c', tokens: { input: 1000, output: 3000, total: 4000 } })],
    totalTokens: { input: 1000, output: 3000, total: 4000 },
    estimatedCostUsd: 0.002
  }),
  makeSession({
    id: 's3',
    date: '2026-08-29',
    projectName: 'Alpha',
    turns: [makeTurn({ timestamp: '2026-08-29T09:00:00.000Z', userPrompt: 'd' })],
    totalTokens: { input: 100, output: 300, total: 400 },
    estimatedCostUsd: 0.005
  })
];

describe('computeSummary (daily, tool, and model analytics)', () => {
  const summary = computeSummary(fixtures);

  it('computes grand totals across all sessions', () => {
    assert.strictEqual(summary.totalTokens, 5200);
    assert.strictEqual(summary.totalPrompts, 4);
    assert.strictEqual(summary.totalCostUsd, 0.017);
    assert.strictEqual(summary.totalSessions, 3);
  });

  it('aggregates prompts, tokens, and cost per tool', () => {
    assert.deepStrictEqual(summary.byTool['claude_code'], { prompts: 3, tokens: 1200, cost: 0.015 });
    assert.deepStrictEqual(summary.byTool['antigravity'], { prompts: 1, tokens: 4000, cost: 0.002 });
  });

  it('breaks down spend per model', () => {
    assert.deepStrictEqual(summary.byModel['claude-3-7-sonnet'], { prompts: 3, tokens: 1200, cost: 0.015 });
    assert.deepStrictEqual(summary.byModel['gemini-3.7-flash'], { prompts: 1, tokens: 4000, cost: 0.002 });
  });

  it('builds per-day summaries sorted newest first, with per-tool/model/project breakdowns', () => {
    assert.strictEqual(summary.daily.length, 2);
    assert.strictEqual(summary.daily[0].date, '2026-08-30');
    assert.strictEqual(summary.daily[1].date, '2026-08-29');

    const latest = summary.daily[0];
    assert.strictEqual(latest.sessionsCount, 2);
    assert.strictEqual(latest.totalPrompts, 3);
    assert.strictEqual(latest.totalTokens, 4800);
    assert.strictEqual(latest.totalCostUsd, 0.012);
    assert.deepStrictEqual(latest.byProject['Alpha'], { prompts: 2, tokens: 800, cost: 0.01 });
    assert.deepStrictEqual(latest.byTool['antigravity'], { prompts: 1, tokens: 4000, cost: 0.002 });
    assert.strictEqual(latest.byModel['claude-3-7-sonnet'].tokens, 800);
  });

  it('rounds cost once after accumulating, so sub-cent sessions are not lost', () => {
    const tiny = [
      makeSession({ id: 't1', estimatedCostUsd: 0.00004 }),
      makeSession({ id: 't2', estimatedCostUsd: 0.00004 })
    ];
    const result = computeSummary(tiny);
    assert.strictEqual(result.totalCostUsd, 0.0001);
  });

  it('returns zeroed aggregates for empty input', () => {
    const empty = computeSummary([]);
    assert.strictEqual(empty.totalTokens, 0);
    assert.strictEqual(empty.totalPrompts, 0);
    assert.strictEqual(empty.totalCostUsd, 0);
    assert.strictEqual(empty.totalSessions, 0);
    assert.deepStrictEqual(empty.byTool, {});
    assert.deepStrictEqual(empty.byModel, {});
    assert.deepStrictEqual(empty.daily, []);
  });
});
