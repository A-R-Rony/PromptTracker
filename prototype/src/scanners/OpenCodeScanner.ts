import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { NormalizedSession, PromptTurn, ToolScanner } from '../types';
import { approximateTokens, estimateCost } from '../pricing';

export class OpenCodeScanner implements ToolScanner {
  readonly name = 'opencode';

  async scan(): Promise<NormalizedSession[]> {
    const sessions: NormalizedSession[] = [];
    const possiblePaths = [
      path.join(os.homedir(), '.opencode', 'sessions'),
      path.join(os.homedir(), '.opencode', 'history'),
      path.join(process.env.APPDATA || '', 'OpenCode', 'User', 'sessions'),
      path.join(process.env.LOCALAPPDATA || '', 'opencode', 'logs')
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

          if (file.endsWith('.json')) {
            try {
              const data = JSON.parse(content);
              const messages = data.messages || data.history || (Array.isArray(data) ? data : []);
              let idx = 0;

              for (const m of messages) {
                if (m.role === 'user') {
                  idx++;
                  const text = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
                  const inTok = m.tokens?.input || approximateTokens(text);
                  inputTokensTotal += inTok;
                  turns.push({
                    turnIndex: idx,
                    timestamp: m.timestamp || stats.mtime.toISOString(),
                    userPrompt: text,
                    tokens: { input: inTok, output: 0, total: inTok }
                  });
                } else if (m.role === 'assistant' && turns.length > 0) {
                  const text = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
                  const outTok = m.tokens?.output || approximateTokens(text);
                  outputTokensTotal += outTok;
                  const lastTurn = turns[turns.length - 1];
                  lastTurn.assistantSummary = text.slice(0, 300);
                  lastTurn.tokens.output += outTok;
                  lastTurn.tokens.total += outTok;
                }
              }
            } catch {}
          }

          if (turns.length > 0) {
            const dateStr = stats.mtime.toISOString().split('T')[0];
            const totalTokens = {
              input: inputTokensTotal,
              output: outputTokensTotal,
              total: inputTokensTotal + outputTokensTotal
            };

            sessions.push({
              id: 'opencode-' + path.basename(file, path.extname(file)),
              toolSource: 'opencode',
              projectName: 'OpenCode Workspace',
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
