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

## 💻 CLI Usage

```bash
# Scan current repository sessions
prompttracker

# Scan all global sessions across the entire filesystem
prompttracker --all

# Filter by specific date or date range
prompttracker --date 2026-08-31
prompttracker --since 7d
prompttracker --since 2026-08-01 --until 2026-08-31

# Filter by project name
prompttracker --project MyAwesomeApp

# Non-interactive summary output (great for CI or scripts)
prompttracker --no-interactive
```

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
