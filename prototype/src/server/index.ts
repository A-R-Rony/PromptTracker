import express from 'express';
import * as path from 'path';
import { exec } from 'child_process';
import { ScannerRegistry } from '../scanners';
import { DailySummary, NormalizedSession } from '../types';
import { exportSessionToMarkdown } from '../exporter';

export function createServer() {
  const app = express();
  const registry = new ScannerRegistry();

  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', '..', 'public')));

  let cachedSessions: NormalizedSession[] = [];
  let lastScanTime = 0;

  async function getSessions(force = false): Promise<NormalizedSession[]> {
    const now = Date.now();
    if (force || now - lastScanTime > 10000 || cachedSessions.length === 0) {
      cachedSessions = await registry.scanAll();
      lastScanTime = now;
    }
    return cachedSessions;
  }

  app.get('/api/sessions', async (req, res) => {
    try {
      const force = req.query.refresh === 'true';
      const sessions = await getSessions(force);
      res.json({ success: true, count: sessions.length, data: sessions });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/summary', async (req, res) => {
    try {
      const sessions = await getSessions();
      const totalTokens = sessions.reduce((sum, s) => sum + s.totalTokens.total, 0);
      const totalCostUsd = +sessions.reduce((sum, s) => sum + s.estimatedCostUsd, 0).toFixed(4);
      const totalPrompts = sessions.reduce((sum, s) => sum + s.turns.length, 0);

      const dailyMap: Record<string, DailySummary> = {};
      const toolMap: Record<string, number> = {};
      const modelMap: Record<string, number> = {};

      for (const s of sessions) {
        if (!dailyMap[s.date]) {
          dailyMap[s.date] = {
            date: s.date,
            totalPrompts: 0,
            totalTokens: 0,
            totalCostUsd: 0,
            sessionsCount: 0,
            byTool: {},
            byModel: {},
            byProject: {}
          };
        }
        const d = dailyMap[s.date];
        d.sessionsCount++;
        d.totalPrompts += s.turns.length;
        d.totalTokens += s.totalTokens.total;
        d.totalCostUsd = +(d.totalCostUsd + s.estimatedCostUsd).toFixed(4);

        toolMap[s.toolSource] = (toolMap[s.toolSource] || 0) + s.totalTokens.total;
        modelMap[s.model] = (modelMap[s.model] || 0) + s.totalTokens.total;
      }

      res.json({
        success: true,
        summary: {
          totalTokens,
          totalCostUsd,
          totalPrompts,
          totalSessions: sessions.length,
          byTool: toolMap,
          byModel: modelMap,
          daily: Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date))
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/open-session', async (req, res) => {
    const { sessionId } = req.body;
    const sessions = await getSessions();
    const session = sessions.find(s => s.id === sessionId);

    if (session) {
      const mdFilePath = exportSessionToMarkdown(session);
      const cmd = process.platform === 'win32' ? 'start "" "' + mdFilePath + '"' : 'open "' + mdFilePath + '"';
      exec(cmd, (err) => {
        if (err) {
          exec('code "' + mdFilePath + '"');
        }
      });
      return res.json({ success: true, mdFilePath });
    }

    res.status(404).json({ success: false, error: 'Session not found' });
  });

  return app;
}
