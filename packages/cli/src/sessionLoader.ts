import { PromptTurn, SessionMetadata, SessionStorageManager } from '@prompttracker/core';
import { ScannerRegistry } from '@prompttracker/scanners';

export async function loadTurnsForSession(
  cache: SessionStorageManager,
  session: SessionMetadata
): Promise<PromptTurn[]> {
  try {
    return cache.loadFullTurns(session);
  } catch {
    // Cached content is missing; rehydrate it from the authoritative source.
  }
  const registry = new ScannerRegistry();
  const source = registry.listScanners().find(candidate => candidate.name === session.toolSource);
  if (!source) {
    throw new Error(`No authoritative source is available for tool "${session.toolSource}"`);
  }
  const record = (await source.scan()).find(candidate => candidate.id === session.id);
  if (!record) {
    throw new Error(`Session "${session.id}" no longer exists in its authoritative ${session.toolSource} source`);
  }
  cache.upsertSession(record);
  return cache.loadFullTurns(session);
}
