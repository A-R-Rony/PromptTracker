import { ToolScanner } from './types';
import { SessionStorageManager } from './storage';
export interface LegacyMigrationReport {
    discovered: number;
    migrated: number;
    skipped: number;
    failed: Array<{
        file: string;
        error: string;
    }>;
}
export interface LegacyMigrationOptions {
    legacyCacheDir?: string;
    defaultToolSource?: ToolScanner['name'];
}
export declare function defaultLegacyCacheDir(): string;
/**
 * Safely parses session ID and tool source from legacy file name.
 * Legacy files were named `<sessionId>.json` or `<toolSource>-<sessionId>.json`.
 * If toolSource cannot be inferred, defaults to provided defaultToolSource or 'antigravity'.
 */
export declare function parseLegacyFileName(fileName: string, defaultToolSource?: ToolScanner['name']): {
    id: string;
    toolSource: ToolScanner['name'];
};
/**
 * Migrates legacy JSON spill files from ~/.prompttracker/cache/ into SQLite Session cache.
 *
 * Safety & Verification Guarantees:
 * 1. Discovers files ONLY inside the specified legacyCacheDir.
 * 2. Parses and validates every file against the PromptTurn[] schema.
 * 3. Writes content into SQLite inside a database transaction.
 * 4. Reads back the stored content from SQLite and verifies equivalence against the in-memory turns.
 * 5. ONLY unlinks the specific legacy JSON file if transaction commits and verification succeeds.
 * 6. Malformed/unreadable/invalid files remain untouched and are recorded in the report.
 * 7. When full-content caching is disabled, records are skipped/not cached into content storage.
 * 8. Migrated content participates in retention policy.
 */
export declare function migrateLegacyJsonCache(storage: SessionStorageManager, options?: LegacyMigrationOptions): Promise<LegacyMigrationReport>;
