import { Command } from 'commander';
import chalk from 'chalk';
import open from 'open';
import prompts from 'prompts';
import * as path from 'path';
import { exec } from 'child_process';
import { ScannerRegistry } from './scanners';
import { createServer } from './server';
import { NormalizedSession } from './types';
import { exportSessionToMarkdown } from './exporter';
import { filterSessionsByDate, DateFilterOptions } from './dateFilter';
import { SessionStorageManager } from './storage';

const program = new Command();
const storageManager = new SessionStorageManager(50); // Legacy content budget until SQLite cache replacement.

program
  .name('prompttracker')
  .description('Universal AI Coding Prompt & Token Usage Tracker')
  .version('0.1.0');

function openMarkdownInIDE(filePath: string) {
  const cmd = process.platform === 'win32' ? 'start "" "' + filePath + '"' : 'open "' + filePath + '"';
  exec(cmd, (err) => {
    if (err) {
      exec('code "' + filePath + '"');
    }
  });
}

function placeholderPath(p: string): string {
  return p.replace(/\\/g, '/');
}

async function showInteractiveMenu(
  allSessions: NormalizedSession[],
  currentSessions: NormalizedSession[],
  scopeLabel: string,
  dateLabel: string
) {
  const items = currentSessions.slice(0, 25).map((s) => {
    const pathHint = s.projectPath ? ' [' + path.basename(s.projectPath) + ']' : '';
    return {
      title: `${s.date} | ${s.toolSource.padEnd(11)} | ${s.projectName.slice(0, 28).padEnd(30)}${pathHint} | ${s.totalTokens.total.toLocaleString()} tok`,
      value: s
    };
  });

  // Action / Filter choices at top
  const choices = [
    { title: `📅 Change Date Filter (Current: ${dateLabel})`, value: '__filter_date__' },
    ...items
  ];

  const response = await prompts({
    type: 'select',
    name: 'selection',
    message: `[${scopeLabel} | ${dateLabel}] Select session or action:`,
    choices,
    initial: 1
  });

  if (!response.selection) return;

  if (response.selection === '__filter_date__') {
    const dateChoice = await prompts({
      type: 'select',
      name: 'preset',
      message: 'Choose a date filter preset:',
      choices: [
        { title: '⚡ Today', value: 'today' },
        { title: '⏮️ Yesterday', value: 'yesterday' },
        { title: '📊 Last 7 Days', value: '7d' },
        { title: '🗓️ Last 30 Days', value: '30d' },
        { title: '🌐 All Time', value: 'all' },
        { title: '✏️ Custom Date Range (YYYY-MM-DD)', value: 'custom' }
      ]
    });

    if (!dateChoice.preset) {
      await showInteractiveMenu(allSessions, currentSessions, scopeLabel, dateLabel);
      return;
    }

    if (dateChoice.preset === 'custom') {
      const customInput = await prompts([
        {
          type: 'text',
          name: 'since',
          message: 'Start Date (Since YYYY-MM-DD or leave blank):'
        },
        {
          type: 'text',
          name: 'until',
          message: 'End Date (Until YYYY-MM-DD or leave blank):'
        }
      ]);
      const res = filterSessionsByDate(allSessions, { since: customInput.since, until: customInput.until });
      await showInteractiveMenu(allSessions, res.filtered, scopeLabel, res.label);
      return;
    }

    const res = filterSessionsByDate(allSessions, { preset: dateChoice.preset });
    await showInteractiveMenu(allSessions, res.filtered, scopeLabel, res.label);
    return;
  }

  const sel = response.selection as NormalizedSession;
  // Ensure full turns are loaded if they were spilled to disk
  sel.turns = storageManager.loadFullTurns(sel);

  console.log(chalk.cyan.bold('\n---------------------------------------------------------------------------------------'));
  console.log(chalk.yellow.bold('Project/Topic: ') + sel.projectName);
  if (sel.projectPath) console.log(chalk.yellow.bold('Project Path: ') + placeholderPath(sel.projectPath));
  console.log(chalk.yellow.bold('Tool: ') + sel.toolSource + ' | ' + chalk.yellow.bold('Date: ') + sel.date + ' | ' + chalk.yellow.bold('Model: ') + sel.model);
  console.log(chalk.yellow.bold('Tokens: ') + sel.totalTokens.total.toLocaleString() + ' | ' + chalk.yellow.bold('Est. Cost: $') + sel.estimatedCostUsd.toFixed(4));
  console.log(chalk.cyan.bold('---------------------------------------------------------------------------------------\n'));

  for (const t of sel.turns) {
    console.log(chalk.green.bold(['📑 [Turn #', t.turnIndex, '] (', t.tokens.input, ' input tokens):'].join('')));
    console.log(chalk.white(t.userPrompt) + '\n');
    if (t.assistantSummary || t.assistantResponse) {
      console.log(chalk.magenta.bold(['🤭 [Model Response] (', t.tokens.output, ' output tokens):'].join('')));
      console.log(chalk.gray(t.assistantSummary || t.assistantResponse?.slice(0, 300)) + '\n');
    }
  }

  const actionResp = await prompts({
    type: 'select',
    name: 'action',
    message: 'What would you like to do next?',
    choices: [
      { title: '🔥 Open formatted conversation (.md) in IDE / Editor', value: 'open' },
      { title: '🕙 Back to Sessions List', value: 'back' },
      { title: '▪ Exit', value: 'exit' }
    ]
  });

  if (actionResp.action === 'open') {
    const mdPath = exportSessionToMarkdown(sel);
    console.log(chalk.green('\n🔥 Launching IDE / Editor with formatted session: ' + mdPath + '\n'));
    openMarkdownInIDE(mdPath);
  } else if (actionResp.action === 'back') {
    await showInteractiveMenu(allSessions, currentSessions, scopeLabel, dateLabel);
  }
}

async function runScan(options: {
  all?: boolean;
  project?: string;
  date?: string;
  since?: string;
  until?: string;
  noInteractive?: boolean;
}) {
  console.log(chalk.cyan.bold('\n🔥 Scanning local AI coding sessions...\n'));
  const registry = new ScannerRegistry();
  let rawSessions = await registry.scanAll();

  // Pass through Memory Manager for threshold check and disk spillover
  for (const s of rawSessions) {
    storageManager.manageSessionMemory(s);
  }

  let scopeLabel = 'All Projects';
  const cwd = placeholderPath(process.cwd());
  const cwdName = path.basename(cwd);

  let sessions = rawSessions;

  if (options.project) {
    const q = options.project.toLowerCase();
    sessions = sessions.filter(s =>
      (s.projectPath && s.projectPath.toLowerCase().includes(q)) ||
      s.projectName.toLowerCase().includes(q)
    );
    scopeLabel = 'Project: ' + options.project;
  } else if (!options.all) {
    const parentDir = placeholderPath(path.resolve(cwd, '..'));
    const parentName = path.basename(parentDir);

    const matched = rawSessions.filter(s => {
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
      scopeLabel = 'Project: ' + (cwdName === 'prototype' ? parentName : cwdName);
    } else {
      scopeLabel = 'All Projects (Global)';
    }
  }

  // Apply Date Filtering
  const dateFilterOpts: DateFilterOptions = {
    date: options.date,
    since: options.since,
    until: options.until
  };
  const { filtered: dateFilteredSessions, label: dateLabel } = filterSessionsByDate(sessions, dateFilterOpts);

  if (dateFilteredSessions.length === 0) {
    console.log(chalk.yellow(`No sessions found for ${scopeLabel} matching date filter (${dateLabel}).`));
    return;
  }

  let totalTokens = 0;
  let totalCost = 0;
  let totalPrompts = 0;

  for (const s of dateFilteredSessions) {
    totalTokens += s.totalTokens.total;
    totalCost += s.estimatedCostUsd || 0;
    totalPrompts += s.turns.length;
  }

  const memStats = storageManager.getMemoryUsageSummary();

  console.log(chalk.bold(`[${scopeLabel} | ${dateLabel}]`));
  console.log(
    chalk.bold('USAGE SUMMARY:') + '  ' +
    chalk.yellow('Prompts: ' + totalPrompts) + ' | ' +
    chalk.cyan('Tokens: ' + totalTokens.toLocaleString()) + ' | ' +
    chalk.green('Cost: $' + totalCost.toFixed(4)) + ' | ' +
    chalk.gray(`Memory: ${memStats.currentMb}/${memStats.maxMb}MB (${memStats.spilledCount} spilled)`) + '\n'
  );

  if (options.noInteractive !== true) {
    await showInteractiveMenu(sessions, dateFilteredSessions, scopeLabel, dateLabel);
  }
}

program
  .option('-a, --all', 'Scan all global projects and sessions')
  .option('-p, --project <name>', 'Filter by specific project name or path')
  .option('-d, --date <YYYY-MM-DD>', 'Filter by exact date (YYYY-MM-DD)')
  .option('--since <date_or_relative>', 'Filter sessions on or after date (e.g. 7d, 30d, 2026-08-01)')
  .option('--until <date>', 'Filter sessions up to date (YYYY-MM-DD)')
  .option('-n, --no-interactive', 'Disable interactive selector')
  .action(runScan);

program
  .command('scan')
  .description('Scan AI coding sessions with smart date and project filtering')
  .option('-a, --all', 'Scan all global projects and sessions')
  .option('-p, --project <name>', 'Filter by specific project name or path')
  .option('-d, --date <YYYY-MM-DD>', 'Filter by exact date (YYYY-MM-DD)')
  .option('--since <date_or_relative>', 'Filter sessions on or after date (e.g. 7d, 30d, 2026-08-01)')
  .option('--until <date>', 'Filter sessions up to date (YYYY-MM-DD)')
  .option('-n, --no-interactive', 'Disable interactive selector')
  .action(runScan);

program
  .command('ui')
  .description('Launch the interactive Web Dashboard')
  .option('-p, --port <number>', 'Port to run on', '4321')
  .action(async (options: { port: string }) => {
    const port = parseInt(options.port, 10);
    const app = createServer();

    app.listen(port, () => {
      const url = 'http://localhost:' + port;
      console.log(chalk.green.bold('\n🔥 PromptBurn Dashboard running at: ' + chalk.underline(url) + '\n'));
      open(url).catch(() => {});
    });
  });

program.parse(process.argv);
