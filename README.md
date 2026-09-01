# 🔍 PromptLens (`prompt-lens`)

> **Universal AI Coding Prompt & Token Usage Telemetry Tracker**  
> Automatically aggregate, analyze, search, and navigate prompt history, token burn, model costs, and conversation transcripts across Google Antigravity, Anthropic Claude Code, OpenAI Codex, Kiro IDE, and OpenCode in a modern terminal UI.

[![CI](https://github.com/A-R-Rony/PromptTracker/actions/workflows/ci.yml/badge.svg)](https://github.com/A-R-Rony/PromptTracker/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/prompt-lens.svg)](https://www.npmjs.com/package/prompt-lens)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

---

## ⚡ Quick Start

Run instantly with zero installation:
```bash
npx prompt-lens
```

Or install globally:
```bash
npm install -g prompt-lens
```

Launch the interactive Terminal User Interface (TUI):
```bash
prompt-lens
# Aliases also supported: promptlens or prompttracker
```

---

## ✨ Features

- **Terminal-First Interactive TUI**: Built with React & Ink for a modern full-width developer experience with instant hotkeys and smooth navigation.
- **Multi-Tool Pluggable Scanners**: Automatically discovers and indexes AI sessions from:
  - 🤖 **Google Antigravity IDE** (`~/.gemini/antigravity-ide/brain/`)
  - 🟣 **Anthropic Claude Code** (`~/.claude/`)
  - 🟢 **OpenAI Codex / ChatGPT CLI** (`~/.codex/`, `~/.chatgpt/`)
  - 🟡 **Kiro IDE** (`~/.kiro/workspaces/`)
  - 🔴 **OpenCode** (`~/.local/share/opencode/opencode.db` and legacy `~/.opencode/sessions/`)
- **Accurate Model Tokens & Telemetry**: Distinguishes exact hardware telemetry from heuristic calculations with `Est.` indicators.
- **Strict 50MB RAM Threshold with Disk Spillover**: Guarantees lightweight CLI operation even with hundreds of megabytes of conversation logs.
- **Smart Directory Scoping**: Automatically scopes sessions to the active repository (including monorepo subfolders) with 1-key machine-wide toggle (`a`).
- **Instant Date Filter Pills**: Instant hotkeys (`1-5`) for *Today*, *Yesterday*, *Last 7 Days*, *Last 30 Days*, and *All Time*.
- **1-Click IDE Markdown Exporter**: Inspect turns in-terminal and press `Enter` or `o` to pop open the full formatted transcript in VS Code / default editor.

---

## 💻 CLI Commands & Subcommands

### 1. Interactive Terminal UI (Default)
```bash
# Launch interactive TUI scoped to current project
prompt-lens

# Launch interactive TUI for all projects machine-wide
prompt-lens -a
```

#### TUI Hotkeys:
| Key | Screen | Action |
| :--- | :--- | :--- |
| `↑` / `↓` or `j` / `k` | List & Detail | Scroll through sessions or conversation turns |
| `Enter` | Sessions List | Open selected session conversation turns |
| `Enter` / `o` | Detail View | Launch full conversation `.md` in VS Code / IDE |
| `1` - `5` | Sessions List | Instant date filter presets (`1: Today`, `2: Yesterday`, `3: 7D`, `4: 30D`, `5: All`) |
| `a` | Sessions List | Toggle between current project scope and global filesystem |
| `/` | Sessions List | Open live search filter |
| `b` / `Esc` | Detail View | Return back to Sessions List |
| `q` | Anywhere | Quit PromptLens |

---

### 2. Telemetry Analytics (`stats`)
Get an immediate breakdown of token burn, prompt count, and estimated cost grouped by tool source and model:
```bash
# Stats for current project
prompt-lens stats

# Stats machine-wide across all projects
prompt-lens stats -a
```

---

### 3. Fast Prompt & Response Search (`search`)
Search across all user prompts and assistant completions:
```bash
prompt-lens search "database migration"
prompt-lens search "refactor" -a
```

---

### 4. Tabular List & Scripting (`list`)
Export or pipe session telemetry directly into CLI scripts or `jq`:
```bash
# Clean ASCII table
prompt-lens list

# Raw JSON output
prompt-lens list --json | jq .
```

---

### 5. Session Export (`export`)
Export a session transcript to formatted Markdown or JSON:
```bash
# Export latest session to Markdown
prompt-lens export

# Export specific session to a target file
prompt-lens export <sessionId> --format md --out ./session-summary.md
prompt-lens export <sessionId> --format json --out ./session.json
```

---

## 🧠 Why Do We Track RAM Memory (50MB Threshold)?

When indexing developers' local coding assistants (like Antigravity, OpenCode, Claude Code, and Codex), conversation logs accumulate **hundreds of megabytes of raw JSON/JSONL transcripts** with large code completions and tool call payloads.

Loading all historical sessions into Node.js heap memory at once would cause high memory usage, sluggish terminal response, or `JavaScript heap out of memory` errors.

To solve this, `prompt-lens` employs a **50MB RAM Threshold with Disk Spillover**:
1. **Lightweight In-Memory Index**: Session headers, token counts, and 1-line summaries are kept in RAM for instant search and instant UI sorting.
2. **Disk Spillover**: When memory consumption approaches the 50MB ceiling, heavy turn bodies and multiline responses are spilled to a local cache directory (`~/.prompttracker/cache/`).
3. **Lazy Rehydration**: When you select a session to inspect or export, full turn details are streamed lazily from disk in milliseconds without ever consuming excess RAM.

This keeps `prompt-lens` lightning fast (<100ms startup) with a negligible memory footprint.

---

## 🏗️ Architecture

```
PromptTracker/
├── packages/
│   ├── core/         # Domain models, pricing engine, 50MB RAM storage manager, markdown exporter
│   ├── scanners/     # Multi-tool pluggable scanner engine (Antigravity, Claude, Codex, Kiro, OpenCode)
│   ├── cli/          # Standalone prompt-lens binary with Ink TUI, stats, search, list, and export
│   ├── server/       # Express REST API (paused for standalone CLI release)
│   └── web/          # React + Vite dashboard (paused for standalone CLI release)
├── docs/
│   └── SPEC.md       # Product & architectural specification
└── .github/          # CI/CD workflows
```

---

## 🧪 Running Tests

```bash
npm test
```

---

## 📜 License

MIT © [Abdur Rony](https://github.com/A-R-Rony)
