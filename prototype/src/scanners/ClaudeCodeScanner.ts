import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { NormalizedSession, PromptTurn, ToolScanner } from '../types';
import { approximateTokens, estimateCost } from '../pricing';

export class ClaudeCodeScanner implements ToolScanner {
  readonly name = 'claude_code';

  async scan(): Promise<NormalizedSession[]> {
    const sessions: NormalizedSession[] = [];
    const claudeDir = path.join(os.homedir(), '.claude');

    if (!fs.existsSync(claudeDir)) return sessions;

    const scanDir = (dir: string) => {
      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            scanDir(fullPath);
          } else if (file.endsWith('.jsonl') || file === 'history.jsonl') {
            this.parseClaudeFile(fullPath, sessions);
          }
        }
      } catch {}
    };

    scanDir(claudeDir);
    return sessions;
  }

  private parseClaudeFile(filePath: string, sessions: NormalizedSession[]) {
    try {
      const stats = fs.statSync(filePath);
      const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(l => l.trim().length > 0);
      const turns: PromptTurn[] = [];
      let inTokTotal = 0;
      let outTokTotal = 0;
      let model = 'claude-3-7-sonnet';

      let idx = 0;
      for (const line of lines) {
        try {
          const item = JSON.parse(line);
          if (item.type === 'user_message' || item.role === 'user' || item.prompt) {
            idx++;
            const text = item.prompt || item.text || item.content || '';
            const inTok = item.usage?.input_tokens || approximateTokens(text);
            inTokTotal += inTok;

            turns.push({
              turnIndex: idx,
              timestamp: item.timestamp || stats.mtime.toISOString(),
              userPrompt: text,
              tokens: { input: inTok, output: 0, total: inTok }
            });
          } else if (item.type === 'assistant_message' || item.role === 'assistant' || item.response) {
            const text = item.response || item.text || item.content || '';
            const outTok = item.usage?.output_tokens || approximateTokens(text);
            outTokTotal += outTok;
            if (turns.length > 0) {
              const last = turns[turns.length - 1];
              last.assistantSummary = text.slice(0, 300);
              last.tokens.output += outTok;
              last.tokens.total += outTok;
            }
          }
        } catch {}
      }

      if (turns.length > 0) {
        const dateStr = stats.mtime.toISOString().split('T')[0];
        const totalTokens = { input: inTokTotal, output: outTokTotal, total: inTokTotal + outTokTotal };

        sessions.push({
          id: 'claude-' + path.basename(filePath, '.jsonl'),
          toolSource: 'claude_code',
          projectName: path.basename(path.dirname(filePath)),
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
}
