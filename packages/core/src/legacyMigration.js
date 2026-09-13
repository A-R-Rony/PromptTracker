"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultLegacyCacheDir = defaultLegacyCacheDir;
exports.parseLegacyFileName = parseLegacyFileName;
exports.migrateLegacyJsonCache = migrateLegacyJsonCache;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const storage_1 = require("./storage");
function defaultLegacyCacheDir() {
    return process.env.PROMPT_LENS_LEGACY_CACHE_DIR ??
        path.join(os.homedir(), '.prompttracker', 'cache');
}
/**
 * Safely parses session ID and tool source from legacy file name.
 * Legacy files were named `<sessionId>.json` or `<toolSource>-<sessionId>.json`.
 * If toolSource cannot be inferred, defaults to provided defaultToolSource or 'antigravity'.
 */
function parseLegacyFileName(fileName, defaultToolSource = 'antigravity') {
    const baseName = fileName.replace(/\.json$/i, '');
    const knownTools = [
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
async function migrateLegacyJsonCache(storage, options = {}) {
    const legacyDir = options.legacyCacheDir ?? defaultLegacyCacheDir();
    const defaultTool = options.defaultToolSource ?? 'antigravity';
    const report = {
        discovered: 0,
        migrated: 0,
        skipped: 0,
        failed: []
    };
    if (!fs.existsSync(legacyDir)) {
        return report;
    }
    let entries;
    try {
        entries = fs.readdirSync(legacyDir);
    }
    catch (err) {
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
        let raw;
        try {
            raw = fs.readFileSync(fullPath, 'utf8');
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            report.failed.push({ file, error: `Failed to read file: ${message}` });
            continue;
        }
        let parsed;
        try {
            parsed = JSON.parse(raw);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            report.failed.push({ file, error: `Invalid JSON format: ${message}` });
            continue;
        }
        if (!(0, storage_1.isPromptTurnArray)(parsed)) {
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
            const imported = storage.importLegacySessionTurns({ id, toolSource }, parsed);
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
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            report.failed.push({ file, error: `Migration or verification failed: ${message}` });
        }
    }
    // Enforce retention policy over newly migrated content
    try {
        storage.enforceRetention();
    }
    catch { }
    return report;
}
