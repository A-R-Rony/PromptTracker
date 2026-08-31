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

export async function fetchSessions(force = false): Promise<NormalizedSession[]> {
  const url = force ? '/api/sessions?force=true' : '/api/sessions';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch sessions');
  const json = await res.json();
  return json.data || [];
}

export async function fetchSummary(): Promise<TelemetrySummary> {
  const res = await fetch('/api/summary');
  if (!res.ok) throw new Error('Failed to fetch summary');
  const json = await res.json();
  return json.summary;
}

export async function openSessionInIDE(sessionId: string): Promise<string> {
  const res = await fetch('/api/open-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId })
  });
  if (!res.ok) throw new Error('Failed to open session');
  const json = await res.json();
  return json.transcriptPath;
}
