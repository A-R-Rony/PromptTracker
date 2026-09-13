import { NormalizedSession, ScanHints, SourceSignals } from './types';
import { SessionStorageManager } from './storage';
export type ToolSourceName = NormalizedSession['toolSource'];
export interface SessionSource {
    readonly name: ToolSourceName;
    scan(options?: ScanHints): Promise<NormalizedSession[]>;
}
export interface SyncReport {
    sourcesScanned: ToolSourceName[];
    failedSources: Array<{
        name: string;
        error: string;
    }>;
    ingested: number;
    updated: number;
    skipped: number;
    removed: number;
}
export declare function fileSignals(stats: {
    mtimeMs: number;
    size: number;
}): SourceSignals;
export declare function syncSessions(storage: SessionStorageManager, sources: SessionSource[]): Promise<SyncReport>;
