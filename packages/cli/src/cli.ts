#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import * as fs from 'fs';
import {
  NormalizedSession,
  SessionMetadata,
  SessionStorageManager,
  SyncReport,
  exportSessionToMarkdown,
  migrateLegacyJsonCache,
  syncSessions,
  withTurns
} from '@prompttracker/core';
import { ScannerRegistry } from '@prompttracker/scanners';
import { filterSessionsByDate, DateFilterOptions } from './dateFilter.js';
import { filterSessionsByScope } from './scope.js';
import { loadTurnsForSession } from './sessionLoader.js';
import { App } from './ui/App.js';

const program = new Command();
let activeStorageManager: SessionStorageManager | undefined;
function storageManager(): SessionStorageManager {
  activeStorageManager ??= new SessionStorageManager();
  return activeStorageManager;
}

program
  .name('prompt-lens')
  .description('Universal AI Coding Prompt & Token Usage Telemetry Tracker')
  .version('0.1.0');

async function loadSessions(options: {
  all?: boolean;
  project?: string;
  date?: string;
  since?: string;
  until?: string;
}): Promise<{ sessions: SessionMetadata[]; allSessions: SessionMetadata[]; scopeLabel: string; dateLabel: string }> {
  const cache = storageManager();
  await syncCacheWithSources(cache);
  const allSessions = cache.listSessions();

  const scoped = filterSessionsByScope(allSessions, options);
  const sessions = scoped.sessions;
  const scopeLabel = scoped.scopeLabel;

  const dateFilterOpts: DateFilterOptions = {
    date: options.date,
    since: options.since,
    until: options.until,
  };
  const { filtered: dateFilteredSessions, label: dateLabel } = filterSessionsByDate(
    sessions,
    dateFilterOpts
  );

  return {
    sessions: dateFilteredSessions,
    allSessions,
    scopeLabel,
    dateLabel,
  };
}

async function syncCacheWithSources(cache: SessionStorageManager): Promise<SyncReport> {
  try {
    const migrationReport = await migrateLegacyJsonCache(cache);
    if (migrationReport.migrated > 0) {
      console.log(chalk.green(`✓ Migrated ${migrationReport.migrated} legacy session cache file(s) to SQLite.`));
    }
    for (const fail of migrationReport.failed) {
      console.error(chalk.yellow(`⚠ Legacy cache migration warning for ${fail.file}: ${fail.error}`));
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(chalk.yellow(`⚠ Legacy cache migration could not complete: ${message}`));
  }

  const registry = new ScannerRegistry();
  const report = await syncSessions(cache, registry.listScanners());
  for (const failure of report.failedSources) {
    console.error(chalk.yellow(`⚠ Could not read ${failure.name} source: ${failure.error}`));
  }
  return report;
}


// 1. Default Action: Launch Interactive TUI or Non-Interactive Table
export async function runScan(options: {
  all?: boolean;
  project?: string;
  date?: string;
  since?: string;
  until?: string;
  noInteractive?: boolean;
}) {
  const { sessions, allSessions, scopeLabel } = await loadSessions(options);

  if (options.noInteractive) {
    printTableList(sessions, scopeLabel);
    return;
  }

  // Clear terminal screen and render Ink interactive TUI
  console.clear();
  render(
    React.createElement(App, {
      initialSessions: sessions,
      allSessions,
      initialScopeLabel: scopeLabel,
      storageManager: storageManager(),
      loadTurns: (session) => loadTurnsForSession(storageManager(), session)
    })
  );
}

function printTableList(sessions: SessionMetadata[], scopeLabel: string) {
  console.log(chalk.cyan.bold(`\n📊 [${scopeLabel}] AI Coding Sessions List\n`));

  const table = new Table({
    head: [
      chalk.cyan('Date'),
      chalk.cyan('Tool'),
      chalk.cyan('Project / Prompt Summary'),
      chalk.cyan('Tokens'),
      chalk.cyan('Cost'),
    ],
    colWidths: [13, 14, 42, 14, 12],
  });

  for (const s of sessions.slice(0, 50)) {
    const summary = (s.projectName || 'Session').slice(0, 38);
    table.push([
      s.date || 'N/A',
      s.toolSource,
      summary,
      s.totalTokens.total.toLocaleString(),
      '$' + s.estimatedCostUsd.toFixed(4),
    ]);
  }

  console.log(table.toString());
  console.log(chalk.gray(`\nShowing ${Math.min(50, sessions.length)} of ${sessions.length} sessions.`));
}

// 2. Subcommand: stats
program
  .command('stats')
  .description('Display aggregate token and cost analytics by tool, model, and project')
  .option('-a, --all', 'Analyze all global sessions across all projects')
  .option('-p, --project <name>', 'Filter by specific project')
  .action(async (opts) => {
    const { sessions, scopeLabel } = await loadSessions(opts);

    let totalTokens = 0;
    let totalCost = 0;
    let totalPrompts = 0;
    const byTool: Record<string, { sessions: number; tokens: number; cost: number }> = {};
    const byModel: Record<string, { count: number; tokens: number }> = {};

    for (const s of sessions) {
      totalTokens += s.totalTokens.total;
      totalCost += s.estimatedCostUsd || 0;
      totalPrompts += s.turnCount;

      // By tool
      const tool = s.toolSource || 'unknown';
      if (!byTool[tool]) byTool[tool] = { sessions: 0, tokens: 0, cost: 0 };
      byTool[tool].sessions += 1;
      byTool[tool].tokens += s.totalTokens.total;
      byTool[tool].cost += s.estimatedCostUsd || 0;

      // By model
      const model = s.model || 'unknown';
      if (!byModel[model]) byModel[model] = { count: 0, tokens: 0 };
      byModel[model].count += 1;
      byModel[model].tokens += s.totalTokens.total;
    }

    console.log(chalk.cyan.bold(`\n📈 [${scopeLabel}] Telemetry Analytics Summary\n`));
    console.log(
      chalk.bold('Total Prompts: ') +
        chalk.yellow(totalPrompts.toLocaleString()) +
        chalk.bold('  |  Total Tokens: ') +
        chalk.cyan(totalTokens.toLocaleString()) +
        chalk.bold('  |  Total Cost: ') +
        chalk.green('$' + totalCost.toFixed(4)) +
        '\n'
    );

    // Tool breakdown table
    const toolTable = new Table({
      head: [chalk.magenta('Tool Source'), chalk.magenta('Sessions'), chalk.magenta('Tokens'), chalk.magenta('Est. Cost')],
    });
    for (const [tool, st] of Object.entries(byTool)) {
      toolTable.push([tool, st.sessions, st.tokens.toLocaleString(), '$' + st.cost.toFixed(4)]);
    }
    console.log(chalk.bold('Breakdown by Tool:'));
    console.log(toolTable.toString());

    // Model breakdown table
    const modelTable = new Table({
      head: [chalk.blue('Model'), chalk.blue('Sessions'), chalk.blue('Tokens')],
    });
    for (const [model, st] of Object.entries(byModel)) {
      modelTable.push([model, st.count, st.tokens.toLocaleString()]);
    }
    console.log(chalk.bold('\nBreakdown by Model:'));
    console.log(modelTable.toString());
  });

// 3. Subcommand: list
program
  .command('list')
  .description('List sessions in tabular or JSON format for scripting')
  .option('-a, --all', 'List all global sessions')
  .option('--json', 'Output raw JSON')
  .option('-p, --project <name>', 'Filter by project')
  .action(async (opts) => {
    const { sessions, scopeLabel } = await loadSessions(opts);

    if (opts.json) {
      console.log(JSON.stringify(sessions, null, 2));
      return;
    }

    printTableList(sessions, scopeLabel);
  });

// 5. Subcommand: export <sessionId>
program
  .command('export [sessionId]')
  .description('Export a session to Markdown or JSON')
  .option('--format <format>', 'Export format (md or json)', 'md')
  .option('--out <file>', 'Output file destination')
  .action(async (sessionId: string | undefined, opts) => {
    const { sessions } = await loadSessions({ all: true });

    let target = sessions[0];
    if (sessionId) {
      const found = sessions.find((s) => s.id === sessionId || s.projectName.includes(sessionId));
      if (!found) {
        console.error(chalk.red(`Session "${sessionId}" not found.`));
        process.exitCode = 1;
        return;
      }
      target = found;
    }

    const completeTarget: NormalizedSession = withTurns(target,
      await loadTurnsForSession(storageManager(), target));

    if (opts.format === 'json') {
      const jsonContent = JSON.stringify(completeTarget, null, 2);
      const outPath = opts.out || `./session-${target.date}-${target.toolSource}.json`;
      fs.writeFileSync(outPath, jsonContent, 'utf-8');
      console.log(chalk.green(`✓ Exported session to JSON: ${outPath}`));
    } else {
      const mdPath = exportSessionToMarkdown(completeTarget);
      if (opts.out) {
        fs.copyFileSync(mdPath, opts.out);
        console.log(chalk.green(`✓ Exported session to Markdown: ${opts.out}`));
      } else {
        console.log(chalk.green(`✓ Exported session to Markdown: ${mdPath}`));
      }
    }
  });

// 6. Subcommand: cache
const cacheCommand = program
  .command('cache')
  .description('Manage Prompt Lens local SQLite Session cache');

cacheCommand
  .command('status')
  .description('Display Cached Content size, session counts, and retention limits')
  .option('--json', 'Output raw JSON')
  .action((opts) => {
    try {
      const status = storageManager().getCacheStatus();
      if (opts.json) {
        console.log(JSON.stringify(status, null, 2));
        return;
      }

      console.log(chalk.cyan.bold('\n💾 Prompt Lens Cached Content Status\n'));
      const table = new Table();
      table.push(
        { [chalk.bold('Full-Content Caching')]: status.cacheFullContent ? chalk.green('Enabled') : chalk.yellow('Disabled') },
        { [chalk.bold('Cached Content Size')]: formatBytes(status.totalContentBytes) },
        { [chalk.bold('Content-Bearing Sessions')]: status.contentBearingSessions.toLocaleString() },
        { [chalk.bold('Total Indexed Sessions')]: status.totalSessions.toLocaleString() },
        { [chalk.bold('Configured Size Limit')]: formatBytes(status.maxBytes) },
        { [chalk.bold('Configured Age Limit')]: `${status.maxAgeDays} days` }
      );
      console.log(table.toString());
      console.log(chalk.gray('\nCached prompts and responses are stored locally in plaintext and are never transmitted.\n'));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Failed to read cache status: ${message}`));
      process.exitCode = 1;
    }
  });

cacheCommand
  .command('clear')
  .description('Safely clear all cached full Turn content while retaining Session metadata')
  .action(() => {
    try {
      const report = storageManager().clearCachedContent();
      console.log(chalk.green(
        `✓ Cleared Cached Content: evicted ${report.evictedCount} sessions (${formatBytes(report.bytesFreed)} freed).`
      ));
      console.log(chalk.gray('Session metadata index and analytics have been preserved.'));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Failed to clear Cached Content: ${message}`));
      process.exitCode = 1;
    }
  });

cacheCommand
  .command('migrate')
  .description('Explicitly migrate legacy JSON spill files to SQLite')
  .option('--dir <path>', 'Custom path to legacy cache directory')
  .action(async (opts) => {
    try {
      const report = await migrateLegacyJsonCache(storageManager(), {
        legacyCacheDir: opts.dir
      });
      console.log(chalk.cyan.bold('\n📦 Legacy Cache Migration Report\n'));
      console.log(`Discovered: ${report.discovered}`);
      console.log(`Migrated:   ${chalk.green(report.migrated)}`);
      console.log(`Skipped:    ${report.skipped}`);
      if (report.failed.length > 0) {
        console.log(`Failed:     ${chalk.red(report.failed.length)}`);
        for (const f of report.failed) {
          console.error(chalk.yellow(` - ${f.file}: ${f.error}`));
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Legacy cache migration failed: ${message}`));
      process.exitCode = 1;
    }
  });


function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}


// Primary default options
program
  .option('-a, --all', 'Scan all global projects and sessions')
  .option('-p, --project <name>', 'Filter by specific project name or path')
  .option('-d, --date <YYYY-MM-DD>', 'Filter by exact date (YYYY-MM-DD)')
  .option('--since <date_or_relative>', 'Filter sessions on or after date (e.g. 7d, 30d, 2026-08-01)')
  .option('--until <date>', 'Filter sessions up to date (YYYY-MM-DD)')
  .option('-n, --no-interactive', 'Disable interactive selector')
  .action(runScan);

export { program };

import { fileURLToPath } from 'url';
const isMain = process.argv[1] && (
  process.argv[1] === fileURLToPath(import.meta.url) ||
  process.argv[1].endsWith('cli.js') ||
  process.argv[1].endsWith('prompt-lens') ||
  process.argv[1].endsWith('promptlens') ||
  process.argv[1].endsWith('prompttracker')
);

if (isMain) {
  program.parseAsync(process.argv).catch(error => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Prompt Lens failed: ${message}`));
    process.exitCode = 1;
  });
}
