import { NormalizedSession, ToolScanner } from '../../core/dist';
import { AntigravityScanner } from './AntigravityScanner';
import { OpenCodeScanner } from './OpenCodeScanner';
import { ClaudeCodeScanner } from './ClaudeCodeScanner';
import { CodexScanner } from './CodexScanner';
import { KiroScanner } from './KiroScanner';

export * from './AntigravityScanner';
export * from './ClaudeCodeScanner';
export * from './CodexScanner';
export * from './KiroScanner';
export * from './OpenCodeScanner';

export class ScannerRegistry {
  private scanners: ToolScanner[] = [];

  constructor(customScanners?: ToolScanner[]) {
    this.scanners = customScanners || [
      new AntigravityScanner(),
      new OpenCodeScanner(),
      new ClaudeCodeScanner(),
      new CodexScanner(),
      new KiroScanner()
    ];
  }

  listScanners(): ToolScanner[] {
    return [...this.scanners];
  }

  async scanAll(): Promise<NormalizedSession[]> {
    const results: NormalizedSession[] = [];
    for (const scanner of this.scanners) {
      try {
        const toolSessions = await scanner.scan();
        results.push(...toolSessions);
      } catch (err) {
        console.error('Error executing scanner ' + scanner.name + ':', err);
      }
    }
    return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}
