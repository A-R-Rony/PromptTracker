import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { NormalizedSession, PromptTurn } from './types';

export class SessionStorageManager {
  private cacheDir: string;
  private maxMemoryBytes: number;
  private currentMemoryBytes: number = 0;
  private spilledSessionIds: Set<string> = new Set();

  constructor(maxMemoryMb: number = 50) {
    this.maxMemoryBytes = maxMemoryMb * 1024 * 1024;
    this.cacheDir = path.join(os.homedir(), '.prompttracker', 'cache');
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Estimates byte size of turns array
   */
  private estimateTurnsSize(turns: PromptTurn[]): number {
    let size = 0;
    for (const t of turns) {
      size += (t.userPrompt?.length || 0) * 2;
      size += (t.assistantResponse?.length || 0) * 2;
      size += (t.assistantSummary?.length || 0) * 2;
      if (t.toolCalls) {
        size += JSON.stringify(t.toolCalls).length * 2;
      }
      size += 200; // object overhead
    }
    return size;
  }

  /**
   * Checks if session turns should spill to disk to stay under memory threshold
   */
  public manageSessionMemory(session: NormalizedSession): void {
    const turnsSize = this.estimateTurnsSize(session.turns);

    if (this.currentMemoryBytes + turnsSize > this.maxMemoryBytes) {
      // Spill full turn content to disk cache
      const cachePath = path.join(this.cacheDir, `${session.id}.json`);
      fs.writeFileSync(cachePath, JSON.stringify(session.turns), 'utf8');
      this.spilledSessionIds.add(session.id);

      // In RAM: keep lightweight summary turns (only userPrompt slice & assistantSummary)
      session.turns = session.turns.map(t => ({
        turnIndex: t.turnIndex,
        timestamp: t.timestamp,
        userPrompt: t.userPrompt.slice(0, 300),
        assistantSummary: t.assistantSummary || t.assistantResponse?.slice(0, 300),
        tokens: t.tokens
      }));
    } else {
      this.currentMemoryBytes += turnsSize;
    }
  }

  /**
   * Lazily loads full turns if they were spilled to disk
   */
  public loadFullTurns(session: NormalizedSession): PromptTurn[] {
    if (this.spilledSessionIds.has(session.id)) {
      const cachePath = path.join(this.cacheDir, `${session.id}.json`);
      if (fs.existsSync(cachePath)) {
        try {
          return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
        } catch {}
      }
    }
    return session.turns;
  }

  public getMemoryUsageSummary(): { currentMb: string; maxMb: string; spilledCount: number } {
    return {
      currentMb: (this.currentMemoryBytes / (1024 * 1024)).toFixed(2),
      maxMb: (this.maxMemoryBytes / (1024 * 1024)).toFixed(0),
      spilledCount: this.spilledSessionIds.size
    };
  }
}
