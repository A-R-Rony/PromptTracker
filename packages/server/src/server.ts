import express, { Express } from 'express';
import * as path from 'path';
import { NormalizedSession, exportSessionToMarkdown } from '../../core/dist';
import { ScannerRegistry } from '../../scanners/dist';
import { SessionCache, SessionProvider } from './cache';
import { computeSummary } from './summary';
import { openFileInEditor } from './launcher';

export type MarkdownExporter = (session: NormalizedSession) => string;
export type FileLauncher = (filePath: string) => void;

export interface ServerOptions {
  sessionProvider?: SessionProvider;
  exporter?: MarkdownExporter;
  launcher?: FileLauncher;
  staticDir?: string;
}

const DEFAULT_STATIC_DIR = path.join(__dirname, '..', 'public');

function isForceRefresh(query: Record<string, unknown>): boolean {
  return query.force === 'true' || query.refresh === 'true';
}

export function createServer(options: ServerOptions = {}): Express {
  const app = express();

  const sessionProvider: SessionProvider =
    options.sessionProvider ?? (() => new ScannerRegistry().scanAll());
  const exporter: MarkdownExporter = options.exporter ?? exportSessionToMarkdown;
  const launcher: FileLauncher = options.launcher ?? openFileInEditor;
  const staticDir = options.staticDir ?? DEFAULT_STATIC_DIR;
  const cache = new SessionCache(sessionProvider);

  app.use(express.json());
  app.use(express.static(staticDir));

  app.get('/api/sessions', async (req, res) => {
    try {
      const sessions = await cache.get(isForceRefresh(req.query as Record<string, unknown>));
      res.json({ success: true, count: sessions.length, data: sessions });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/summary', async (_req, res) => {
    try {
      const sessions = await cache.get();
      res.json({ success: true, summary: computeSummary(sessions) });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/open-session', async (req, res) => {
    try {
      const sessionId = req.body?.sessionId;
      if (typeof sessionId !== 'string' || sessionId.length === 0) {
        return res.status(400).json({ success: false, error: 'sessionId is required' });
      }

      const sessions = await cache.get();
      const session = sessions.find(s => s.id === sessionId);
      if (!session) {
        return res.status(404).json({ success: false, error: 'Session not found' });
      }

      const transcriptPath = exporter(session);
      launcher(transcriptPath);
      return res.json({ success: true, transcriptPath });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  return app;
}
