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

export interface SourceSignals {
  mtimeMs?: number;
  sizeBytes?: number;
  fingerprint?: string;
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
  sourceSignals?: SourceSignals;
}

export interface SessionMetadata extends Omit<NormalizedSession, 'turns'> {
  turnCount: number;
  hasCachedContent: boolean;
  ingestionState: 'complete' | 'content-evicted';
}

export interface ScanHints {
  shouldSkipFile?(filePath: string, signals: { mtimeMs: number; sizeBytes: number }): boolean;
}

export interface ToolScanner {
  readonly name: NormalizedSession['toolSource'];
  scan(options?: ScanHints): Promise<NormalizedSession[]>;
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
