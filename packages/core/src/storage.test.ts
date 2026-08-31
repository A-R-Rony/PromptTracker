import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SessionStorageManager } from './storage';
import { NormalizedSession } from './types';

describe('SessionStorageManager (Threshold & Disk Spillover)', () => {
  const testCacheDir = path.join(os.homedir(), '.prompttracker', 'cache');

  beforeEach(() => {
    if (fs.existsSync(testCacheDir)) {
      const files = fs.readdirSync(testCacheDir);
      for (const f of files) {
        if (f.startsWith('test-session-')) {
          fs.unlinkSync(path.join(testCacheDir, f));
        }
      }
    }
  });

  it('keeps session in RAM when total memory is below threshold', () => {
    const manager = new SessionStorageManager(50); // 50MB budget
    const session: NormalizedSession = {
      id: 'test-session-1',
      toolSource: 'antigravity',
      projectName: 'Test Project',
      timestamp: new Date().toISOString(),
      date: '2026-08-31',
      model: 'gemini-3.7-flash',
      turns: [
        {
          turnIndex: 1,
          timestamp: new Date().toISOString(),
          userPrompt: 'Hello AI assistant',
          assistantSummary: 'Hello! How can I help you?',
          assistantResponse: 'Hello! How can I help you today with your code?',
          tokens: { input: 10, output: 20, total: 30 }
        }
      ],
      totalTokens: { input: 10, output: 20, total: 30 },
      estimatedCostUsd: 0.0001
    };

    manager.manageSessionMemory(session);
    const summary = manager.getMemoryUsageSummary();

    assert.strictEqual(summary.spilledCount, 0);
    // Turns remain intact in memory
    assert.strictEqual(session.turns[0].assistantResponse, 'Hello! How can I help you today with your code?');
  });

  it('spills session turns to disk cache when memory exceeds threshold and rehydrates lazily', () => {
    // Set a tiny budget of 0.0001 MB (~100 bytes) to force immediate spillover
    const manager = new SessionStorageManager(0.0001);

    const fullResponse = 'A'.repeat(500); // 500 chars = 1000 bytes
    const session: NormalizedSession = {
      id: 'test-session-spill',
      toolSource: 'antigravity',
      projectName: 'Large Project',
      timestamp: new Date().toISOString(),
      date: '2026-08-31',
      model: 'gemini-3.7-flash',
      turns: [
        {
          turnIndex: 1,
          timestamp: new Date().toISOString(),
          userPrompt: 'Generate a large component',
          assistantSummary: 'Preview summary',
          assistantResponse: fullResponse,
          tokens: { input: 100, output: 500, total: 600 }
        }
      ],
      totalTokens: { input: 100, output: 500, total: 600 },
      estimatedCostUsd: 0.001
    };

    manager.manageSessionMemory(session);
    const summary = manager.getMemoryUsageSummary();

    assert.strictEqual(summary.spilledCount, 1);
    // RAM turn is trimmed to preview size
    assert.strictEqual(session.turns[0].assistantResponse, undefined);

    // Lazy load rehydrates full turns from disk cache
    const rehydratedTurns = manager.loadFullTurns(session);
    assert.strictEqual(rehydratedTurns[0].assistantResponse, fullResponse);
  });
});
