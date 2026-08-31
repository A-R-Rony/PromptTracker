import { DailySummary, MetricAggregate, NormalizedSession, TelemetrySummary } from '../../core/dist';

export type { TelemetrySummary };

function addToAggregate(map: Record<string, MetricAggregate>, key: string, session: NormalizedSession): void {
  if (!map[key]) {
    map[key] = { prompts: 0, tokens: 0, cost: 0 };
  }
  map[key].prompts += session.turns.length;
  map[key].tokens += session.totalTokens.total;
  map[key].cost += session.estimatedCostUsd;
}

function roundAggregates(map: Record<string, MetricAggregate>): Record<string, MetricAggregate> {
  const rounded: Record<string, MetricAggregate> = {};
  for (const [key, agg] of Object.entries(map)) {
    rounded[key] = { prompts: agg.prompts, tokens: agg.tokens, cost: +agg.cost.toFixed(4) };
  }
  return rounded;
}

function roundDaily(day: DailySummary): DailySummary {
  return {
    ...day,
    totalCostUsd: +day.totalCostUsd.toFixed(4),
    byTool: roundAggregates(day.byTool),
    byModel: roundAggregates(day.byModel),
    byProject: roundAggregates(day.byProject)
  };
}

export function computeSummary(sessions: NormalizedSession[]): TelemetrySummary {
  const byTool: Record<string, MetricAggregate> = {};
  const byModel: Record<string, MetricAggregate> = {};
  const dailyMap: Record<string, DailySummary> = {};

  let totalTokens = 0;
  let totalPrompts = 0;
  let totalCostUsd = 0;

  for (const s of sessions) {
    totalTokens += s.totalTokens.total;
    totalPrompts += s.turns.length;
    totalCostUsd += s.estimatedCostUsd;

    addToAggregate(byTool, s.toolSource, s);
    addToAggregate(byModel, s.model, s);

    if (!dailyMap[s.date]) {
      dailyMap[s.date] = {
        date: s.date,
        totalPrompts: 0,
        totalTokens: 0,
        totalCostUsd: 0,
        sessionsCount: 0,
        byTool: {},
        byModel: {},
        byProject: {}
      };
    }
    const day = dailyMap[s.date];
    day.sessionsCount++;
    day.totalPrompts += s.turns.length;
    day.totalTokens += s.totalTokens.total;
    day.totalCostUsd += s.estimatedCostUsd;
    addToAggregate(day.byTool, s.toolSource, s);
    addToAggregate(day.byModel, s.model, s);
    addToAggregate(day.byProject, s.projectName, s);
  }

  return {
    totalTokens,
    totalPrompts,
    totalCostUsd: +totalCostUsd.toFixed(4),
    totalSessions: sessions.length,
    byTool: roundAggregates(byTool),
    byModel: roundAggregates(byModel),
    daily: Object.values(dailyMap)
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(roundDaily)
  };
}
