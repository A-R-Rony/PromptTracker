import { NormalizedSession, PromptTurn } from './types';
export declare class SessionStorageManager {
    private cacheDir;
    private maxMemoryBytes;
    private currentMemoryBytes;
    private spilledSessionIds;
    constructor(maxMemoryMb?: number);
    /**
     * Estimates byte size of turns array
     */
    private estimateTurnsSize;
    /**
     * Checks if session turns should spill to disk to stay under memory threshold
     */
    manageSessionMemory(session: NormalizedSession): void;
    /**
     * Lazily loads full turns if they were spilled to disk
     */
    loadFullTurns(session: NormalizedSession): PromptTurn[];
    getMemoryUsageSummary(): {
        currentMb: string;
        maxMb: string;
        spilledCount: number;
    };
}
