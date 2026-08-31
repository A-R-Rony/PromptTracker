import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { NormalizedSession, PromptTurn, ToolScanner, approximateTokens, estimateCost } from '../../core/dist';

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

function detectDynamicModel(rawText: string, defaultModel = 'gemini-3.7-flash'): string {
  // 1. Check for Model Selection string
  const modelChangeMatch = rawText.match(/Model Selection[`'\s]+from[^\n]+to\s+([A-Za-z0-9_.\s-]+)/i);
  if (modelChangeMatch && modelChangeMatch[1]) {
    const rawName = modelChangeMatch[1].trim().toLowerCase();
    if (rawName.includes('gemini 3.7 flash') || rawName.includes('gemini-3.7-flash')) return 'gemini-3.7-flash';
    if (rawName.includes('gemini 2.5 pro') || rawName.includes('gemini-2.5-pro')) return 'gemini-2.5-pro';
    if (rawName.includes('gemini 2.5 flash') || rawName.includes('gemini-2.5-flash')) return 'gemini-2.5-flash';
    if (rawName.includes('claude 3.7 sonnet') || rawName.includes('claude-3-7-sonnet')) return 'claude-3-7-sonnet';
    if (rawName.includes('gpt-4o')) return 'gpt-4o';
  }

  // 2. Check JSON property patterns
  const jsonModelMatch = rawText.match(/"model(?:_name)?"\s*:\s*"([^"]+)"/i);
  if (jsonModelMatch && jsonModelMatch[1]) {
    return jsonModelMatch[1].trim().toLowerCase();
  }

  return defaultModel;
}

export class AntigravityScanner implements ToolScanner {
  readonly name = 'antigravity';
  private customBaseDir?: string;

  constructor(customBaseDir?: string) {
    this.customBaseDir = customBaseDir;
  }

  async scan(): Promise<NormalizedSession[]> {
    const sessions: NormalizedSession[] = [];
    const baseDir = this.customBaseDir || path.join(os.homedir(), '.gemini', 'antigravity-ide', 'brain');

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
          let currentModel = detectDynamicModel(rawText, 'gemini-3.7-flash');
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

              if (entry.model || entry.metadata?.model) {
                currentModel = entry.model || entry.metadata.model;
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
                  lastTurn.assistantResponse = responseContent;
                  lastTurn.tokens.output += outTok;
                  lastTurn.tokens.total += outTok;
                }
              }

              if (entry.tool_calls && Array.isArray(entry.tool_calls)) {
                for (const tc of entry.tool_calls) {
                  if (turns.length > 0) {
                    const lastTurn = turns[turns.length - 1];
                    if (!lastTurn.toolCalls) lastTurn.toolCalls = [];
                    lastTurn.toolCalls.push({ name: tc.tool || tc.name || 'tool_call', args: tc.args });
                  }
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
