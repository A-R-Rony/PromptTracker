import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exportSessionToMarkdown } from './exporter';
import { NormalizedSession } from './types';

describe('Markdown Transcript Exporter', () => {
  const session: NormalizedSession = {
    id: 'sess-export-1',
    toolSource: 'antigravity',
    projectName: 'PromptTracker',
    timestamp: '2026-08-31T10:00:00.000Z',
    date: '2026-08-31',
    model: 'gemini-3.7-flash',
    turns: [
      {
        turnIndex: 1,
        timestamp: '2026-08-31T10:00:00.000Z',
        userPrompt: 'Implement the server package',
        assistantSummary: 'Done implementing',
        assistantResponse: 'Full un-truncated response with code blocks',
        toolCalls: [{ name: 'write_to_file', args: { TargetFile: 'server.ts' } }],
        tokens: { input: 100, output: 200, total: 300 }
      }
    ],
    totalTokens: { input: 100, output: 200, total: 300 },
    estimatedCostUsd: 0.0005
  };

  it('writes a Markdown transcript with metadata, full responses, and collapsible tool calls', () => {
    const exportedPath = exportSessionToMarkdown(session);
    assert.ok(fs.existsSync(exportedPath));
    const content = fs.readFileSync(exportedPath, 'utf8');

    assert.ok(content.includes('# Conversation: PromptTracker'));
    assert.ok(content.includes('- **Tool / Assistant**: ANTIGRAVITY'));
    assert.ok(content.includes('- **Model**: gemini-3.7-flash'));
    assert.ok(content.includes('Full un-truncated response with code blocks'));
    assert.ok(content.includes('Tool Invocations (1)'));
    assert.ok(content.includes('write_to_file'));

    try { fs.unlinkSync(exportedPath); } catch {}
  });

  it('sanitizes unsafe project names out of the export filename', () => {
    const unsafe: NormalizedSession = { ...session, projectName: '..\\Evil <> Project Name!' };
    const exportedPath = exportSessionToMarkdown(unsafe);
    const fileName = path.basename(exportedPath);

    assert.ok(!fileName.includes('..'));
    assert.ok(!/[<>!\\]/.test(fileName));
    assert.ok(fileName.startsWith('2026-08-31_antigravity_'));

    try { fs.unlinkSync(exportedPath); } catch {}
  });
});
