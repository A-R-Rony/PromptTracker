import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PromptTurn, ToolScanner } from './types';
import { SessionStorageManager, isPromptTurnArray } from './storage';

export interface LegacyMigrationReport {
  discovered: number;
  migrated: number;
  skipped: number;
  failed: Array<{ file: string; error: string }>;
}

export interface LegacyMigrationOptions {
  legacyCacheDir?: string;
  defaultToolSource?: ToolScanner['name'];
}

export function defaultLegacyCacheDir(): string {
  return process.env.PROMPT_LENS_LEGACY_CACHE_DIR ??
    path.join(os.homedir(), '.prompttracker', 'cache');
}

/**
 * Safely parses session ID and tool source from legacy file name.
 * Legacy files were named `<sessionId>.json` or `<toolSource>-<sessionId>.json`.
 * If toolSource cannot be inferred, defaults to provided defaultToolSource or 'antigravity'.
 */
export function parseLegacyFileName(
  fileName: string,
  defaultToolSource: ToolScanner['name'] = 'antigravity'
): { id: string; toolSource: ToolScanner['name'] } {
  const baseName = fileName.replace(/\.json$/i, '');
  const knownTools: Array<ToolScanner['name']> = [
    'antigravity',
    'claude_code',
    'codex',
    'kiro',
    'opencode'
  ];

  for (const tool of knownTools) {
    if (baseName.startsWith(`${tool}-`)) {
      return {
        id: baseName.slice(tool.length + 1),
        toolSource: tool
      };
    }
  }

  return {
    id: baseName,
    toolSource: defaultToolSource
  };
}

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
export async function migrateLegacyJsonCache(
  storage: SessionStorageManager,
  options: LegacyMigrationOptions = {}
): Promise<LegacyMigrationReport> {
  const legacyDir = options.legacyCacheDir ?? defaultLegacyCacheDir();
  const defaultTool = options.defaultToolSource ?? 'antigravity';

  const report: LegacyMigrationReport = {
    discovered: 0,
    migrated: 0,
    skipped: 0,
    failed: []
  };

  if (!fs.existsSync(legacyDir)) {
    return report;
  }

  let entries: string[];
  try {
    entries = fs.readdirSync(legacyDir);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    report.failed.push({ file: legacyDir, error: `Unable to read legacy cache directory: ${message}` });
    return report;
  }

  const jsonFiles = entries.filter(name => name.endsWith('.json'));
  report.discovered = jsonFiles.length;

  for (const file of jsonFiles) {
    const fullPath = path.join(legacyDir, file);

    // Guard against escaping directory via weird symlinks or filenames
    if (path.dirname(path.resolve(fullPath)) !== path.resolve(legacyDir)) {
      report.failed.push({ file, error: 'File path escapes designated legacy cache directory' });
      continue;
    }

    let raw: string;
    try {
      raw = fs.readFileSync(fullPath, 'utf8');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      report.failed.push({ file, error: `Failed to read file: ${message}` });
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      report.failed.push({ file, error: `Invalid JSON format: ${message}` });
      continue;
    }

    if (!isPromptTurnArray(parsed)) {
      report.failed.push({ file, error: 'JSON payload does not conform to PromptTurn[] schema' });
      continue;
    }

    const { id, toolSource } = parseLegacyFileName(file, defaultTool);

    // If full-content caching is disabled, we do not store full turns in SQLite
    if (!storage.isCachingFullContent()) {
      report.skipped++;
      continue;
    }

    try {
      const imported = storage.importLegacySessionTurns({ id, toolSource }, parsed as PromptTurn[]);
      if (!imported) {
        report.skipped++;
        continue;
      }

      // Verify read back using loadFullTurns public interface
      const readBack = storage.loadFullTurns({ id, toolSource });
      if (JSON.stringify(readBack) !== JSON.stringify(parsed)) {
        throw new Error('Verification mismatch after importing turns');
      }

      // Safe to delete only after successful commit and verification
      fs.unlinkSync(fullPath);
      report.migrated++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      report.failed.push({ file, error: `Migration or verification failed: ${message}` });
    }
  }

  // Enforce retention policy over newly migrated content
  try {
    storage.enforceRetention();
  } catch {}

  return report;
}
