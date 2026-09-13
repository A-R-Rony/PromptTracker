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
exports.CacheConfigError = exports.DEFAULT_CACHE_CONFIG = void 0;
exports.defaultCacheDatabasePath = defaultCacheDatabasePath;
exports.defaultCacheConfigPath = defaultCacheConfigPath;
exports.loadCacheConfig = loadCacheConfig;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
exports.DEFAULT_CACHE_CONFIG = {
    cacheFullContent: true,
    retention: { maxAgeDays: 30, maxBytes: 250 * 1024 * 1024 }
};
class CacheConfigError extends Error {
    constructor(message, cause) {
        super(message, { cause });
        this.name = 'CacheConfigError';
    }
}
exports.CacheConfigError = CacheConfigError;
function defaultCacheDatabasePath() {
    return process.env.PROMPT_LENS_CACHE_PATH ??
        path.join(os.homedir(), '.prompttracker', 'data.db');
}
function defaultCacheConfigPath() {
    return process.env.PROMPT_LENS_CONFIG_PATH ??
        path.join(path.dirname(defaultCacheDatabasePath()), 'config.json');
}
function positiveNumber(value, field, configPath) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        throw new CacheConfigError(`Invalid cache configuration in ${configPath}: "cache.${field}" must be a positive number`);
    }
    return value;
}
function loadCacheConfig(configPath = defaultCacheConfigPath()) {
    let raw;
    try {
        raw = fs.readFileSync(configPath, 'utf8');
    }
    catch {
        return exports.DEFAULT_CACHE_CONFIG;
    }
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch (error) {
        throw new CacheConfigError(`Cache configuration file ${configPath} is not valid JSON. Fix or remove the file to use default retention.`, error);
    }
    const root = parsed && typeof parsed === 'object' ? parsed : {};
    const cache = root.cache && typeof root.cache === 'object'
        ? root.cache
        : {};
    const config = {
        cacheFullContent: exports.DEFAULT_CACHE_CONFIG.cacheFullContent,
        retention: { ...exports.DEFAULT_CACHE_CONFIG.retention }
    };
    if ('fullContent' in cache) {
        if (typeof cache.fullContent !== 'boolean') {
            throw new CacheConfigError(`Invalid cache configuration in ${configPath}: "cache.fullContent" must be a boolean`);
        }
        config.cacheFullContent = cache.fullContent;
    }
    if ('maxAgeDays' in cache) {
        config.retention.maxAgeDays = positiveNumber(cache.maxAgeDays, 'maxAgeDays', configPath);
    }
    if ('maxBytes' in cache) {
        config.retention.maxBytes = positiveNumber(cache.maxBytes, 'maxBytes', configPath);
    }
    return config;
}
