"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileSignals = fileSignals;
exports.syncSessions = syncSessions;
function fileSignals(stats) {
    return { mtimeMs: stats.mtimeMs, sizeBytes: stats.size };
}
function normalizedPathKey(filePath) {
    return filePath.replace(/\\/g, '/').toLowerCase();
}
function signalsMatch(cached, incoming) {
    if (!cached || !incoming)
        return false;
    if (cached.fingerprint || incoming.fingerprint) {
        return Boolean(cached.fingerprint) && cached.fingerprint === incoming.fingerprint;
    }
    if (cached.mtimeMs === undefined || cached.sizeBytes === undefined ||
        incoming.mtimeMs === undefined || incoming.sizeBytes === undefined) {
        return false;
    }
    return cached.mtimeMs === incoming.mtimeMs && cached.sizeBytes === incoming.sizeBytes;
}
async function syncSessions(storage, sources) {
    const report = {
        sourcesScanned: [],
        failedSources: [],
        ingested: 0,
        updated: 0,
        skipped: 0,
        removed: 0
    };
    const cachedStates = storage.listSyncStates();
    const cachedByTool = new Map();
    const cachedFilesByTool = new Map();
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
            if (existing)
                existing.push({ sourceSessionId: state.sourceSessionId, signals: state.signals });
            else
                byFile.set(key, [{ sourceSessionId: state.sourceSessionId, signals: state.signals }]);
        }
    }
    for (const source of sources) {
        let discovered;
        try {
            const cachedSessions = cachedByTool.get(source.name) ?? new Map();
            const cachedFiles = cachedFilesByTool.get(source.name) ?? new Map();
            const shouldSkipFile = (filePath, fileStats) => {
                const cached = cachedFiles.get(normalizedPathKey(filePath));
                if (!cached || cached.length === 0)
                    return false;
                if (!cached.every(entry => signalsMatch(entry.signals, fileStats)))
                    return false;
                for (const entry of cached) {
                    seenUnchanged.add(entry.sourceSessionId);
                    report.skipped++;
                }
                return true;
            };
            const seenUnchanged = new Set();
            discovered = await source.scan({ shouldSkipFile });
            report.sourcesScanned.push(source.name);
            const seenIds = new Set(seenUnchanged);
            for (const record of discovered) {
                seenIds.add(record.id);
                if (signalsMatch(cachedSessions.get(record.id), record.sourceSignals)) {
                    report.skipped++;
                    continue;
                }
                const isNew = !cachedSessions.has(record.id);
                storage.upsertSession(record);
                if (isNew)
                    report.ingested++;
                else
                    report.updated++;
            }
            for (const staleId of cachedSessions.keys()) {
                if (!seenIds.has(staleId)) {
                    storage.removeSession({ id: staleId, toolSource: source.name });
                    report.removed++;
                }
            }
        }
        catch (error) {
            report.failedSources.push({
                name: source.name,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    return report;
}
