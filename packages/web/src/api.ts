import type { NormalizedSession, DailySummary, MetricAggregate } from '../../core/dist/types';

export interface TelemetrySummary {
  totalTokens: number;
  totalPrompts: number;
  totalCostUsd: number;
  totalSessions: number;
  byTool: Record<string, MetricAggregate>;
  byModel: Record<string, MetricAggregate>;
  daily: DailySummary[];
}

export const MOCK_SESSIONS: NormalizedSession[] = [
  {
    id: 'demo-ag-1',
    toolSource: 'antigravity',
    projectName: 'PromptTracker Monorepo',
    projectPath: '/Users/developer/Projects/PromptTracker',
    timestamp: '2026-08-31T10:30:00.000Z',
    date: '2026-08-31',
    model: 'gemini-3.7-flash',
    turns: [
      {
        turnIndex: 1,
        timestamp: '2026-08-31T10:30:00.000Z',
        userPrompt: 'Implement dynamic model pricing synchronization with OpenRouter',
        assistantSummary: 'Implemented PricingEngine with non-blocking 24h background sync and embedded offline fallback.',
        assistantResponse: 'Here is the completed implementation in packages/core/src/pricing.ts with 100% test coverage.',
        toolCalls: [
          { name: 'write_to_file', args: { TargetFile: 'packages/core/src/pricing.ts' } },
          { name: 'run_command', args: { CommandLine: 'node --test packages/core/dist/pricing.test.js' } }
        ],
        tokens: { input: 2400, output: 1800, total: 4200 }
      },
      {
        turnIndex: 2,
        timestamp: '2026-08-31T10:35:00.000Z',
        userPrompt: 'Connect dynamic model name extraction across all multi-tool scanners',
        assistantSummary: 'Updated normalizeModelName across Antigravity, Claude Code, and Codex scanners.',
        assistantResponse: 'Scanners now strip provider prefixes and convert arbitrary model names dynamically.',
        tokens: { input: 1900, output: 1400, total: 3300 }
      }
    ],
    totalTokens: { input: 4300, output: 3200, total: 7500 },
    estimatedCostUsd: 0.0025
  },
  {
    id: 'demo-claude-1',
    toolSource: 'claude_code',
    projectName: 'E-Commerce Core API',
    projectPath: '/Users/developer/Projects/StorefrontAPI',
    timestamp: '2026-08-31T09:15:00.000Z',
    date: '2026-08-31',
    model: 'claude-3-7-sonnet',
    turns: [
      {
        turnIndex: 1,
        timestamp: '2026-08-31T09:15:00.000Z',
        userPrompt: 'Optimize database indexing on order search query',
        assistantSummary: 'Added composite index on customer_id + created_at to reduce query scan latency.',
        assistantResponse: 'The SQL migration has been created and verified.',
        tokens: { input: 3500, output: 1200, total: 4700 }
      }
    ],
    totalTokens: { input: 3500, output: 1200, total: 4700 },
    estimatedCostUsd: 0.0285
  },
  {
    id: 'demo-codex-1',
    toolSource: 'codex',
    projectName: 'Authentication Microservice',
    projectPath: '/Users/developer/Projects/AuthService',
    timestamp: '2026-08-30T14:20:00.000Z',
    date: '2026-08-30',
    model: 'gpt-4o',
    turns: [
      {
        turnIndex: 1,
        timestamp: '2026-08-30T14:20:00.000Z',
        userPrompt: 'Implement OAuth2 refresh token rotation',
        assistantSummary: 'Configured Redis token cache with automatic one-time revocation.',
        tokens: { input: 2800, output: 1500, total: 4300 }
      }
    ],
    totalTokens: { input: 2800, output: 1500, total: 4300 },
    estimatedCostUsd: 0.0220
  }
];

export const MOCK_SUMMARY: TelemetrySummary = {
  totalTokens: 16500,
  totalPrompts: 4,
  totalCostUsd: 0.0530,
  totalSessions: 3,
  byTool: {
    antigravity: { prompts: 2, tokens: 7500, cost: 0.0025 },
    claude_code: { prompts: 1, tokens: 4700, cost: 0.0285 },
    codex: { prompts: 1, tokens: 4300, cost: 0.0220 }
  },
  byModel: {
    'gemini-3.7-flash': { prompts: 2, tokens: 7500, cost: 0.0025 },
    'claude-3-7-sonnet': { prompts: 1, tokens: 4700, cost: 0.0285 },
    'gpt-4o': { prompts: 1, tokens: 4300, cost: 0.0220 }
  },
  daily: [
    {
      date: '2026-08-31',
      totalPrompts: 3,
      totalTokens: 12200,
      totalCostUsd: 0.0310,
      sessionsCount: 2,
      byTool: { antigravity: { prompts: 2, tokens: 7500, cost: 0.0025 }, claude_code: { prompts: 1, tokens: 4700, cost: 0.0285 } },
      byModel: { 'gemini-3.7-flash': { prompts: 2, tokens: 7500, cost: 0.0025 }, 'claude-3-7-sonnet': { prompts: 1, tokens: 4700, cost: 0.0285 } },
      byProject: { 'PromptTracker Monorepo': { prompts: 2, tokens: 7500, cost: 0.0025 }, 'E-Commerce Core API': { prompts: 1, tokens: 4700, cost: 0.0285 } }
    },
    {
      date: '2026-08-30',
      totalPrompts: 1,
      totalTokens: 4300,
      totalCostUsd: 0.0220,
      sessionsCount: 1,
      byTool: { codex: { prompts: 1, tokens: 4300, cost: 0.0220 } },
      byModel: { 'gpt-4o': { prompts: 1, tokens: 4300, cost: 0.0220 } },
      byProject: { 'Authentication Microservice': { prompts: 1, tokens: 4300, cost: 0.0220 } }
    }
  ]
};

export async function fetchSessions(force = false): Promise<NormalizedSession[]> {
  try {
    const url = force ? '/api/sessions?force=true' : '/api/sessions';
    const res = await fetch(url);
    if (!res.ok) throw new Error('API offline');
    const json = await res.json();
    return json.data || [];
  } catch {
    // Graceful fallback for static demo deployments (Vercel / GitHub Pages)
    return MOCK_SESSIONS;
  }
}

export async function fetchSummary(): Promise<TelemetrySummary> {
  try {
    const res = await fetch('/api/summary');
    if (!res.ok) throw new Error('API offline');
    const json = await res.json();
    return json.summary;
  } catch {
    // Graceful fallback for static demo deployments
    return MOCK_SUMMARY;
  }
}

export async function openSessionInIDE(sessionId: string): Promise<string> {
  try {
    const res = await fetch('/api/open-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });
    if (!res.ok) throw new Error('Failed to open session');
    const json = await res.json();
    return json.transcriptPath;
  } catch {
    return 'Demo Mode: Local IDE launch is only available when running PromptTracker locally via CLI.';
  }
}
