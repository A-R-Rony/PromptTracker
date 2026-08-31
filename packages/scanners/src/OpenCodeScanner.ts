import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { NormalizedSession, PromptTurn, ToolScanner, approximateTokens, estimateCost } from '../../core/dist';

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

    // 2. Legacy / Mock Fallback: JSON directory at ~/.opencode/sessions
    const legacyDir = this.customBaseDir || path.join(home, '.opencode', 'sessions');
    if (fs.existsSync(legacyDir) && legacyDir !== path.dirname(realDbPath)) {
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
      // 1. Fetch all sessions in single query
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

      // 2. Fetch all message parts for recent sessions in one single bulk batch
      const sessionIds = rows.map((r: any) => `'${r.id}'`).join(',');
      const partsQuery = `
        SELECT 
          m.session_id,
          m.id AS message_id,
          m.time_created,
          m.data AS message_data,
          p.data AS part_data
        FROM message m
        JOIN part p ON p.message_id = m.id
        WHERE m.session_id IN (${sessionIds})
        ORDER BY m.time_created ASC, p.id ASC;
      `;

      let partsBySession: Record<string, any[]> = {};
      try {
        const rawParts = execSync(`sqlite3 -json "${dbPath}" "${partsQuery.replace(/\n/g, ' ')}"`, {
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
        const turns = this.processPartsIntoTurns(sessionParts, timestamp);

        const inTok = row.tokens_input || turns.reduce((acc, t) => acc + t.tokens.input, 0);
        const outTok = row.tokens_output || turns.reduce((acc, t) => acc + t.tokens.output, 0);
        const totalTokens = { input: inTok, output: outTok, total: inTok + outTok };
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

  private processPartsIntoTurns(parts: any[], fallbackTime: string): PromptTurn[] {
    const turns: PromptTurn[] = [];
    let currentTurn: PromptTurn | null = null;
    let turnIdx = 0;

    for (const item of parts) {
      let mData: any = {};
      let pData: any = {};
      try { mData = JSON.parse(item.message_data); } catch {}
      try { pData = JSON.parse(item.part_data); } catch {}

      if (mData.role === 'user' && pData.type === 'text' && pData.text) {
        turnIdx++;
        const inTok = approximateTokens(pData.text);
        currentTurn = {
          turnIndex: turnIdx,
          timestamp: new Date(item.time_created).toISOString(),
          userPrompt: pData.text,
          assistantSummary: '',
          assistantResponse: '',
          tokens: { input: inTok, output: 0, total: inTok }
        };
        turns.push(currentTurn);
      } else if (mData.role === 'assistant') {
        if (!currentTurn && turns.length > 0) {
          currentTurn = turns[turns.length - 1];
        }

        if (pData.type === 'text' && pData.text && currentTurn) {
          const outTok = approximateTokens(pData.text);
          currentTurn.assistantResponse = (currentTurn.assistantResponse ? currentTurn.assistantResponse + '\n\n' : '') + pData.text;
          currentTurn.assistantSummary = currentTurn.assistantResponse.slice(0, 300);
          currentTurn.tokens.output += outTok;
          currentTurn.tokens.total += outTok;
        } else if (pData.type === 'step-finish' && pData.tokens && currentTurn) {
          if (pData.tokens.input) currentTurn.tokens.input = pData.tokens.input;
          if (pData.tokens.output) currentTurn.tokens.output = pData.tokens.output;
          currentTurn.tokens.total = currentTurn.tokens.input + currentTurn.tokens.output;
        }
      }
    }

    if (turns.length === 0) {
      turns.push({
        turnIndex: 1,
        timestamp: fallbackTime,
        userPrompt: 'OpenCode session executed in workspace',
        tokens: { input: 100, output: 100, total: 200 }
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

      let idx = 0;
      for (const p of data.prompts) {
        idx++;
        const inTok = p.inputTokens || approximateTokens(p.text || '');
        const outTok = p.outputTokens || approximateTokens(p.completion || '');
        inTokTotal += inTok;
        outTokTotal += outTok;

        turns.push({
          turnIndex: idx,
          timestamp: p.timestamp || stats.mtime.toISOString(),
          userPrompt: p.text || '',
          assistantSummary: (p.completion || '').slice(0, 300),
          assistantResponse: p.completion,
          tokens: { input: inTok, output: outTok, total: inTok + outTok }
        });
      }

      if (turns.length > 0) {
        const dateStr = (data.createdAt || stats.mtime.toISOString()).split('T')[0];
        const totalTokens = { input: inTokTotal, output: outTokTotal, total: inTokTotal + outTokTotal };

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
