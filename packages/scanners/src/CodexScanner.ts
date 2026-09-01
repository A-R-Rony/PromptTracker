import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { NormalizedSession, PromptTurn, ToolScanner, approximateTokens, estimateCost } from '../../core/dist';

function extractText(content: any): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map(c => {
        if (typeof c === 'string') return c;
        if (c && typeof c.text === 'string') return c.text;
        if (c && typeof c.content === 'string') return c.content;
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }
  return JSON.stringify(content);
}

export class CodexScanner implements ToolScanner {
  readonly name = 'codex';
  private customBaseDir?: string;

  constructor(customBaseDir?: string) {
    this.customBaseDir = customBaseDir;
  }

  async scan(): Promise<NormalizedSession[]> {
    const sessions: NormalizedSession[] = [];
    const codexDir = this.customBaseDir || path.join(os.homedir(), '.codex');
    const chatgptHistory = path.join(os.homedir(), '.chatgpt', 'history.json');

    // 1. Scan .codex directory recursively (handles sessions/YYYY/MM/DD/*.jsonl and flat *.json)
    if (fs.existsSync(codexDir)) {
      const scanDir = (dir: string) => {
        try {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
              if (!file.startsWith('.') || file === '.codex') {
                scanDir(fullPath);
              }
            } else if (file.endsWith('.jsonl')) {
              this.parseCodexJsonlSession(fullPath, sessions);
            } else if (file.endsWith('.json') && !file.startsWith('.') && file !== 'config.json') {
              this.parseCodexJsonSession(fullPath, sessions);
            }
          }
        } catch {}
      };

      const sessRoot = path.join(codexDir, 'sessions');
      if (fs.existsSync(sessRoot)) {
        scanDir(sessRoot);
      } else {
        scanDir(codexDir);
      }
    }

    // 2. Scan ChatGPT CLI history if present
    if (fs.existsSync(chatgptHistory)) {
      this.parseChatGPTFile(chatgptHistory, sessions);
    }

    return sessions;
  }

  private parseCodexJsonlSession(filePath: string, sessions: NormalizedSession[]) {
    try {
      const stats = fs.statSync(filePath);
      const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(l => l.trim().length > 0);
      const turns: PromptTurn[] = [];
      let inTokTotal = 0;
      let outTokTotal = 0;
      let model = 'gpt-4o';
      let detectedCwd = '';
      let sessionTitle = '';
      let sessionTimestamp = stats.mtime.toISOString();

      let idx = 0;
      for (const line of lines) {
        try {
          const item = JSON.parse(line);

          if (item.type === 'session_meta' && item.payload) {
            if (item.payload.cwd) detectedCwd = item.payload.cwd;
            if (item.payload.timestamp) sessionTimestamp = item.payload.timestamp;
          }

          if (item.type === 'turn_context' && item.model) {
            model = item.model.replace(/^(openai|google|anthropic)\//i, '').toLowerCase().replace(/\s+/g, '-');
          }

          if (item.type === 'response_item' && item.payload) {
            const p = item.payload;
            if (p.type === 'message') {
              const text = extractText(p.content);
              if (p.role === 'user') {
                idx++;
                const hasExact = typeof p.usage?.input_tokens === 'number';
                const inTok = hasExact ? p.usage.input_tokens : approximateTokens(text);
                inTokTotal += inTok;
                if (!sessionTitle) sessionTitle = text.slice(0, 30);

                turns.push({
                  turnIndex: idx,
                  timestamp: item.timestamp || sessionTimestamp,
                  userPrompt: text,
                  assistantSummary: '',
                  assistantResponse: '',
                  tokens: {
                    input: inTok,
                    output: 0,
                    total: inTok,
                    isEstimated: !hasExact,
                    source: hasExact ? 'provider_telemetry' : 'estimated_heuristic'
                  }
                });
              } else if (p.role === 'assistant') {
                const hasExact = typeof p.usage?.output_tokens === 'number';
                const outTok = hasExact ? p.usage.output_tokens : approximateTokens(text);
                outTokTotal += outTok;
                if (turns.length > 0) {
                  const last = turns[turns.length - 1];
                  last.assistantSummary = text.slice(0, 300);
                  last.assistantResponse = (last.assistantResponse ? last.assistantResponse + '\n\n' : '') + text;
                  last.tokens.output += outTok;
                  last.tokens.total += outTok;
                  if (hasExact) {
                    last.tokens.isEstimated = false;
                    last.tokens.source = 'provider_telemetry';
                  }
                }
              }
            }
          }
        } catch {}
      }

      if (turns.length > 0) {
        const dateStr = sessionTimestamp.split('T')[0];
        const isEstimated = turns.some(t => t.tokens.isEstimated);
        const totalTokens = {
          input: inTokTotal,
          output: outTokTotal,
          total: inTokTotal + outTokTotal,
          isEstimated,
          source: isEstimated ? ('estimated_heuristic' as const) : ('provider_telemetry' as const)
        };
        const projectName = detectedCwd ? path.basename(detectedCwd) : (sessionTitle || path.basename(filePath, '.jsonl'));

        sessions.push({
          id: 'codex-' + path.basename(filePath, '.jsonl'),
          toolSource: 'codex',
          projectName,
          projectPath: detectedCwd ? detectedCwd.replace(/\\/g, '/') : '',
          timestamp: sessionTimestamp,
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

  private parseCodexJsonSession(filePath: string, sessions: NormalizedSession[]) {
    try {
      const stats = fs.statSync(filePath);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (!data || !Array.isArray(data.messages)) return;

      const turns: PromptTurn[] = [];
      let inTokTotal = 0;
      let outTokTotal = 0;
      let rawModel = data.model || 'gpt-4o';
      let model = rawModel.replace(/^(openai|google|anthropic)\//i, '').toLowerCase().replace(/\s+/g, '-');

      let idx = 0;
      for (const msg of data.messages) {
        if (msg.role === 'user') {
          idx++;
          const text = extractText(msg.content);
          const hasExact = typeof msg.tokens?.input === 'number' || typeof msg.input_tokens === 'number';
          const inTok = hasExact ? (msg.tokens?.input || msg.input_tokens) : approximateTokens(text);
          inTokTotal += inTok;
          turns.push({
            turnIndex: idx,
            timestamp: msg.timestamp || stats.mtime.toISOString(),
            userPrompt: text,
            assistantSummary: '',
            tokens: {
              input: inTok,
              output: 0,
              total: inTok,
              isEstimated: !hasExact,
              source: hasExact ? 'provider_telemetry' : 'estimated_heuristic'
            }
          });
        } else if (msg.role === 'assistant') {
          const text = extractText(msg.content);
          const hasExact = typeof msg.tokens?.output === 'number' || typeof msg.output_tokens === 'number';
          const outTok = hasExact ? (msg.tokens?.output || msg.output_tokens) : approximateTokens(text);
          outTokTotal += outTok;
          if (turns.length > 0) {
            const last = turns[turns.length - 1];
            last.assistantSummary = text.slice(0, 300);
            last.assistantResponse = text;
            last.tokens.output += outTok;
            last.tokens.total += outTok;
            if (hasExact) {
              last.tokens.isEstimated = false;
              last.tokens.source = 'provider_telemetry';
            }
          }
        }
      }

      if (turns.length > 0) {
        const dateStr = stats.mtime.toISOString().split('T')[0];
        const isEstimated = turns.some(t => t.tokens.isEstimated);
        const totalTokens = {
          input: inTokTotal,
          output: outTokTotal,
          total: inTokTotal + outTokTotal,
          isEstimated,
          source: isEstimated ? ('estimated_heuristic' as const) : ('provider_telemetry' as const)
        };

        sessions.push({
          id: 'codex-' + path.basename(filePath, '.json'),
          toolSource: 'codex',
          projectName: data.project || path.basename(filePath, '.json'),
          timestamp: stats.mtime.toISOString(),
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

  private parseChatGPTFile(filePath: string, sessions: NormalizedSession[]) {
    try {
      const stats = fs.statSync(filePath);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (!Array.isArray(data)) return;

      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        if (!item.prompt) continue;

        const hasExactIn = typeof item.tokens?.input === 'number';
        const hasExactOut = typeof item.tokens?.output === 'number';
        const inTok = hasExactIn ? item.tokens.input : approximateTokens(item.prompt);
        const outTok = hasExactOut ? item.tokens.output : approximateTokens(item.response || '');
        const isEstimated = !hasExactIn || !hasExactOut;
        const model = (item.model || 'gpt-4o').replace(/^(openai|google|anthropic)\//i, '').toLowerCase().replace(/\s+/g, '-');
        const dateStr = (item.date || stats.mtime.toISOString()).split('T')[0];

        sessions.push({
          id: 'chatgpt-cli-' + i,
          toolSource: 'codex',
          projectName: item.prompt.slice(0, 30),
          timestamp: item.date || stats.mtime.toISOString(),
          date: dateStr,
          model,
          turns: [
            {
              turnIndex: 1,
              timestamp: item.date || stats.mtime.toISOString(),
              userPrompt: item.prompt,
              assistantSummary: (item.response || '').slice(0, 300),
              assistantResponse: item.response,
              tokens: {
                input: inTok,
                output: outTok,
                total: inTok + outTok,
                isEstimated,
                source: isEstimated ? 'estimated_heuristic' : 'provider_telemetry'
              }
            }
          ],
          totalTokens: {
            input: inTok,
            output: outTok,
            total: inTok + outTok,
            isEstimated,
            source: isEstimated ? 'estimated_heuristic' : 'provider_telemetry'
          },
          estimatedCostUsd: estimateCost(model, { input: inTok, output: outTok, total: inTok + outTok }),
          rawFilePath: filePath
        });
      }
    } catch {}
  }
}
