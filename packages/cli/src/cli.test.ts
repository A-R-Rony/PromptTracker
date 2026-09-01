import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { NormalizedSession, exportSessionToMarkdown } from '@prompttracker/core';
import { filterSessionsByDate, parseRelativeDate } from './dateFilter.js';

describe('CLI Package Utilities', () => {
  const sampleSessions: NormalizedSession[] = [
    {
      id: 'sess-1',
      toolSource: 'antigravity',
      projectName: 'PromptTracker',
      timestamp: '2026-08-31T10:00:00.000Z',
      date: '2026-08-31',
      model: 'gemini-3.7-flash',
      turns: [
        {
          turnIndex: 1,
          timestamp: '2026-08-31T10:00:00.000Z',
          userPrompt: 'Implement date filtering',
          assistantSummary: 'Done implementing',
          assistantResponse: 'Full response with code',
          toolCalls: [{ name: 'write_to_file', args: { TargetFile: 'cli.ts' } }],
          tokens: { input: 100, output: 200, total: 300 }
        }
      ],
      totalTokens: { input: 100, output: 200, total: 300 },
      estimatedCostUsd: 0.0005
    },
    {
      id: 'sess-2',
      toolSource: 'claude_code',
      projectName: 'BackendService',
      timestamp: '2026-08-25T10:00:00.000Z',
      date: '2026-08-25',
      model: 'claude-3-7-sonnet',
      turns: [
        {
          turnIndex: 1,
          timestamp: '2026-08-25T10:00:00.000Z',
          userPrompt: 'Refactor SQL database',
          assistantSummary: 'SQL refactored',
          tokens: { input: 500, output: 500, total: 1000 }
        }
      ],
      totalTokens: { input: 500, output: 500, total: 1000 },
      estimatedCostUsd: 0.009
    }
  ];

  it('filters sessions by exact date', () => {
    const { filtered, label } = filterSessionsByDate(sampleSessions, { date: '2026-08-31' });
    assert.strictEqual(filtered.length, 1);
    assert.strictEqual(filtered[0].projectName, 'PromptTracker');
    assert.strictEqual(label, 'Date: 2026-08-31');
  });

  it('filters sessions by relative date', () => {
    const d = parseRelativeDate('7d');
    assert.ok(d instanceof Date);
    const { filtered } = filterSessionsByDate(sampleSessions, { since: '2026-08-28' });
    assert.strictEqual(filtered.length, 1);
    assert.strictEqual(filtered[0].id, 'sess-1');
  });

  it('exports formatted Markdown conversation with full un-truncated response and tool calls', () => {
    const exportedPath = exportSessionToMarkdown(sampleSessions[0]);
    assert.ok(fs.existsSync(exportedPath));
    const content = fs.readFileSync(exportedPath, 'utf8');

    assert.ok(content.includes('# Conversation: PromptTracker'));
    assert.ok(content.includes('Full response with code'));
    assert.ok(content.includes('Tool Invocations (1)'));
    assert.ok(content.includes('write_to_file'));

    // Clean up test export
    try { fs.unlinkSync(exportedPath); } catch {}
  });
});
