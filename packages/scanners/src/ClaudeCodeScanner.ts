import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { NormalizedSession, PromptTurn, ScanHints, ToolScanner, approximateTokens, estimateCost, fileSignals } from '@prompttracker/core';

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

export class ClaudeCodeScanner implements ToolScanner {
  readonly name = 'claude_code';
  private customBaseDir?: string;

  constructor(customBaseDir?: string) {
    this.customBaseDir = customBaseDir;
  }

  async scan(options?: ScanHints): Promise<NormalizedSession[]> {
    const sessions: NormalizedSession[] = [];
    const claudeDir = this.customBaseDir || path.join(os.homedir(), '.claude');

    if (!fs.existsSync(claudeDir)) return sessions;

    const scanDir = (dir: string) => {
      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            scanDir(fullPath);
          } else if (file.endsWith('.jsonl') || file.endsWith('.json')) {
            if (options?.shouldSkipFile?.(fullPath, { mtimeMs: stat.mtimeMs, sizeBytes: stat.size })) continue;
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
      const raw = fs.readFileSync(filePath, 'utf8');
      const lines = raw.split('\n').filter(l => l.trim().length > 0);
      const turns: PromptTurn[] = [];
      let inTokTotal = 0;
      let outTokTotal = 0;
      let model = 'claude-3-7-sonnet';
      let detectedCwd = '';

      let idx = 0;
      for (const line of lines) {
        try {
          const item = JSON.parse(line);

          if (item.cwd || item.workingDirectory || item.projectPath) {
            detectedCwd = item.cwd || item.workingDirectory || item.projectPath;
          }

          if (item.model || item.model_name) {
            let rawModel = item.model || item.model_name;
            // Clean provider prefix e.g. "anthropic/claude-3-7-sonnet-20250219" -> "claude-3-7-sonnet"
            rawModel = rawModel.replace(/^(anthropic|google|openai|deepseek)\//i, '').toLowerCase().replace(/\s+/g, '-');
            // Clean date suffixes like -20250219
            rawModel = rawModel.replace(/-\d{8}$/, '');
            model = rawModel;
          }

          if (item.type === 'user_message' || item.role === 'user' || item.prompt) {
            idx++;
            const text = extractText(item.prompt || item.text || item.content || '');
            const hasExactIn = typeof item.usage?.input_tokens === 'number';
            const inTok = hasExactIn ? item.usage.input_tokens : approximateTokens(text);
            inTokTotal += inTok;

            turns.push({
              turnIndex: idx,
              timestamp: item.timestamp || stats.mtime.toISOString(),
              userPrompt: text,
              assistantSummary: '',
              assistantResponse: '',
              tokens: {
                input: inTok,
                output: 0,
                total: inTok,
                isEstimated: !hasExactIn,
                source: hasExactIn ? 'provider_telemetry' : 'estimated_heuristic'
              }
            });
          } else if (item.type === 'assistant_message' || item.role === 'assistant' || item.response) {
            const text = extractText(item.response || item.text || item.content || '');
            const hasExactOut = typeof item.usage?.output_tokens === 'number';
            const outTok = hasExactOut ? item.usage.output_tokens : approximateTokens(text);
            outTokTotal += outTok;
            if (turns.length > 0) {
              const last = turns[turns.length - 1];
              last.assistantSummary = text.slice(0, 300);
              last.assistantResponse = (last.assistantResponse ? last.assistantResponse + '\n\n' : '') + text;
              last.tokens.output += outTok;
              last.tokens.total += outTok;
              if (hasExactOut) {
                last.tokens.isEstimated = false;
                last.tokens.source = 'provider_telemetry';
              }
            }
          }
        } catch {}
      }

      if (turns.length > 0) {
        const sessionTimestamp = turns[0]?.timestamp || stats.mtime.toISOString();
        const dateStr = sessionTimestamp.split('T')[0];
        const isEstimated = turns.some(t => t.tokens.isEstimated);
        const totalTokens = {
          input: inTokTotal,
          output: outTokTotal,
          total: inTokTotal + outTokTotal,
          isEstimated,
          source: isEstimated ? ('estimated_heuristic' as const) : ('provider_telemetry' as const)
        };
        const projectName = detectedCwd ? path.basename(detectedCwd) : path.basename(path.dirname(filePath));

        sessions.push({
          id: 'claude-' + path.basename(filePath, path.extname(filePath)),
          toolSource: 'claude_code',
          projectName,
          projectPath: detectedCwd ? detectedCwd.replace(/\\/g, '/') : '',
          timestamp: sessionTimestamp,
          date: dateStr,
          model,
          turns,
          totalTokens,
          estimatedCostUsd: estimateCost(model, totalTokens),
          rawFilePath: filePath,
          sourceSignals: fileSignals(stats)
        });
      }
    } catch {}
  }
}
