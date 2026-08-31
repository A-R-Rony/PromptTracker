import { NormalizedSession, PromptTurn } from '../../core/dist';

export function makeTurn(overrides: Partial<PromptTurn> = {}): PromptTurn {
  return {
    turnIndex: 1,
    timestamp: '2026-08-31T10:00:00.000Z',
    userPrompt: 'sample prompt',
    tokens: { input: 100, output: 300, total: 400 },
    ...overrides
  };
}

export function makeSession(overrides: Partial<NormalizedSession> = {}): NormalizedSession {
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
