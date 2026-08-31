import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { NormalizedSession, PromptTurn, ToolScanner } from '../types';
import { approximateTokens, estimateCost } from '../pricing';

function cleanPromptText(raw: string): string {
  if (!raw) return '';
  const startTag = '<USER_REQUEST>';
  const endTag = '</USER_REQUEST>';
  const sIdx = raw.indexOf(startTag);
  const eIdx = raw.indexOf(endTag);
  if (sIdx !== -1 && eIdx !== -1 && eIdx > sIdx) {
    return raw.substring(sIdx + startTag.length, eIdx).trim();
  }
  return raw.trim();
}

export class AntigravityScanner implements ToolScanner {
  readonly name = 'antigravity';

  async scan(): Promise<NormalizedSession[]> {
    const sessions: NormalizedSession[] = [];
    const baseDir = path.join(os.homedir(), '.gemini', 'antigravity-ide', 'brain');

    if (!fs.existsSync(baseDir)) return sessions;

    try {
      const convDirs = fs.readdirSync(baseDir);

      for (const convId of convDirs) {
        const transcriptPath = path.join(baseDir, convId, '.system_generated', 'logs', 'transcript.jsonl');
        if (!fs.existsSync(transcriptPath)) continue;

        try {
          const stats = fs.statSync(transcriptPath);
          const rawText = fs.readFileSync(transcriptPath, 'utf8');
          const rawLines = rawText.split('\n').filter(l => l.trim().length > 0);

          const turns: PromptTurn[] = [];
          let currentModel = 'gemini-3.7-flash';
          let inputTokensTotal = 0;
          let outputTokensTotal = 0;
          let sessionTimestamp = stats.mtime.toISOString();
          let detectedProjectPath = '';

          let turnIdx = 0;
          for (const line of rawLines) {
            try {
              const entry = JSON.parse(line);
              if (entry.created_at || entry.timestamp) {
                sessionTimestamp = entry.created_at || entry.timestamp;
              }

              if (entry.type === 'USER_INPUT' || entry.source === 'USER_EXPLICIT') {
                turnIdx++;
                const rawContent = typeof entry.content === 'string' ? entry.content : JSON.stringify(entry.content || '');
                const cleanedPrompt = cleanPromptText(rawContent);
                const inTok = approximateTokens(rawContent);
                inputTokensTotal += inTok;

                turns.push({
                  turnIndex: turnIdx,
                  timestamp: entry.created_at || entry.timestamp || sessionTimestamp,
                  userPrompt: cleanedPrompt || rawContent.slice(0, 300),
                  assistantSummary: '',
                  tokens: { input: inTok, output: 0, total: inTok }
                });
              } else if (entry.type === 'PLANNER_RESPONSE' || entry.source === 'MODEL') {
                const responseContent = typeof entry.content === 'string' ? entry.content : JSON.stringify(entry.content || '');
                const outTok = approximateTokens(responseContent);
                outputTokensTotal += outTok;

                if (turns.length > 0) {
                  const lastTurn = turns[turns.length - 1];
                  lastTurn.assistantSummary = responseContent.slice(0, 300);
                  lastTurn.tokens.output += outTok;
                  lastTurn.tokens.total += outTok;
                }
              }

              if (entry.tool_calls && Array.isArray(entry.tool_calls)) {
                for (const tc of entry.tool_calls) {
                  if (tc.args && tc.args.Cwd) {
                    detectedProjectPath = tc.args.Cwd;
                  } else if (tc.args && tc.args.TargetFile) {
                    detectedProjectPath = path.dirname(tc.args.TargetFile);
                  }
                }
              }
            } catch {}
          }

          if (turns.length > 0) {
            const dateStr = sessionTimestamp.split('T')[0];
            const totalTokens = {
              input: inputTokensTotal,
              output: outputTokensTotal,
              total: inputTokensTotal + outputTokensTotal
            };

            const firstPromptClean = turns[0]?.userPrompt.slice(0, 40).replace(/\n/g, ' ') || ('conv-' + convId.slice(0, 8));

            sessions.push({
              id: 'antigravity-' + convId,
              toolSource: 'antigravity',
              projectName: firstPromptClean,
              projectPath: detectedProjectPath || '',
              timestamp: sessionTimestamp,
              date: dateStr,
              model: currentModel,
              turns,
              totalTokens,
              estimatedCostUsd: estimateCost(currentModel, totalTokens),
              rawFilePath: transcriptPath
            });
          }
        } catch {}
      }
    } catch (e) {
      console.error('AntigravityScanner error:', e);
    }

    return sessions;
  }
}
