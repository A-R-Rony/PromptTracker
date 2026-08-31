import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AntigravityScanner } from './AntigravityScanner';
import { ClaudeCodeScanner } from './ClaudeCodeScanner';
import { CodexScanner } from './CodexScanner';
import { KiroScanner } from './KiroScanner';
import { OpenCodeScanner } from './OpenCodeScanner';

describe('Scanners Engine (Dynamic Model & Session Extraction)', () => {
  const tmpDir = path.join(os.tmpdir(), 'prompttracker-scanner-tests-' + Date.now());

  it('AntigravityScanner dynamically detects model, project CWD, tool calls, and prompt turns', async () => {
    const agDir = path.join(tmpDir, 'gemini', 'brain', 'conv-123', '.system_generated', 'logs');
    fs.mkdirSync(agDir, { recursive: true });

    const sampleLog = [
      JSON.stringify({ created_at: '2026-08-31T10:00:00Z', type: 'USER_INPUT', content: '<USER_REQUEST>Build scanner engine</USER_REQUEST><USER_SETTINGS_CHANGE>Model Selection: Gemini 3.7 Flash</USER_SETTINGS_CHANGE>' }),
      JSON.stringify({ created_at: '2026-08-31T10:00:05Z', type: 'PLANNER_RESPONSE', content: 'Creating scanner modules now.', tool_calls: [{ name: 'write_to_file', args: { TargetFile: 'd:/Projects/App/src/index.ts', Cwd: 'd:/Projects/App' } }] })
    ].join('\n');

    fs.writeFileSync(path.join(agDir, 'transcript.jsonl'), sampleLog, 'utf8');

    const scanner = new AntigravityScanner(path.join(tmpDir, 'gemini', 'brain'));
    const sessions = await scanner.scan();

    assert.strictEqual(sessions.length, 1);
    const s = sessions[0];
    assert.strictEqual(s.toolSource, 'antigravity');
    assert.strictEqual(s.projectName, 'Build scanner engine');
    assert.strictEqual(s.projectPath, 'd:/Projects/App');
    assert.strictEqual(s.model, 'gemini-3.7-flash');
    assert.strictEqual(s.turns.length, 1);
    assert.strictEqual(s.turns[0].userPrompt, 'Build scanner engine');
    assert.strictEqual(s.turns[0].assistantResponse, 'Creating scanner modules now.');
    assert.strictEqual(s.turns[0].toolCalls?.length, 1);
    assert.strictEqual(s.turns[0].toolCalls[0].name, 'write_to_file');
  });

  it('ClaudeCodeScanner dynamically parses exact hardware token usage and model headers', async () => {
    const claudeDir = path.join(tmpDir, 'claude', 'projects', 'proj-1');
    fs.mkdirSync(claudeDir, { recursive: true });

    const sampleLog = [
      JSON.stringify({ type: 'user_message', model: 'claude-3-7-sonnet', prompt: 'Refactor database queries', usage: { input_tokens: 1500 } }),
      JSON.stringify({ type: 'assistant_message', response: 'Here is the optimized SQL query.', usage: { output_tokens: 800 } })
    ].join('\n');

    fs.writeFileSync(path.join(claudeDir, 'history.jsonl'), sampleLog, 'utf8');

    const scanner = new ClaudeCodeScanner(path.join(tmpDir, 'claude'));
    const sessions = await scanner.scan();

    assert.strictEqual(sessions.length, 1);
    const s = sessions[0];
    assert.strictEqual(s.toolSource, 'claude_code');
    assert.strictEqual(s.model, 'claude-3-7-sonnet');
    assert.strictEqual(s.totalTokens.input, 1500);
    assert.strictEqual(s.totalTokens.output, 800);
    assert.strictEqual(s.totalTokens.total, 2300);
  });

  it('CodexScanner parses session messages and model IDs', async () => {
    const codexDir = path.join(tmpDir, 'codex', 'sessions');
    fs.mkdirSync(codexDir, { recursive: true });

    const sessionData = {
      model: 'gpt-4o',
      project: 'My-Codex-App',
      messages: [
        { role: 'user', content: 'Create a login form' },
        { role: 'assistant', content: 'Here is the HTML form.' }
      ]
    };

    fs.writeFileSync(path.join(codexDir, 'session-1.json'), JSON.stringify(sessionData), 'utf8');

    const scanner = new CodexScanner(codexDir);
    const sessions = await scanner.scan();

    assert.strictEqual(sessions.length, 1);
    assert.strictEqual(sessions[0].model, 'gpt-4o');
    assert.strictEqual(sessions[0].projectName, 'My-Codex-App');
  });
});
