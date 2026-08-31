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

const program = new Command();

program
  .name('prompttracker')
  .description('Universal AI Coding Prompt Tracker')
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

async function showInteractiveMenu(sessions: NormalizedSession[], scopeLabel: string) {
  const items = sessions.slice(0, 25).map((s) => {
    const pathHint = s.projectPath ? ' [' + path.basename(s.projectPath) + ']' : '';
    return {
      title: s.date + ' | ' + s.toolSource.padEnd(11) + ' | ' + s.projectName.slice(0, 30).padEnd(32) + pathHint + ' | ' + s.totalTokens.total.toLocaleString() + ' tok',
      value: s
    };
  });

  const response = await prompts({
    type: 'select',
    name: 'session',
    message: '[' + scopeLabel + '] Select a prompt session to inspect or open in IDE:',
    choices: items,
    initial: 0
  });

  if (!response.session) return;
  const sel = response.session as NormalizedSession;

  console.log(chalk.cyan.bold('\n---------------------------------------------------------------------------------------'));
  console.log(chalk.yellow.bold('Project/Topic: ') + sel.projectName);
  if (sel.projectPath) console.log(chalk.yellow.bold('Project Path: ') + placeholderPath(sel.projectPath));
  console.log(chalk.yellow.bold('Tool: ') + sel.toolSource + ' | ' + chalk.yellow.bold('Date: ') + sel.date + ' | ' + chalk.yellow.bold('Model: ') + sel.model);
  console.log(chalk.yellow.bold('Tokens: ') + sel.totalTokens.total.toLocaleString() + ' | ' + chalk.yellow.bold('Est. Cost: $') + sel.estimatedCostUsd.toFixed(4));
  console.log(chalk.cyan.bold('---------------------------------------------------------------------------------------\n'));

  for (const t of sel.turns) {
    console.log(chalk.green.bold(['📑 [Turn #', t.turnIndex, '] (', t.tokens.input, ' input tokens):'].join('')));
    console.log(chalk.white(t.userPrompt) + '\n');
    if (t.assistantSummary) {
      console.log(chalk.magenta.bold(['🤭 [Model Response] (', t.tokens.output, ' output tokens):'].join('')));
      console.log(chalk.gray(t.assistantSummary) + '\n');
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
    await showInteractiveMenu(sessions, scopeLabel);
  }
}


    
    
program
  .command('scan')
  .description('Scan AI coding sessions (scoped to current project by default)')
  .option('-a, --all', 'Scan all global projects and sessions')
  .option('-p, --project <name>', 'Filter by specific project name or path')
  .option('-n, --no-interactive', 'Disable interactive selector')
  .action(async (options: { all?: boolean; project?: string; noInteractive?: boolean }) => {
    console.log(chalk.cyan.bold('\n🔥 Scanning local AI coding sessions...\n'));
    const registry = new ScannerRegistry();
    let sessions = await registry.scanAll();

    let scopeLabel = 'All Projects';
    const cwd = placeholderPath(process.cwd());
    const cwdName = path.basename(cwd);

    if (options.project) {
      const q = options.project.toLowerCase();
      sessions = sessions.filter(s =>
        (s.projectPath && s.projectPath.toLowerCase().includes(q)) ||
        s.projectName.toLowerCase().includes(q)
      );
      scopeLabel = 'Project: ' + options.project;
    } else if (!options.all) {
      const matched = sessions.filter(s => 
        s.projectPath && (
          placeholderPath(s.projectPath).toLowerCase().includes(cwd.toLowerCase()) ||
          cwd.toLowerCase().includes(placeholderPath(s.projectPath).toLowerCase()) ||
          placeholderPath(s.projectPath).toLowerCase().includes(cwdName.toLowerCase())
        )
      );

      if (matched.length > 0) {
        sessions = matched;
        scopeLabel = 'Project: ' + cwdName;
      } else {
        scopeLabel = 'All Projects (Global)';
      }
    }

    if (sessions.length === 0) {
      console.log(chalk.yellow('No sessions found for ' + scopeLabel + '. Use --all to view all global sessions.'));
      return;
    }

    let totalTokens = 0;
    let totalCost = 0;
    let totalPrompts = 0;

    for (const s of sessions) {
      totalTokens += s.totalTokens.total;
      totalCost += s.estimatedCostUsd || 0;
      totalPrompts += s.turns.length;
    }

    console.log(chalk.bold('[' + scopeLabel + ']'));
    console.log(
      chalk.bold('USAGE SUMMARY:') + '  ' +
      chalk.yellow('Prompts: ' + totalPrompts) + ' | ' +
      chalk.cyan('Tokens: ' + totalTokens.toLocaleString()) + ' | ' +
      chalk.green('Cost: $' + totalCost.toFixed(4)) + '\n'
    );

    if (options.noInteractive !== true) {
      await showInteractiveMenu(sessions, scopeLabel);
    }
  });

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
