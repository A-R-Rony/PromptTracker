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
exports.SessionStorageManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
class SessionStorageManager {
    cacheDir;
    maxMemoryBytes;
    currentMemoryBytes = 0;
    spilledSessionIds = new Set();
    constructor(maxMemoryMb = 50) {
        this.maxMemoryBytes = maxMemoryMb * 1024 * 1024;
        this.cacheDir = path.join(os.homedir(), '.prompttracker', 'cache');
        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, { recursive: true });
        }
    }
    /**
     * Estimates byte size of turns array
     */
    estimateTurnsSize(turns) {
        let size = 0;
        for (const t of turns) {
            size += (t.userPrompt?.length || 0) * 2;
            size += (t.assistantResponse?.length || 0) * 2;
            size += (t.assistantSummary?.length || 0) * 2;
            if (t.toolCalls) {
                size += JSON.stringify(t.toolCalls).length * 2;
            }
            size += 200; // object overhead
        }
        return size;
    }
    /**
     * Checks if session turns should spill to disk to stay under memory threshold
     */
    manageSessionMemory(session) {
        const turnsSize = this.estimateTurnsSize(session.turns);
        if (this.currentMemoryBytes + turnsSize > this.maxMemoryBytes) {
            // Spill full turn content to disk cache
            const cachePath = path.join(this.cacheDir, `${session.id}.json`);
            fs.writeFileSync(cachePath, JSON.stringify(session.turns), 'utf8');
            this.spilledSessionIds.add(session.id);
            // In RAM: keep lightweight summary turns (only userPrompt slice & assistantSummary)
            session.turns = session.turns.map(t => ({
                turnIndex: t.turnIndex,
                timestamp: t.timestamp,
                userPrompt: t.userPrompt.slice(0, 300),
                assistantSummary: t.assistantSummary || t.assistantResponse?.slice(0, 300),
                tokens: t.tokens
            }));
        }
        else {
            this.currentMemoryBytes += turnsSize;
        }
    }
    /**
     * Lazily loads full turns if they were spilled to disk
     */
    loadFullTurns(session) {
        if (this.spilledSessionIds.has(session.id)) {
            const cachePath = path.join(this.cacheDir, `${session.id}.json`);
            if (fs.existsSync(cachePath)) {
                try {
                    return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
                }
                catch { }
            }
        }
        return session.turns;
    }
    getMemoryUsageSummary() {
        return {
            currentMb: (this.currentMemoryBytes / (1024 * 1024)).toFixed(2),
            maxMb: (this.maxMemoryBytes / (1024 * 1024)).toFixed(0),
            spilledCount: this.spilledSessionIds.size
        };
    }
}
exports.SessionStorageManager = SessionStorageManager;
