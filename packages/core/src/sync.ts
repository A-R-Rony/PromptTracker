import * as fs from 'fs';
import { NormalizedSession, ScanHints, SourceSignals } from './types';
import { SessionStorageManager } from './storage';

export type ToolSourceName = NormalizedSession['toolSource'];

export interface SessionSource {
  readonly name: ToolSourceName;
  scan(options?: ScanHints): Promise<NormalizedSession[]>;
}

export interface SyncReport {
  sourcesScanned: ToolSourceName[];
  failedSources: Array<{ name: string; error: string }>;
  ingested: number;
  updated: number;
  skipped: number;
  removed: number;
}

export function fileSignals(stats: { mtimeMs: number; size: number }): SourceSignals {
  return { mtimeMs: stats.mtimeMs, sizeBytes: stats.size };
}

function normalizedPathKey(filePath: string): string {
  return filePath.replace(/\\/g, '/').toLowerCase();
}

function signalsMatch(cached: SourceSignals | undefined, incoming: SourceSignals | undefined): boolean {
  if (!cached || !incoming) return false;
  if (cached.fingerprint || incoming.fingerprint) {
    return Boolean(cached.fingerprint) && cached.fingerprint === incoming.fingerprint;
  }
  if (cached.mtimeMs === undefined || cached.sizeBytes === undefined ||
    incoming.mtimeMs === undefined || incoming.sizeBytes === undefined) {
    return false;
  }
  return cached.mtimeMs === incoming.mtimeMs && cached.sizeBytes === incoming.sizeBytes;
}

interface CachedFileState {
  sourceSessionId: string;
  signals: SourceSignals;
}

export async function syncSessions(
  storage: SessionStorageManager,
  sources: SessionSource[]
): Promise<SyncReport> {
  const report: SyncReport = {
    sourcesScanned: [],
    failedSources: [],
    ingested: 0,
    updated: 0,
    skipped: 0,
    removed: 0
  };

  const cachedStates = storage.listSyncStates();
  const cachedByTool = new Map<ToolSourceName, Map<string, SourceSignals>>();
  const cachedFilesByTool = new Map<ToolSourceName, Map<string, CachedFileState[]>>();
  for (const state of cachedStates) {
    let bySession = cachedByTool.get(state.toolSource);
    if (!bySession) {
      bySession = new Map();
      cachedByTool.set(state.toolSource, bySession);
    }
    bySession.set(state.sourceSessionId, state.signals);

    if (state.sourcePath) {
      let byFile = cachedFilesByTool.get(state.toolSource);
      if (!byFile) {
        byFile = new Map();
        cachedFilesByTool.set(state.toolSource, byFile);
      }
      const key = normalizedPathKey(state.sourcePath);
      const existing = byFile.get(key);
      if (existing) existing.push({ sourceSessionId: state.sourceSessionId, signals: state.signals });
      else byFile.set(key, [{ sourceSessionId: state.sourceSessionId, signals: state.signals }]);
    }
  }

  for (const source of sources) {
    let discovered: NormalizedSession[];
    try {
      const cachedSessions = cachedByTool.get(source.name) ?? new Map<string, SourceSignals>();
      const cachedFiles = cachedFilesByTool.get(source.name) ?? new Map<string, CachedFileState[]>();
      const shouldSkipFile: ScanHints['shouldSkipFile'] = (filePath, fileStats) => {
        const cached = cachedFiles.get(normalizedPathKey(filePath));
        if (!cached || cached.length === 0) return false;
        if (!cached.every(entry => signalsMatch(entry.signals, fileStats))) return false;
        for (const entry of cached) {
          seenUnchanged.add(entry.sourceSessionId);
          report.skipped++;
        }
        return true;
      };
      const seenUnchanged = new Set<string>();
      discovered = await source.scan({ shouldSkipFile });
      report.sourcesScanned.push(source.name);

      const seenIds = new Set<string>(seenUnchanged);
      for (const record of discovered) {
        seenIds.add(record.id);
        if (signalsMatch(cachedSessions.get(record.id), record.sourceSignals)) {
          report.skipped++;
          continue;
        }
        const isNew = !cachedSessions.has(record.id);
        storage.upsertSession(record);
        if (isNew) report.ingested++; else report.updated++;
      }

      for (const staleId of cachedSessions.keys()) {
        if (!seenIds.has(staleId)) {
          storage.removeSession({ id: staleId, toolSource: source.name });
          report.removed++;
        }
      }
    } catch (error) {
      report.failedSources.push({
        name: source.name,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return report;
}
