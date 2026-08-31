import type { NormalizedSession } from '../../core/dist/types';

export type DatePreset = 'today' | 'yesterday' | '7d' | '30d' | 'all';

export function searchSessions(sessions: NormalizedSession[], query: string): NormalizedSession[] {
  const q = query.trim().toLowerCase();
  if (!q) return sessions;
  return sessions.filter(s =>
    s.projectName.toLowerCase().includes(q) ||
    s.toolSource.toLowerCase().includes(q) ||
    s.model.toLowerCase().includes(q) ||
    s.turns.some(t => t.userPrompt.toLowerCase().includes(q))
  );
}

export function filterSessionsByDatePreset(
  sessions: NormalizedSession[],
  preset: DatePreset,
  now: () => number = Date.now
): NormalizedSession[] {
  if (preset === 'all') {
    return sessions;
  }
  if (preset === 'today' || preset === 'yesterday') {
    const nowDate = new Date(now());
    if (preset === 'yesterday') {
      nowDate.setDate(nowDate.getDate() - 1);
    }
    const targetDate = nowDate.toISOString().split('T')[0];
    return sessions.filter(s => s.date === targetDate);
  }

  const days = preset === '7d' ? 7 : 30;
  const sinceMs = now() - days * 24 * 60 * 60 * 1000;
  return sessions.filter(s => new Date(s.timestamp).getTime() >= sinceMs);
}
