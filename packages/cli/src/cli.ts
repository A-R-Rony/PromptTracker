#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import * as path from 'path';
import * as fs from 'fs';
import { NormalizedSession, SessionStorageManager, exportSessionToMarkdown } from '@prompttracker/core';
import { ScannerRegistry } from '@prompttracker/scanners';
import { filterSessionsByDate, DateFilterOptions } from './dateFilter.js';
import { App } from './ui/App.js';

const program = new Command();
const storageManager = new SessionStorageManager(50); // 50MB RAM Threshold

program
  .name('prompt-lens')
  .description('Universal AI Coding Prompt & Token Usage Telemetry Tracker')
  .version('0.1.0');

function placeholderPath(p: string): string {
  return p.replace(/\\/g, '/');
}

async function loadSessions(options: {
  all?: boolean;
  project?: string;
  date?: string;
  since?: string;
  until?: string;
}): Promise<{ sessions: NormalizedSession[]; rawSessions: NormalizedSession[]; scopeLabel: string; dateLabel: string }> {
  const registry = new ScannerRegistry();
  const rawSessions = await registry.scanAll();

  for (const s of rawSessions) {
    storageManager.manageSessionMemory(s);
  }

  let scopeLabel = 'All Projects';
  const cwd = placeholderPath(process.cwd());
  const cwdName = path.basename(cwd);
  let sessions = rawSessions;

  if (options.project) {
    const q = options.project.toLowerCase();
    sessions = sessions.filter(
      (s) =>
        (s.projectPath && s.projectPath.toLowerCase().includes(q)) ||
        s.projectName.toLowerCase().includes(q)
    );
    scopeLabel = 'Project: ' + options.project;
  } else if (!options.all) {
    const parentDir = placeholderPath(path.resolve(cwd, '..'));
    const parentName = path.basename(parentDir);

    const matched = rawSessions.filter((s) => {
      if (!s.projectPath) return false;
      const p = placeholderPath(s.projectPath).toLowerCase();
      const cur = cwd.toLowerCase();
      const par = parentDir.toLowerCase();
      const curN = cwdName.toLowerCase();
      const parN = parentName.toLowerCase();

      return (
        p === cur ||
        p === par ||
        p.startsWith(cur) ||
        cur.startsWith(p) ||
        p.startsWith(par) ||
        par.startsWith(p) ||
        p.includes(curN) ||
        p.includes(parN)
      );
    });

    if (matched.length > 0) {
      sessions = matched;
      scopeLabel =
        'Project: ' +
        (cwdName === 'cli' || cwdName === 'prototype' || cwdName === 'packages'
          ? parentName
          : cwdName);
    } else {
      scopeLabel = 'All Projects (Global)';
    }
  }

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
    rawSessions,
    scopeLabel,
    dateLabel,
  };
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
  const { sessions, rawSessions, scopeLabel } = await loadSessions(options);

  if (options.noInteractive) {
    printTableList(sessions, scopeLabel);
    return;
  }

  // Clear terminal screen and render Ink interactive TUI
  console.clear();
  render(
    React.createElement(App, {
      initialSessions: sessions,
      rawAllSessions: rawSessions,
      initialScopeLabel: scopeLabel,
      storageManager,
    })
  );
}

function printTableList(sessions: NormalizedSession[], scopeLabel: string) {
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
      totalPrompts += s.turns?.length || 1;

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

// 3. Subcommand: search <query>
program
  .command('search <query>')
  .description('Search prompt texts and model responses across sessions')
  .option('-a, --all', 'Search all global projects')
  .action(async (query: string, opts) => {
    const { sessions, scopeLabel } = await loadSessions(opts);
    const q = query.toLowerCase();

    console.log(chalk.cyan.bold(`\n🔍 Searching sessions for: "${query}" in [${scopeLabel}]...\n`));

    const matches: { session: NormalizedSession; matchingTurns: string[] }[] = [];

    for (const s of sessions) {
      const fullTurns = storageManager.loadFullTurns(s);
      const matchedPromptSnippets: string[] = [];

      for (const t of fullTurns) {
        if (t.userPrompt.toLowerCase().includes(q)) {
          matchedPromptSnippets.push(`[Prompt Turn #${t.turnIndex}]: ${t.userPrompt.slice(0, 100)}...`);
        } else if (t.assistantResponse?.toLowerCase().includes(q) || t.assistantSummary?.toLowerCase().includes(q)) {
          matchedPromptSnippets.push(`[Response Turn #${t.turnIndex}]: ${(t.assistantSummary || t.assistantResponse || '').slice(0, 100)}...`);
        }
      }

      if (matchedPromptSnippets.length > 0 || (s.projectName && s.projectName.toLowerCase().includes(q))) {
        matches.push({ session: s, matchingTurns: matchedPromptSnippets });
      }
    }

    if (matches.length === 0) {
      console.log(chalk.yellow(`No prompt or session matching "${query}" was found.`));
      return;
    }

    console.log(chalk.green(`Found ${matches.length} matching sessions:\n`));
    for (const m of matches.slice(0, 20)) {
      console.log(
        chalk.cyan.bold(`▶ ${m.session.date} | [${m.session.toolSource}] | ${m.session.projectName}`) +
          chalk.gray(` (${m.session.totalTokens.total.toLocaleString()} tokens)`)
      );
      for (const snip of m.matchingTurns.slice(0, 2)) {
        console.log(chalk.gray(`   ↳ ${snip}`));
      }
      console.log();
    }
  });

// 4. Subcommand: list
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
        return;
      }
      target = found;
    }

    target.turns = storageManager.loadFullTurns(target);

    if (opts.format === 'json') {
      const jsonContent = JSON.stringify(target, null, 2);
      const outPath = opts.out || `./session-${target.date}-${target.toolSource}.json`;
      fs.writeFileSync(outPath, jsonContent, 'utf-8');
      console.log(chalk.green(`✓ Exported session to JSON: ${outPath}`));
    } else {
      const mdPath = exportSessionToMarkdown(target);
      if (opts.out) {
        fs.copyFileSync(mdPath, opts.out);
        console.log(chalk.green(`✓ Exported session to Markdown: ${opts.out}`));
      } else {
        console.log(chalk.green(`✓ Exported session to Markdown: ${mdPath}`));
      }
    }
  });

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
  program.parse(process.argv);
}
