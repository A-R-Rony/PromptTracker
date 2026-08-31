import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { NormalizedSession, PromptTurn, ToolScanner, approximateTokens, estimateCost } from '../../core/dist';

export class CodexScanner implements ToolScanner {
  readonly name = 'codex';
  private customBaseDir?: string;

  constructor(customBaseDir?: string) {
    this.customBaseDir = customBaseDir;
  }

  async scan(): Promise<NormalizedSession[]> {
    const sessions: NormalizedSession[] = [];
    const codexDir = this.customBaseDir || path.join(os.homedir(), '.codex', 'sessions');
    const chatgptHistory = path.join(os.homedir(), '.chatgpt', 'history.json');

    if (fs.existsSync(codexDir)) {
      try {
        const files = fs.readdirSync(codexDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            this.parseCodexSession(path.join(codexDir, file), sessions);
          }
        }
      } catch {}
    }

    if (fs.existsSync(chatgptHistory)) {
      this.parseChatGPTFile(chatgptHistory, sessions);
    }

    return sessions;
  }

  private parseCodexSession(filePath: string, sessions: NormalizedSession[]) {
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
          const text = msg.content || '';
          const inTok = approximateTokens(text);
          inTokTotal += inTok;
          turns.push({
            turnIndex: idx,
            timestamp: msg.timestamp || stats.mtime.toISOString(),
            userPrompt: text,
            assistantSummary: '',
            tokens: { input: inTok, output: 0, total: inTok }
          });
        } else if (msg.role === 'assistant') {
          const text = msg.content || '';
          const outTok = approximateTokens(text);
          outTokTotal += outTok;
          if (turns.length > 0) {
            const last = turns[turns.length - 1];
            last.assistantSummary = text.slice(0, 300);
            last.assistantResponse = text;
            last.tokens.output += outTok;
            last.tokens.total += outTok;
          }
        }
      }

      if (turns.length > 0) {
        const dateStr = stats.mtime.toISOString().split('T')[0];
        const totalTokens = { input: inTokTotal, output: outTokTotal, total: inTokTotal + outTokTotal };

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

        const inTok = approximateTokens(item.prompt);
        const outTok = approximateTokens(item.response || '');
        const model = item.model || 'gpt-4o';
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
              tokens: { input: inTok, output: outTok, total: inTok + outTok }
            }
          ],
          totalTokens: { input: inTok, output: outTok, total: inTok + outTok },
          estimatedCostUsd: estimateCost(model, { input: inTok, output: outTok, total: inTok + outTok }),
          rawFilePath: filePath
        });
      }
    } catch {}
  }
}
