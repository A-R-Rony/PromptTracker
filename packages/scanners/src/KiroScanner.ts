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

export class KiroScanner implements ToolScanner {
  readonly name = 'kiro';
  private customBaseDir?: string;

  constructor(customBaseDir?: string) {
    this.customBaseDir = customBaseDir;
  }

  async scan(): Promise<NormalizedSession[]> {
    const sessions: NormalizedSession[] = [];
    const kiroBase = this.customBaseDir || path.join(os.homedir(), '.kiro');

    if (!fs.existsSync(kiroBase)) return sessions;

    const scanDir = (dir: string) => {
      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            scanDir(fullPath);
          } else if (file.endsWith('.json') && !file.startsWith('.')) {
            this.parseKiroSessionFile(fullPath, sessions);
          }
        }
      } catch {}
    };

    scanDir(kiroBase);
    return sessions;
  }

  private parseKiroSessionFile(filePath: string, sessions: NormalizedSession[]) {
    try {
      const stats = fs.statSync(filePath);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      const sessionList: any[] = Array.isArray(data)
        ? data
        : data && typeof data === 'object'
        ? data.sessions
          ? Array.isArray(data.sessions)
            ? data.sessions
            : Object.values(data.sessions)
          : [data]
        : [];

      for (const sess of sessionList) {
        if (!sess || typeof sess !== 'object') continue;

        const turns: PromptTurn[] = [];
        let inTokTotal = 0;
        let outTokTotal = 0;
        let rawModel = sess.model || sess.config?.model || sess.settings?.model || 'gpt-4o';
        let model = rawModel.replace(/^(openai|google|anthropic)\//i, '').toLowerCase().replace(/\s+/g, '-');
        const historyList = sess.history || sess.messages || sess.turns;

        if (Array.isArray(historyList)) {
          let idx = 0;
          for (const h of historyList) {
            const userText = extractText(h.prompt || (h.role === 'user' ? h.content : ''));
            const asstText = extractText(h.response || (h.role === 'assistant' ? h.content : ''));

            if (userText) {
              idx++;
              const inTok = h.inputTokens || h.tokens?.input || approximateTokens(userText);
              const outTok = h.outputTokens || h.tokens?.output || (asstText ? approximateTokens(asstText) : 0);
              inTokTotal += inTok;
              outTokTotal += outTok;

              turns.push({
                turnIndex: idx,
                timestamp: h.timestamp || sess.updatedAt || stats.mtime.toISOString(),
                userPrompt: userText,
                assistantSummary: asstText.slice(0, 300),
                assistantResponse: asstText,
                tokens: { input: inTok, output: outTok, total: inTok + outTok }
              });
            } else if (asstText && turns.length > 0) {
              const last = turns[turns.length - 1];
              const outTok = h.outputTokens || h.tokens?.output || approximateTokens(asstText);
              outTokTotal += outTok;
              last.assistantSummary = asstText.slice(0, 300);
              last.assistantResponse = (last.assistantResponse ? last.assistantResponse + '\n\n' : '') + asstText;
              last.tokens.output += outTok;
              last.tokens.total += outTok;
            }
          }
        }

        if (turns.length > 0) {
          const dateStr = (sess.createdAt || sess.timestamp || stats.mtime.toISOString()).split('T')[0];
          const totalTokens = { input: inTokTotal, output: outTokTotal, total: inTokTotal + outTokTotal };
          const wsName = path.basename(path.dirname(filePath));
          const projectName = sess.name || sess.title || sess.projectName || wsName;
          const detectedCwd = sess.projectPath || sess.cwd || sess.workspacePath || '';

          sessions.push({
            id: 'kiro-' + (sess.id || path.basename(filePath, '.json')),
            toolSource: 'kiro',
            projectName,
            projectPath: detectedCwd ? detectedCwd.replace(/\\/g, '/') : '',
            timestamp: sess.createdAt || sess.timestamp || stats.mtime.toISOString(),
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
