import { NormalizedSession } from '@prompttracker/core';

export interface DateFilterOptions {
  date?: string;       // exact date 'YYYY-MM-DD'
  since?: string;      // relative '7d', '30d', or 'YYYY-MM-DD'
  until?: string;      // 'YYYY-MM-DD'
  preset?: 'today' | 'yesterday' | '7d' | '30d' | 'all';
}

export function parseRelativeDate(expr: string): Date | null {
  const trimmed = expr.trim().toLowerCase();
  const now = new Date();
  
  if (trimmed === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (trimmed === 'yesterday') {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    d.setDate(d.getDate() - 1);
    return d;
  }

  const daysMatch = trimmed.match(/^(\d+)d$/);
  if (daysMatch) {
    const days = parseInt(daysMatch[1], 10);
    const d = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return d;
  }

  // Exact date YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(trimmed);
  }

  return null;
}

export function filterSessionsByDate<T extends Pick<NormalizedSession, 'date' | 'timestamp'>>(
  sessions: T[],
  options: DateFilterOptions
): { filtered: T[]; label: string } {
  let filtered = [...sessions];
  let label = '';

  if (options.preset) {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (options.preset === 'today') {
      filtered = filtered.filter(s => s.date === todayStr);
      label = 'Today (' + todayStr + ')';
    } else if (options.preset === 'yesterday') {
      const yDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const yStr = yDate.toISOString().split('T')[0];
      filtered = filtered.filter(s => s.date === yStr);
      label = 'Yesterday (' + yStr + ')';
    } else if (options.preset === '7d') {
      const sinceDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(s => new Date(s.timestamp) >= sinceDate);
      label = 'Last 7 Days';
    } else if (options.preset === '30d') {
      const sinceDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(s => new Date(s.timestamp) >= sinceDate);
      label = 'Last 30 Days';
    } else {
      label = 'All Dates';
    }
    return { filtered, label };
  }

  if (options.date) {
    filtered = filtered.filter(s => s.date === options.date);
    label = 'Date: ' + options.date;
  }

  if (options.since) {
    const sinceDate = parseRelativeDate(options.since);
    if (sinceDate) {
      filtered = filtered.filter(s => new Date(s.timestamp) >= sinceDate);
      label += (label ? ' | ' : '') + 'Since: ' + options.since;
    }
  }

  if (options.until) {
    const untilDate = new Date(options.until + 'T23:59:59.999Z');
    filtered = filtered.filter(s => new Date(s.timestamp) <= untilDate);
    label += (label ? ' | ' : '') + 'Until: ' + options.until;
  }

  return { filtered, label: label || 'All Dates' };
}
