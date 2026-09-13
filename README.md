# 🔍 PromptLens (`prompt-lens`)

> **Universal AI Coding Prompt & Token Usage Telemetry Tracker**  
> Automatically aggregate, analyze, and navigate prompt history, token burn, model costs, and conversation transcripts across Google Antigravity, Anthropic Claude Code, OpenAI Codex, Kiro IDE, and OpenCode in a modern terminal UI.

[![CI](https://github.com/A-R-Rony/PromptTracker/actions/workflows/ci.yml/badge.svg)](https://github.com/A-R-Rony/PromptTracker/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@ar_rony1/prompt-lens.svg)](https://www.npmjs.com/package/@ar_rony1/prompt-lens)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

---

## ⚡ Quick Start

Run instantly with zero installation from anywhere:
```bash
npx @ar_rony1/prompt-lens
```

Or install globally:
```bash
npm install -g @ar_rony1/prompt-lens
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
- **Two-Tier Session Loading**: Keeps compact Session information available for navigation and loads complete Turns only when needed.
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

# Force a full rescan of all local transcripts and refresh metadata
prompt-lens -r
# (or prompt-lens --rescan)

# Filter by date or specific project
prompt-lens -p my-project
prompt-lens --since 7d
```

#### TUI Hotkeys:
| Key | Screen | Action |
| :--- | :--- | :--- |
| `↑` / `↓` or `j` / `k` | List & Detail | Scroll through sessions or conversation turns |
| `Enter` | Sessions List | Open selected session conversation turns |
| `Enter` / `o` | Detail View | Launch full conversation `.md` in VS Code / IDE |
| `1` - `5` | Sessions List | Instant date filter presets (`1: Today`, `2: Yesterday`, `3: 7D`, `4: 30D`, `5: All`) |
| `a` | Sessions List | Toggle between current project scope and global filesystem |
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

# Stats for last 7 days or exact date
prompt-lens stats --since 7d
prompt-lens stats -d 2026-09-13
```

---

### 3. Tabular List & Scripting (`list`)
Export or pipe session telemetry directly into CLI scripts or `jq`:
```bash
# Clean ASCII table
prompt-lens list

# Raw JSON output
prompt-lens list --json | jq .

# Filtered list
prompt-lens list -a --since 30d
```

---

### 4. Session Export (`export`)
Export a session transcript to formatted Markdown or JSON:
```bash
# Export latest session to Markdown
prompt-lens export

# Export specific session to a target file
prompt-lens export <sessionId> --format md --out ./session-summary.md
prompt-lens export <sessionId> --format json --out ./session.json
```

---

### 5. Cache Management (`cache`)
Inspect and manage the local disposable SQLite cache:
```bash
# View Cached Content size, session count, and configured limits
prompt-lens cache status
prompt-lens cache status --json

# Force a full rescan of all authoritative source transcripts
prompt-lens cache rescan

# Safely clear cached full Turn content while preserving Session metadata
prompt-lens cache clear

# Explicitly migrate legacy JSON spill files (~/.prompttracker/cache/*.json) to SQLite
prompt-lens cache migrate
```


---

## 🔒 Local Storage, Privacy & Retention Policy

- **Disposable Derived Cache**: Prompt Lens uses an embedded SQLite database (`~/.prompttracker/data.db`) purely as a disposable derived cache and index. The original log files produced by Claude Code, OpenAI Codex, OpenCode, Antigravity IDE, and Kiro remain authoritative.
- **Source Reconciliation**: When an authoritative source session is deleted, Prompt Lens automatically removes its metadata and Cached Content on the next reconciliation scan.
- **Permanent Archival**: If you need permanent archival before deleting authoritative source session logs from your machine, create a standalone **Exported Transcript** (`prompt-lens export <sessionId> --format md`).
- **Local Plaintext Storage**: Cached prompts and responses are stored strictly locally in plaintext inside Prompt Lens's SQLite database and are **never transmitted** over the network by cache management or normal CLI operations. The database and containing directory receive restrictive permissions (`0700`/`0600`) on supported platforms.

You can configure retention policies or disable full-content caching entirely by creating `~/.prompttracker/config.json`:
```json
{
  "cache": {
    "fullContent": true,
    "maxAgeDays": 30,
    "maxBytes": 262144000
  }
}
```
When `fullContent` is set to `false`, Prompt Lens indexes Session metadata, token usage, and analytics without caching conversation Turn bodies.

---

## 🧠 Why Do We Load Sessions in Two Tiers?

When indexing developers' local coding assistants (like Antigravity, OpenCode, Claude Code, and Codex), conversation logs accumulate **hundreds of megabytes of raw JSON/JSONL transcripts** with large code completions and tool call payloads.

Loading every historical response at once can make a terminal application slow and memory-heavy. Prompt Lens therefore keeps compact Session information available for navigation and can place larger Turn bodies in its local cache. Selecting or exporting a Session restores its complete Turns when available.

This is a content-management strategy, not a measurement or guarantee of the Node.js process's RAM usage.

---


## 🏗️ Architecture

```
PromptTracker/
├── packages/
│   ├── core/         # Domain models, pricing engine, Session storage, Markdown exporter
│   ├── scanners/     # Multi-tool pluggable scanner engine (Antigravity, Claude, Codex, Kiro, OpenCode)
│   ├── cli/          # Standalone prompt-lens binary with Ink TUI, stats, list, and export
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
