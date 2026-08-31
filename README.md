# 🔥 PromptTracker

> **Universal AI Coding Prompt & Token Usage Telemetry Tracker**  
> Automatically aggregate, analyze, and visualize prompt history, token burn, model costs, and conversation transcripts across Google Antigravity, Claude Code, OpenAI Codex, Kiro IDE, and OpenCode.

[![CI](https://github.com/A-R-Rony/PromptTracker/actions/workflows/ci.yml/badge.svg)](https://github.com/A-R-Rony/PromptTracker/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/prompttracker.svg)](https://www.npmjs.com/package/prompttracker)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

---

## ⚡ Quick Start

Run instantly without installation:
```bash
npx prompttracker
```

Or install globally:
```bash
npm install -g prompttracker
```

Launch the interactive Web Dashboard:
```bash
prompttracker ui
```

---

## ✨ Features

- **Multi-Tool Pluggable Scanners**: Automatically discovers and aggregates sessions from:
  - 🤖 **Google Antigravity IDE** (`~/.gemini/antigravity-ide/brain/`)
  - 🟣 **Anthropic Claude Code** (`~/.claude/`)
  - 🟢 **OpenAI Codex / ChatGPT CLI** (`~/.codex/`, `~/.chatgpt/`)
  - 🟡 **Kiro IDE** (`~/.kiro/workspaces/`)
  - 🔴 **OpenCode** (`~/.opencode/sessions/`)
- **Dynamic 24h Model Pricing**: Non-blocking background sync with the **OpenRouter Live Model Registry** (`https://openrouter.ai/api/v1/models`) supporting 300+ models with zero-downtime offline fallback.
- **Strict 50MB RAM Ceiling & Disk Spillover**: Enforces a tight memory footprint with lazy rehydration on demand.
- **Smart Directory Scoping**: Automatically detects your current working directory and filters sessions to the active repository.
- **Date Filtering**: Slice telemetry by exact dates (`--date 2026-08-31`), relative horizons (`--since 7d`, `--since 30d`), or interactive TUI presets (*Today*, *Yesterday*, *Last 7 Days*, *Last 30 Days*, *Custom*).
- **Full Un-truncated Transcripts**: Export Markdown conversations with collapsible `<details>` tool invocations and 1-click IDE launch.
- **Modern Glassmorphic Web Dashboard**: Built with React + Vite featuring real-time KPIs, daily spend bar charts, spend-by-model progress bars, and split-screen conversation explorer.

---

## 💻 CLI Command Reference

### 1. Default Project Scoping (Smart CWD)
When run without flags, `prompttracker` automatically inspects your **Current Working Directory (CWD)** and filters sessions to the active repository (including monorepo subfolders like `packages/` or `src/`):
```bash
# Scan sessions for the current project
prompttracker
```

### 2. Machine-Wide Global View (`-a, --all`)
To view all AI coding sessions recorded across all repositories and directories on your computer:
```bash
# Scan everything across your entire filesystem
prompttracker --all
```

### 3. Date & Time Filtering (`--date`, `--since`, `--until`)
Slice and dice your prompt telemetry by exact calendar dates or relative horizons:
```bash
# View today's prompt activity
prompttracker --date today

# View yesterday's activity across all projects
prompttracker --all --date yesterday

# View activity from the last 7 or 30 days
prompttracker --since 7d
prompttracker --since 30d

# Custom date range (e.g. August 2026)
prompttracker --since 2026-08-01 --until 2026-08-31
```

### 4. Explicit Project Filtering (`-p, --project <name>`)
Search sessions matching a specific project name or folder substring:
```bash
# Filter by project name
prompttracker --project LeetCode
prompttracker --project PromptTracker
```

### 5. Script & CI Automation (`-n, --no-interactive`)
Output telemetry cards directly to stdout without launching the interactive prompt selector:
```bash
# Clean summary output for scripts or logs
prompttracker --no-interactive
prompttracker --all --since 7d --no-interactive
```

---

### 📋 CLI Options Quick Reference Table

| Option | Shorthand | Description | Example |
| :--- | :--- | :--- | :--- |
| `[default]` | — | Smart CWD: Auto-filters to active project folder | `prompttracker` |
| `--all` | `-a` | Global scan across entire filesystem | `prompttracker -a` |
| `--project <name>`| `-p` | Filter sessions by project name or directory path | `prompttracker -p LeetCode` |
| `--date <date>` | `-d` | Filter by exact date or preset (`today`, `yesterday`, `YYYY-MM-DD`) | `prompttracker -d today` |
| `--since <val>` | — | Filter on or after relative interval (`7d`, `30d`) or date | `prompttracker --since 7d` |
| `--until <val>` | — | Filter up to specific date (`YYYY-MM-DD`) | `prompttracker --until 2026-08-31` |
| `--no-interactive`| `-n` | Print summary cards without interactive TUI | `prompttracker -n` |
| `--help` | `-h` | Display all available commands and flags | `prompttracker --help` |

---

## 🏗️ Monorepo Architecture

```
PromptTracker/
├── packages/
│   ├── core/         # Domain types, dynamic pricing engine, 50MB RAM storage manager, exporter
│   ├── scanners/     # Multi-tool pluggable scanner engine (Antigravity, Claude, Codex, Kiro, OpenCode)
│   ├── cli/          # Global CLI binary (prompttracker / promptburn) with interactive TUI & date filter
│   ├── server/       # Express REST API (/api/sessions, /api/summary, /api/open-session)
│   └── web/          # Glassmorphic React + Vite dashboard bundled into server/public
├── data/
│   └── pricing.json  # Public CDN / GitHub fallback pricing registry
├── docs/
│   ├── SPEC.md       # Complete production specification
│   └── adr/          # Architectural Decision Records (0001 - 0004)
├── lessons/          # Engineering lessons (01 - 06)
└── .github/          # CI/CD Workflows (ci.yml, release.yml)
```

---

## 🧪 Running Tests

Run the full monorepo test suite across all packages:
```bash
pnpm test
```

---

## 📜 License

MIT © [Abdur Rony](https://github.com/A-R-Rony)
