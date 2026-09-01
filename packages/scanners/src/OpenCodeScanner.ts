import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { NormalizedSession, PromptTurn, ToolScanner, TokenSource, approximateTokens, estimateCost } from '../../core/dist';

export class OpenCodeScanner implements ToolScanner {
  readonly name = 'opencode';
  private customBaseDir?: string;

  constructor(customBaseDir?: string) {
    this.customBaseDir = customBaseDir;
  }

  async scan(): Promise<NormalizedSession[]> {
    const sessions: NormalizedSession[] = [];
    const home = os.homedir();

    // 1. Primary: Real OpenCode SQLite Database at ~/.local/share/opencode/opencode.db
    const realDbPath = this.customBaseDir
      ? path.join(this.customBaseDir, 'opencode.db')
      : path.join(home, '.local', 'share', 'opencode', 'opencode.db');

    if (fs.existsSync(realDbPath)) {
      this.scanFromSQLite(realDbPath, sessions);
    }

    // 2. Legacy / Mock Fallback: JSON directory at customBaseDir or ~/.opencode/sessions
    const legacyDir = this.customBaseDir || path.join(home, '.opencode', 'sessions');
    if (fs.existsSync(legacyDir) && (!fs.existsSync(realDbPath) || legacyDir !== path.dirname(realDbPath))) {
      try {
        const files = fs.readdirSync(legacyDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            this.parseLegacyJson(path.join(legacyDir, file), sessions);
          }
        }
      } catch {}
    }

    return sessions;
  }

  private scanFromSQLite(dbPath: string, sessions: NormalizedSession[]) {
    try {
      // 1. Fetch all session headers in single fast query
      const sessionQuery = `
        SELECT 
          s.id, 
          s.title, 
          s.directory, 
          s.model, 
          s.cost, 
          s.tokens_input, 
          s.tokens_output, 
          s.tokens_reasoning,
          s.time_created
        FROM session s
        ORDER BY s.time_created DESC
        LIMIT 100;
      `;

      const rawSessions = execSync(`sqlite3 -json "${dbPath}" "${sessionQuery.replace(/\n/g, ' ')}"`, {
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024
      });

      if (!rawSessions || !rawSessions.trim()) return;
      const rows = JSON.parse(rawSessions);

      // 2. Fetch message roles in a lightweight query without heavy data payload
      let msgRoleMap: Record<string, { role: string; time: number }> = {};
      try {
        const rawMsgs = execSync(`sqlite3 -json "${dbPath}" "SELECT id, session_id, time_created, json_extract(data, '$.role') as role FROM message;"`, {
          encoding: 'utf8',
          maxBuffer: 50 * 1024 * 1024
        });
        if (rawMsgs && rawMsgs.trim()) {
          const msgs = JSON.parse(rawMsgs);
          for (const m of msgs) {
            msgRoleMap[m.id] = { role: m.role || 'assistant', time: m.time_created };
          }
        }
      } catch {}

      // 3. Fetch only text and step-finish parts (drastically smaller payload than full table scan)
      let partsBySession: Record<string, any[]> = {};
      try {
        const rawParts = execSync(`sqlite3 -json "${dbPath}" "SELECT message_id, session_id, time_created, json_extract(data, '$.type') as type, json_extract(data, '$.text') as text, json_extract(data, '$.tokens') as tokens FROM part WHERE json_extract(data, '$.type') IN ('text', 'step-finish') ORDER BY time_created ASC;"`, {
          encoding: 'utf8',
          maxBuffer: 50 * 1024 * 1024
        });
        if (rawParts && rawParts.trim()) {
          const allParts = JSON.parse(rawParts);
          for (const p of allParts) {
            if (!partsBySession[p.session_id]) partsBySession[p.session_id] = [];
            partsBySession[p.session_id].push(p);
          }
        }
      } catch {}

      for (const row of rows) {
        let modelName = 'glm-5.3';
        if (row.model) {
          try {
            const m = JSON.parse(row.model);
            modelName = m.id || m.modelID || row.model;
          } catch {
            modelName = row.model;
          }
        }

        const cleanModel = modelName.replace(/^(opencode-go|openai|google|anthropic)\//i, '').toLowerCase().replace(/\s+/g, '-');
        const timestamp = new Date(row.time_created).toISOString();
        const dateStr = timestamp.split('T')[0];

        // Process turns for this session from pre-fetched map
        const sessionParts = partsBySession[row.id] || [];
        const turns = this.processPartsIntoTurns(sessionParts, msgRoleMap, timestamp);

        const hasExactTelemetry = typeof row.tokens_input === 'number' && typeof row.tokens_output === 'number' && (row.tokens_input > 0 || row.tokens_output > 0);
        const inTok = hasExactTelemetry ? row.tokens_input : turns.reduce((acc, t) => acc + t.tokens.input, 0);
        const outTok = hasExactTelemetry ? row.tokens_output : turns.reduce((acc, t) => acc + t.tokens.output, 0);
        const reasoningTok = typeof row.tokens_reasoning === 'number' ? row.tokens_reasoning : turns.reduce((acc, t) => acc + (t.tokens.reasoning || 0), 0);
        const cachedTok = turns.reduce((acc, t) => acc + (t.tokens.cached || 0), 0);

        const isEstimated = !hasExactTelemetry && turns.some(t => t.tokens.isEstimated);
        const source: TokenSource = hasExactTelemetry ? 'provider_telemetry' : (isEstimated ? 'estimated_heuristic' : 'provider_telemetry');

        const totalTokens = {
          input: inTok,
          output: outTok,
          reasoning: reasoningTok > 0 ? reasoningTok : undefined,
          cached: cachedTok > 0 ? cachedTok : undefined,
          total: inTok + outTok + (reasoningTok > 0 ? reasoningTok : 0),
          isEstimated,
          source
        };
        const cost = typeof row.cost === 'number' && row.cost > 0 ? +row.cost.toFixed(4) : estimateCost(cleanModel, totalTokens);

        sessions.push({
          id: 'opencode-' + row.id,
          toolSource: 'opencode',
          projectName: row.title || (row.directory ? path.basename(row.directory) : 'OpenCode Session'),
          projectPath: row.directory ? row.directory.replace(/\\/g, '/') : '',
          timestamp,
          date: dateStr,
          model: cleanModel,
          turns,
          totalTokens,
          estimatedCostUsd: cost,
          rawFilePath: dbPath
        });
      }
    } catch (e) {
      // Fallback silently if sqlite3 is not present
    }
  }

  private processPartsIntoTurns(parts: any[], msgRoleMap: Record<string, { role: string; time: number }>, fallbackTime: string): PromptTurn[] {
    const turns: PromptTurn[] = [];
    let currentTurn: PromptTurn | null = null;
    let turnIdx = 0;

    for (const item of parts) {
      const msgInfo = msgRoleMap[item.message_id] || { role: 'assistant', time: item.time_created };
      const isUser = msgInfo.role === 'user';

      if (isUser && item.type === 'text' && item.text) {
        turnIdx++;
        const inTok = approximateTokens(item.text);
        currentTurn = {
          turnIndex: turnIdx,
          timestamp: new Date(item.time_created || msgInfo.time).toISOString(),
          userPrompt: item.text,
          assistantSummary: '',
          assistantResponse: '',
          tokens: { input: inTok, output: 0, total: inTok, isEstimated: true, source: 'estimated_heuristic' }
        };
        turns.push(currentTurn);
      } else if (!isUser) {
        if (!currentTurn && turns.length > 0) {
          currentTurn = turns[turns.length - 1];
        }

        if (item.type === 'text' && item.text && currentTurn) {
          const outTok = approximateTokens(item.text);
          currentTurn.assistantResponse = (currentTurn.assistantResponse ? currentTurn.assistantResponse + '\n\n' : '') + item.text;
          currentTurn.assistantSummary = currentTurn.assistantResponse.slice(0, 300);
          if (currentTurn.tokens.isEstimated !== false) {
            currentTurn.tokens.output += outTok;
            currentTurn.tokens.total += outTok;
          }
        } else if (item.type === 'step-finish' && item.tokens && currentTurn) {
          let tokenObj: any = {};
          try { tokenObj = typeof item.tokens === 'string' ? JSON.parse(item.tokens) : item.tokens; } catch {}
          if (typeof tokenObj.input === 'number' || typeof tokenObj.output === 'number') {
            const inCount = tokenObj.input || 0;
            const outCount = tokenObj.output || 0;
            const reasoningCount = tokenObj.reasoning || 0;
            const cacheRead = (tokenObj.cache && tokenObj.cache.read) || tokenObj.cache_read || 0;
            
            currentTurn.tokens.input = inCount;
            currentTurn.tokens.output = outCount;
            if (reasoningCount > 0) currentTurn.tokens.reasoning = reasoningCount;
            if (cacheRead > 0) currentTurn.tokens.cached = cacheRead;
            currentTurn.tokens.total = inCount + outCount + reasoningCount;
            currentTurn.tokens.isEstimated = false;
            currentTurn.tokens.source = 'provider_telemetry';
          }
        }
      }
    }

    if (turns.length === 0) {
      turns.push({
        turnIndex: 1,
        timestamp: fallbackTime,
        userPrompt: 'OpenCode session executed in workspace',
        tokens: { input: 100, output: 100, total: 200, isEstimated: true, source: 'estimated_heuristic' }
      });
    }

    return turns;
  }

  private parseLegacyJson(filePath: string, sessions: NormalizedSession[]) {
    try {
      const stats = fs.statSync(filePath);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (!data || !Array.isArray(data.prompts)) return;

      const turns: PromptTurn[] = [];
      let inTokTotal = 0;
      let outTokTotal = 0;
      let model = data.model || 'glm-5.3';
      let anyEstimated = false;

      let idx = 0;
      for (const p of data.prompts) {
        idx++;
        const hasNative = typeof p.inputTokens === 'number' && typeof p.outputTokens === 'number';
        const inTok = hasNative ? p.inputTokens : approximateTokens(p.text || '');
        const outTok = hasNative ? p.outputTokens : approximateTokens(p.completion || '');
        if (!hasNative) anyEstimated = true;

        inTokTotal += inTok;
        outTokTotal += outTok;

        turns.push({
          turnIndex: idx,
          timestamp: p.timestamp || stats.mtime.toISOString(),
          userPrompt: p.text || '',
          assistantSummary: (p.completion || '').slice(0, 300),
          assistantResponse: p.completion,
          tokens: {
            input: inTok,
            output: outTok,
            total: inTok + outTok,
            isEstimated: !hasNative,
            source: hasNative ? 'provider_telemetry' : 'estimated_heuristic'
          }
        });
      }

      if (turns.length > 0) {
        const dateStr = (data.createdAt || stats.mtime.toISOString()).split('T')[0];
        const totalTokens = {
          input: inTokTotal,
          output: outTokTotal,
          total: inTokTotal + outTokTotal,
          isEstimated: anyEstimated,
          source: (anyEstimated ? 'estimated_heuristic' : 'provider_telemetry') as TokenSource
        };

        sessions.push({
          id: 'opencode-' + path.basename(filePath, '.json'),
          toolSource: 'opencode',
          projectName: data.project || path.basename(filePath, '.json'),
          timestamp: data.createdAt || stats.mtime.toISOString(),
          date: dateStr,
          model,
          turns,
          totalTokens,
          estimatedCostUsd: estimateCost(model, totalTokens),
          rawFilePath: filePath
        });
      }
    } catch {}
  }
}
