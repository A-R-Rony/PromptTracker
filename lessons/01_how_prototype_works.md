# Engineering Guide: How PromptTracker CLI & Scanners Work

Welcome to the **PromptTracker / PromptBurn** codebase! As a senior software engineer mentoring you through your first CLI and developer telemetry project, this document breaks down the entire inner workings step-by-step.

---

## Table of Contents
1. [High-Level Architecture](#1-high-level-architecture)
2. [CLI Fundamentals: How Information is Displayed & Interactive](#2-cli-fundamentals-how-information-is-displayed--interactive)
3. [How We Extract Model & Session Info (The Scanner Pipeline)](#3-how-we-extract-model--session-info-the-scanner-pipeline)
4. [Token Estimation & Pricing Calculation](#4-token-estimation--pricing-calculation)
5. [How We Filter & Navigate to Specific Sessions](#5-how-we-filter--navigate-to-specific-sessions)
6. [Data Volume & Retention (In Terms of Days / Limits)](#6-data-volume--retention-in-terms-of-days--limits)
7. [Running the Commands & Troubleshooting Common Errors](#7-running-the-commands--troubleshooting-common-errors)

---

## 1. High-Level Architecture

PromptTracker is a **local-first telemetry engine**. It does not call any external web tracking APIs to record your prompts. Instead, it reads the local JSON/JSONL history files created natively by your AI coding tools (`Antigravity IDE`, `Claude Code`, `OpenCode`, `Codex`, `Kiro`), transforms them into a normalized format, and exposes them through both a Terminal UI (TUI) and an Express Web Dashboard.

```
+-----------------------------------------------------------------------------+
|                               LOCAL DISK                                    |
|  ~/.gemini/antigravity-ide/brain/*/logs/transcript.jsonl                    |
|  ~/.claude/projects/*/transcripts/*.jsonl                                   |
|  ~/.codex/sessions/*.json                                                   |
|  ~/.kiro/workspaces/*/sessions.json                                         |
+-----------------------------------------------------------------------------+
                                       │
                                       ▼
                     [ ScannerRegistry (scanners/index.ts) ]
                    Runs all registered ToolScanner instances
                                       │
                                       ▼
                       [ NormalizedSession[] Array ]
             Consistent schema across all AI coding assistants:
          (toolSource, projectName, projectPath, turns, tokens, cost)
                                       │
                     ┌─────────────────┴─────────────────┐
                     ▼                                   ▼
        [ CLI Engine (src/cli.ts) ]            [ Express API (server/index.ts) ]
     - Commander (Arguments & Flags)           - /api/sessions
     - Chalk (Colorized summary)               - /api/summary
     - Prompts (Interactive TUI Menu)          - Glassmorphic Web Dashboard
```

---

## 2. CLI Fundamentals: How Information is Displayed & Interactive

If you haven't built a CLI before, here is how the pieces fit together:

### A. Argument Parsing with `commander` (`src/cli.ts`)
`commander` defines commands (`scan`, `ui`), flags (`--all`, `--project`, `--no-interactive`), and descriptions:
```typescript
program
  .command('scan')
  .description('Scan AI coding sessions (scoped to current project by default)')
  .option('-a, --all', 'Scan all global projects and sessions')
  .option('-p, --project <name>', 'Filter by specific project name or path')
  .action(async (options) => { ... });
```
When you run `npm run scan -- --all`, `options.all` evaluates to `true`.

### B. Colorized Terminal Output with `chalk`
The terminal displays formatted and styled text using ANSI color escape codes wrapped by `chalk`:
- `chalk.cyan.bold(...)` -> Bright cyan title bars.
- `chalk.yellow(...)` -> Warnings or key metrics.
- `chalk.green(...)` -> Success messages and prompt turns.

### C. Interactive Selection Menus with `prompts`
Instead of just printing a static list, we use `prompts` to create an interactive arrow-key selector:
```typescript
const response = await prompts({
  type: 'select',
  name: 'session',
  message: '[Project] Select a prompt session to inspect or open in IDE:',
  choices: items, // Array of { title, value }
  initial: 0
});
```
When you press `Enter` on a session, the CLI displays the turn-by-turn prompts, input/output token counts, and assistant responses.

---

## 3. How We Extract Model & Session Info (The Scanner Pipeline)

Each AI coding assistant saves logs in different formats and locations. We implement a clean **Strategy Pattern** via the `ToolScanner` interface (`src/types/index.ts`):

```typescript
export interface ToolScanner {
  readonly name: string;
  scan(): Promise<NormalizedSession[]>;
}
```

### Example: Antigravity Scanner (`src/scanners/AntigravityScanner.ts`)
1. **Locates the Brain Directory**:
   `~/.gemini/antigravity-ide/brain/<conversation-id>/.system_generated/logs/transcript.jsonl`
2. **Parses Line by Line (JSON Lines)**:
   - Lines with `type: "USER_INPUT"` or `source: "USER_EXPLICIT"` are developer prompts.
   - Lines with `type: "PLANNER_RESPONSE"` or `source: "MODEL"` are assistant responses.
   - Lines with `tool_calls` containing `args.Cwd` or `args.TargetFile` reveal the **exact workspace path** where the conversation took place.
3. **Detects Model**:
   Defaults to `gemini-3.7-flash` (or extracts model identifier metadata from the transcript events if logged).
4. **Extracts User Prompts cleanly**:
   Filters out XML wrapper tags like `<USER_REQUEST>` so you see only the actual prompt you typed.

### Other Integrated Scanners:
- **`ClaudeCodeScanner`**: Scans `~/.claude/` for Claude Code JSONL transcripts and extracts token usage metadata directly from `usage.input_tokens` and `usage.output_tokens`.
- **`CodexScanner`**: Scans `~/.codex/` and `~/.chatgpt/history.json`.
- **`KiroScanner` & `OpenCodeScanner`**: Scans their respective workspace session JSON files.

---

## 4. Token Estimation & Pricing Calculation

Model pricing and token count approximations live in `src/pricing.ts`:

1. **Character-to-Token Ratio (`approximateTokens`)**:
   When an assistant log does not include exact token metrics, we calculate:
   $$\text{tokens} \approx \lceil \text{text.length} / 4 \rceil$$
   *(1 token $\approx$ 4 characters in English text / code)*.
2. **Pricing Engine (`estimateCost`)**:
   We look up the model in a pricing table (e.g. `gemini-3.7-flash` at \$0.15 / 1M input tokens and \$0.60 / 1M output tokens; `claude-3-7-sonnet` at \$3.00 / \$15.00) and calculate:
   $$\text{Cost} = \left(\frac{\text{Input Tokens}}{1,000,000} \times \text{Input Rate}\right) + \left(\frac{\text{Output Tokens}}{1,000,000} \times \text{Output Rate}\right)$$

---

## 5. How We Filter & Navigate to Specific Sessions

### Smart Auto-Detection (Default Behavior)
When you type `npm run scan` inside a project folder:
1. `process.cwd()` gets the current working directory path (e.g. `D:/PetProjects/PromptTracker`).
2. The CLI filters the scanned sessions to show **only** sessions that match the current project folder path or folder name.
3. If no match is found, it falls back gracefully to showing recent global sessions.

### Flags for Explicit Navigation:
- `npm run scan -- --all`: Lists all sessions across all repositories on your computer.
- `npm run scan -- --project "PromptTracker"`: Searches and filters by partial folder or project name.

### 🚀 "Open in IDE" Action (`src/exporter.ts`)
When inspecting a session in the TUI, choosing **"Open formatted conversation (.md) in IDE / Editor"**:
1. Generates a clean Markdown file in `~/.prompttracker/exports/YYYY-MM-DD_tool_session.md`.
2. Automatically triggers OS-native editor launch (`start` / `code <filePath>`).

---

## 6. Data Volume & Retention (In Terms of Days / Limits)

### How Much Data is Displayed?
1. **Interactive TUI Menu Limit**:
   In `src/cli.ts` (line 33), the interactive selector displays the **top 25 most recent sessions**:
   ```typescript
   const items = sessions.slice(0, 25).map((s) => ...);
   ```
2. **Web Dashboard (`npm run ui`)**:
   The web dashboard at `http://localhost:4321` returns **all** scanned sessions via `/api/sessions` and groups them by day into `DailySummary`.
3. **Date Range / Retention**:
   - **PromptTracker does not delete or purge history**. It reads whatever exists in your local tool directories.
   - For Antigravity IDE, transcript logs in `~/.gemini/antigravity-ide/brain/` persist across weeks and months unless manually cleared.
   - All scanned sessions are sorted chronologically with newest first:
     ```typescript
     results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
     ```

---

## 7. Running the Commands & Troubleshooting Common Errors

### Why did `npm run scan` fail when run from the root folder?
The root folder `D:\PetProjects\PromptTracker` is the repository root containing docs, skills, and configuration. The actual Node/TypeScript project lives in `prototype/`.

#### Correct Execution:
```bash
# 1. Navigate to the prototype directory
cd D:\PetProjects\PromptTracker\prototype

# 2. Run the interactive CLI scan
npm run scan

# 3. Scan all global projects on your machine
npm run scan -- --all

# 4. Launch the Web UI Dashboard
npm run ui
```
*(Tip: In a future monorepo phase, we can add a root-level `package.json` or Turborepo config so commands can be run seamlessly from anywhere!)*
