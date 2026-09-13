import { NormalizedSession, PromptTurn, SessionMetadata, SourceSignals } from './types';
import { CacheRetentionConfig } from './config';
export interface SessionStorageOptions {
    databasePath?: string;
    retention?: Partial<CacheRetentionConfig>;
    cacheFullContent?: boolean;
    now?: () => Date;
}
export interface CacheStatus {
    cacheFullContent: boolean;
    maxAgeDays: number;
    maxBytes: number;
    totalContentBytes: number;
    contentBearingSessions: number;
    totalSessions: number;
}
export interface CacheMaintenanceReport {
    evictedCount: number;
    bytesFreed: number;
}
export type IngestionState = 'complete' | 'content-evicted' | 'metadata-only';
export interface SessionSyncState {
    toolSource: NormalizedSession['toolSource'];
    sourceSessionId: string;
    sourcePath: string | undefined;
    signals: SourceSignals;
}
export declare class SessionStorageError extends Error {
    constructor(message: string, cause?: unknown);
}
export declare class SessionStorageManager {
    private readonly database;
    private readonly cacheFullContent;
    private readonly retention;
    private readonly now;
    readonly databasePath: string;
    constructor(options?: SessionStorageOptions);
    private migrate;
    private cacheKey;
    upsertSession(session: NormalizedSession): void;
    listSessions(): SessionMetadata[];
    listSyncStates(): SessionSyncState[];
    removeSession(session: Pick<NormalizedSession, 'id' | 'toolSource'>): void;
    evictCachedContent(session: Pick<NormalizedSession, 'id' | 'toolSource'>): void;
    private toSession;
    loadFullTurns(session: Pick<NormalizedSession, 'id' | 'toolSource'>): PromptTurn[];
    isCachingFullContent(): boolean;
    enforceRetention(): CacheMaintenanceReport;
    clearCachedContent(): CacheMaintenanceReport;
    getCacheStatus(): CacheStatus;
    private totalContentBytes;
    private evictExpiredContent;
    private evictOversizeContent;
    private evictInsideTransaction;
    importLegacySessionTurns(session: Pick<NormalizedSession, 'id' | 'toolSource'>, turns: PromptTurn[]): boolean;
    close(): void;
}
export declare function withTurns(metadata: SessionMetadata, turns: PromptTurn[]): NormalizedSession;
export declare function isPromptTurnArray(value: unknown): value is PromptTurn[];
