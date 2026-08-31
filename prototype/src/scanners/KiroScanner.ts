import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { NormalizedSession, PromptTurn, ToolScanner } from '../types';
import { approximateTokens, estimateCost } from '../pricing';

export class KiroScanner implements ToolScanner {
  readonly name = 'kiro';

  async scan(): Promise<NormalizedSession[]> {
    const sessions: NormalizedSession[] = [];
    const possiblePaths = [
      path.join(os.homedir(), '.kiro', 'sessions'),
      path.join(process.env.APPDATA || '', 'Kiro', 'User', 'workspaceStorage'),
      path.join(process.env.LOCALAPPDATA || '', 'kiro-ide', 'logs')
    ];

    for (const searchDir of possiblePaths) {
      if (!fs.existsSync(searchDir)) continue;

      try {
        const files = fs.readdirSync(searchDir);
        for (const file of files) {
          if (!file.endsWith('.json') && !file.endsWith('.jsonl')) continue;
          const fullPath = path.join(searchDir, file);
          const stats = fs.statSync(fullPath);
          const content = fs.readFileSync(fullPath, 'utf8');

          const turns: PromptTurn[] = [];
          let inputTokensTotal = 0;
          let outputTokensTotal = 0;
          let model = 'claude-3-5-sonnet';

          try {
            const data = JSON.parse(content);
            const messages = data.messages || data.chatHistory || (Array.isArray(data) ? data : []);
            let idx = 0;

            for (const m of messages) {
              if (m.role === 'user' || m.sender === 'user') {
                idx++;
                const text = typeof m.content === 'string' ? m.content : (m.text || JSON.stringify(m));
                const inTok = m.tokens?.input || approximateTokens(text);
                inputTokensTotal += inTok;
                turns.push({
                  turnIndex: idx,
                  timestamp: m.timestamp || stats.mtime.toISOString(),
                  userPrompt: text,
                  tokens: { input: inTok, output: 0, total: inTok }
                });
              } else if ((m.role === 'assistant' || m.sender === 'assistant') && turns.length > 0) {
                const text = typeof m.content === 'string' ? m.content : (m.text || JSON.stringify(m));
                const outTok = m.tokens?.output || approximateTokens(text);
                outputTokensTotal += outTok;
                const lastTurn = turns[turns.length - 1];
                lastTurn.assistantSummary = text.slice(0, 300);
                lastTurn.tokens.output += outTok;
                lastTurn.tokens.total += outTok;
              }
            }
          } catch {}

          if (turns.length > 0) {
            const dateStr = stats.mtime.toISOString().split('T')[0];
            const totalTokens = {
              input: inputTokensTotal,
              output: outputTokensTotal,
              total: inputTokensTotal + outputTokensTotal
            };

            sessions.push({
              id: 'kiro-' + path.basename(file, path.extname(file)),
              toolSource: 'kiro',
              projectName: 'Kiro IDE Workspace',
              timestamp: stats.mtime.toISOString(),
              date: dateStr,
              model,
              turns,
              totalTokens,
              estimatedCostUsd: estimateCost(model, totalTokens),
              rawFilePath: fullPath
            });
          }
        }
      } catch {}
    }

    return sessions;
  }
}
