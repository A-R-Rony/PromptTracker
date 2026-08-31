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
exports.PricingEngine = exports.EMBEDDED_PRICING_TABLE = void 0;
exports.estimateCost = estimateCost;
exports.syncModelPricingInBackground = syncModelPricingInBackground;
exports.approximateTokens = approximateTokens;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const https = __importStar(require("https"));
exports.EMBEDDED_PRICING_TABLE = {
    'gemini-2.5-pro': { inputPerMillion: 1.25, outputPerMillion: 5.0, cacheReadPerMillion: 0.31 },
    'gemini-2-5-pro': { inputPerMillion: 1.25, outputPerMillion: 5.0, cacheReadPerMillion: 0.31 },
    'gemini-2.5-flash': { inputPerMillion: 0.15, outputPerMillion: 0.6, cacheReadPerMillion: 0.0375 },
    'gemini-2-5-flash': { inputPerMillion: 0.15, outputPerMillion: 0.6, cacheReadPerMillion: 0.0375 },
    'gemini-3.7-flash': { inputPerMillion: 0.15, outputPerMillion: 0.6, cacheReadPerMillion: 0.0375 },
    'gemini-3-7-flash': { inputPerMillion: 0.15, outputPerMillion: 0.6, cacheReadPerMillion: 0.0375 },
    'claude-3.7-sonnet': { inputPerMillion: 3.0, outputPerMillion: 15.0, cacheReadPerMillion: 0.30 },
    'claude-3-7-sonnet': { inputPerMillion: 3.0, outputPerMillion: 15.0, cacheReadPerMillion: 0.30 },
    'claude-3.5-sonnet': { inputPerMillion: 3.0, outputPerMillion: 15.0, cacheReadPerMillion: 0.30 },
    'claude-3-5-sonnet': { inputPerMillion: 3.0, outputPerMillion: 15.0, cacheReadPerMillion: 0.30 },
    'claude-3.5-haiku': { inputPerMillion: 0.8, outputPerMillion: 4.0, cacheReadPerMillion: 0.08 },
    'claude-3-5-haiku': { inputPerMillion: 0.8, outputPerMillion: 4.0, cacheReadPerMillion: 0.08 },
    'gpt-4o': { inputPerMillion: 2.5, outputPerMillion: 10.0, cacheReadPerMillion: 1.25 },
    'gpt-4o-mini': { inputPerMillion: 0.15, outputPerMillion: 0.6, cacheReadPerMillion: 0.075 },
    'o3-mini': { inputPerMillion: 1.10, outputPerMillion: 4.40, cacheReadPerMillion: 0.55 },
    'deepseek-chat': { inputPerMillion: 0.14, outputPerMillion: 0.28 },
    'deepseek-reasoner': { inputPerMillion: 0.55, outputPerMillion: 2.19 },
    'default': { inputPerMillion: 1.0, outputPerMillion: 4.0 }
};
class PricingEngine {
    static instance;
    pricingTable;
    cacheFilePath;
    syncIntervalMs = 24 * 60 * 60 * 1000; // 24 Hours
    openRouterApiUrl = 'https://openrouter.ai/api/v1/models';
    constructor() {
        const configDir = path.join(os.homedir(), '.prompttracker');
        if (!fs.existsSync(configDir)) {
            try {
                fs.mkdirSync(configDir, { recursive: true });
            }
            catch { }
        }
        this.cacheFilePath = path.join(configDir, 'pricing.json');
        this.pricingTable = { ...exports.EMBEDDED_PRICING_TABLE };
        this.loadCachedPricing();
    }
    static getInstance() {
        if (!PricingEngine.instance) {
            PricingEngine.instance = new PricingEngine();
        }
        return PricingEngine.instance;
    }
    loadCachedPricing() {
        if (fs.existsSync(this.cacheFilePath)) {
            try {
                const raw = fs.readFileSync(this.cacheFilePath, 'utf8');
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                    this.pricingTable = { ...this.pricingTable, ...parsed };
                }
            }
            catch { }
        }
    }
    /**
     * Syncs latest pricing from OpenRouter's live model registry every 24 hours
     */
    syncRemotePricingAsync() {
        try {
            if (fs.existsSync(this.cacheFilePath)) {
                const stats = fs.statSync(this.cacheFilePath);
                const ageMs = Date.now() - stats.mtimeMs;
                if (ageMs < this.syncIntervalMs) {
                    return; // Cache is still fresh (<24h)
                }
            }
            // Non-blocking background fetch to OpenRouter
            const req = https.get(this.openRouterApiUrl, { headers: { 'User-Agent': 'PromptTracker/0.1.0' } }, (res) => {
                if (res.statusCode === 200) {
                    let body = '';
                    res.on('data', chunk => { body += chunk; });
                    res.on('end', () => {
                        try {
                            const parsed = JSON.parse(body);
                            if (parsed && Array.isArray(parsed.data)) {
                                const updatedRates = {};
                                for (const m of parsed.data) {
                                    if (m.id && m.pricing) {
                                        const promptPrice = parseFloat(m.pricing.prompt || '0');
                                        const completionPrice = parseFloat(m.pricing.completion || '0');
                                        const inputPerMillion = +(promptPrice * 1_000_000).toFixed(4);
                                        const outputPerMillion = +(completionPrice * 1_000_000).toFixed(4);
                                        if (inputPerMillion > 0 || outputPerMillion > 0) {
                                            // Normalize key (e.g., 'anthropic/claude-3.7-sonnet' -> 'claude-3.7-sonnet' & 'claude-3-7-sonnet')
                                            const slug = m.id.split('/').pop() || m.id;
                                            const cleanSlug = slug.replace(/\./g, '-');
                                            updatedRates[slug.toLowerCase()] = { inputPerMillion, outputPerMillion };
                                            updatedRates[cleanSlug.toLowerCase()] = { inputPerMillion, outputPerMillion };
                                        }
                                    }
                                }
                                if (Object.keys(updatedRates).length > 0) {
                                    this.pricingTable = { ...this.pricingTable, ...updatedRates };
                                    fs.writeFileSync(this.cacheFilePath, JSON.stringify(this.pricingTable, null, 2), 'utf8');
                                }
                            }
                        }
                        catch { }
                    });
                }
            });
            req.on('error', () => {
                // Fallback silently if offline
            });
            req.setTimeout(5000, () => req.destroy());
        }
        catch { }
    }
    estimateCost(modelName, tokens) {
        const query = modelName.toLowerCase().replace(/\./g, '-');
        const sortedKeys = Object.keys(this.pricingTable).filter(k => k !== 'default').sort((a, b) => b.length - a.length);
        const matchedKey = sortedKeys.find(k => k.toLowerCase() === query) ||
            sortedKeys.find(k => query.includes(k.toLowerCase())) ||
            sortedKeys.find(k => k.toLowerCase().includes(query)) ||
            'default';
        const pricing = this.pricingTable[matchedKey] || exports.EMBEDDED_PRICING_TABLE.default;
        const inputCost = (tokens.input / 1000000) * pricing.inputPerMillion;
        const outputCost = (tokens.output / 1000000) * pricing.outputPerMillion;
        const cacheCost = tokens.cached ? (tokens.cached / 1000000) * (pricing.cacheReadPerMillion || 0) : 0;
        return +(inputCost + outputCost + cacheCost).toFixed(4);
    }
    getPricingTable() {
        return { ...this.pricingTable };
    }
}
exports.PricingEngine = PricingEngine;
function estimateCost(modelName, tokens) {
    return PricingEngine.getInstance().estimateCost(modelName, tokens);
}
function syncModelPricingInBackground() {
    PricingEngine.getInstance().syncRemotePricingAsync();
}
function approximateTokens(text) {
    if (!text)
        return 0;
    return Math.ceil(text.length / 4);
}
