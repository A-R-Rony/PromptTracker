import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { NormalizedSession, PromptTurn, ToolScanner, approximateTokens, estimateCost } from '../../core/dist';

export class KiroScanner implements ToolScanner {
  readonly name = 'kiro';
  private customBaseDir?: string;

  constructor(customBaseDir?: string) {
    this.customBaseDir = customBaseDir;
  }

  async scan(): Promise<NormalizedSession[]> {
    const sessions: NormalizedSession[] = [];
    const kiroBase = this.customBaseDir || path.join(os.homedir(), '.kiro', 'workspaces');

    if (!fs.existsSync(kiroBase)) return sessions;

    try {
      const wsDirs = fs.readdirSync(kiroBase);
      for (const ws of wsDirs) {
        const sessFile = path.join(kiroBase, ws, 'sessions.json');
        if (fs.existsSync(sessFile)) {
          this.parseKiroSessionFile(sessFile, ws, sessions);
        }
      }
    } catch {}

    return sessions;
  }

  private parseKiroSessionFile(filePath: string, wsName: string, sessions: NormalizedSession[]) {
    try {
      const stats = fs.statSync(filePath);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (!Array.isArray(data)) return;

      for (const sess of data) {
        const turns: PromptTurn[] = [];
        let inTokTotal = 0;
        let outTokTotal = 0;
        let model = sess.model || sess.config?.model || 'gpt-4o';

        if (Array.isArray(sess.history)) {
          let idx = 0;
          for (const h of sess.history) {
            idx++;
            const inTok = approximateTokens(h.prompt || '');
            const outTok = approximateTokens(h.response || '');
            inTokTotal += inTok;
            outTokTotal += outTok;

            turns.push({
              turnIndex: idx,
              timestamp: h.timestamp || sess.updatedAt || stats.mtime.toISOString(),
              userPrompt: h.prompt || '',
              assistantSummary: (h.response || '').slice(0, 300),
              assistantResponse: h.response,
              tokens: { input: inTok, output: outTok, total: inTok + outTok }
            });
          }
        }

        if (turns.length > 0) {
          const dateStr = (sess.createdAt || stats.mtime.toISOString()).split('T')[0];
          const totalTokens = { input: inTokTotal, output: outTokTotal, total: inTokTotal + outTokTotal };

          sessions.push({
            id: 'kiro-' + (sess.id || wsName),
            toolSource: 'kiro',
            projectName: sess.name || wsName,
            timestamp: sess.createdAt || stats.mtime.toISOString(),
            date: dateStr,
            model,
            turns,
            totalTokens,
            estimatedCostUsd: estimateCost(model, totalTokens),
            rawFilePath: filePath
          });
        }
      }
    } catch {}
  }
}
