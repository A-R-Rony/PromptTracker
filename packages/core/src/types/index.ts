export type TokenSource = 'provider_telemetry' | 'calculated_tokenizer' | 'estimated_heuristic';

export interface TokenMetrics {
  input: number;
  output: number;
  cached?: number;
  reasoning?: number;
  total: number;
  isEstimated?: boolean;
  source?: TokenSource;
}

export interface PromptTurn {
  turnIndex: number;
  timestamp: string;
  userPrompt: string;
  assistantSummary?: string;
  assistantResponse?: string;
  toolCalls?: Array<{ name: string; args?: any }>;
  tokens: TokenMetrics;
}

export interface NormalizedSession {
  id: string;
  toolSource: 'antigravity' | 'opencode' | 'claude_code' | 'cursor' | 'cline' | 'aider' | 'codex' | 'kiro';
  projectName: string;
  projectPath?: string;
  timestamp: string;
  date: string;
  model: string;
  turns: PromptTurn[];
  totalTokens: TokenMetrics;
  estimatedCostUsd: number;
  rawFilePath?: string;
}

export interface ToolScanner {
  readonly name: string;
  scan(): Promise<NormalizedSession[]>;
}

export interface MetricAggregate {
  prompts: number;
  tokens: number;
  cost: number;
}

export interface DailySummary {
  date: string;
  totalPrompts: number;
  totalTokens: number;
  totalCostUsd: number;
  sessionsCount: number;
  byTool: Record<string, MetricAggregate>;
  byModel: Record<string, MetricAggregate>;
  byProject: Record<string, MetricAggregate>;
}

export interface TelemetrySummary {
  totalTokens: number;
  totalPrompts: number;
  totalCostUsd: number;
  totalSessions: number;
  byTool: Record<string, MetricAggregate>;
  byModel: Record<string, MetricAggregate>;
  daily: DailySummary[];
}
