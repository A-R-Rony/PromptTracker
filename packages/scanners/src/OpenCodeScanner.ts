import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { NormalizedSession, PromptTurn, ToolScanner, approximateTokens, estimateCost } from '../../core/dist';

export class OpenCodeScanner implements ToolScanner {
  readonly name = 'opencode';
  private customBaseDir?: string;

  constructor(customBaseDir?: string) {
    this.customBaseDir = customBaseDir;
  }

  async scan(): Promise<NormalizedSession[]> {
    const sessions: NormalizedSession[] = [];
    const opencodeDir = this.customBaseDir || path.join(os.homedir(), '.opencode', 'sessions');

    if (!fs.existsSync(opencodeDir)) return sessions;

    try {
      const files = fs.readdirSync(opencodeDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          this.parseOpenCodeSession(path.join(opencodeDir, file), sessions);
        }
      }
    } catch {}

    return sessions;
  }

  private parseOpenCodeSession(filePath: string, sessions: NormalizedSession[]) {
    try {
      const stats = fs.statSync(filePath);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (!data || !Array.isArray(data.prompts)) return;

      const turns: PromptTurn[] = [];
      let inTokTotal = 0;
      let outTokTotal = 0;
      let model = data.model || 'deepseek-chat';

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
