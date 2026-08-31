# PromptBurn — Project Status & Session Handover Summary

> **Date**: August 31, 2026  
> **Project Name**: PromptBurn (Universal AI Coding Prompt & Token Usage Tracker)  
> **Repository Root**: `D:\PetProjects\PromptTracker`  
> **Prototype Working Directory**: `D:\PetProjects\PromptTracker\prototype`

---

## 1. Executive Summary & Vision

PromptBurn is an open-source, local-first developer telemetry and productivity tool. It gives developers full visibility into what prompts they sent across multiple AI coding assistants, how many tokens were consumed, estimated dollar costs, and date-wise project session logs.

### Key Pain Points Solved:
1. **Multi-Tool Fragmentation**: Developers use Antigravity IDE, OpenAI Codex / ChatGPT CLI, Kiro IDE, OpenCode, Claude Code, Cursor, and Copilot simultaneously without unified tracking.
2. **Token & Spend Blindspots**: Token usage and pricing are scattered across various vendor portals.
3. **Session & Prompt Recall**: Developers forget past prompts, prompt chains, and context used across days and projects.

---

## 2. Supported Tools & Scanners Matrix

| Tool / Assistant | Storage Path Ingested | Parser Implementation | Status |
| :--- | :--- | :--- | :--- |
| **Google Antigravity IDE** | `~/.gemini/antigravity-ide/brain/*/logs/transcript.jsonl` | `AntigravityScanner.ts` (Parses `<USER_REQUEST>`, model turns, tool calls, and auto-detects `Cwd` project path) | ✅ Verified (Ingested 450+ real prompts, 2.4M+ tokens) |
| **OpenAI Codex / ChatGPT CLI** | `~/.codex/sessions/*.json`, `~/.chatgpt/history.json` | `CodexScanner.ts` | ✅ Integrated |
| **Kiro IDE** | `~/.kiro/workspaces/*/sessions.json` | `KiroScanner.ts` | ✅ Integrated |
| **OpenCode** | `~/.opencode/sessions/*.json` | `OpenCodeScanner.ts` | ✅ Integrated |
| **Claude Code** | `~/.claude/projects/*/transcripts/*.jsonl` | `ClaudeCodeScanner.ts` | ✅ Integrated |
| **Cursor / Copilot / Cline / Roo** | `.cursor/`, `.cline/` | Future Monorepo Phase | 📋 Architected |

---

## 3. Working Prototype Architecture & Deliverables

The prototype in `D:\PetProjects\PrompotTracker\prototype` is fully operational with TypeScript:

```
D:\PetProjects\PrompotTracker\
├── docs\
│   └── ARCHITECTURE.md                  # Comprehensive monorepo technical design
├── prototype\
│   ├── public\
│   │   └── index.html                   # Glassmorphic Web Dashboard (Split Conversation Viewer)
│   ├── src\
│   │   ├── scanners\
│   │   │   ├── AntigravityScanner.ts    # Antigravity JSONL parser with project extraction
│   │   │   ├── CodexScanner.ts          # OpenAI Codex / ChatGPT scanner
│   │   │   ├── KiroScanner.ts           # Kiro IDE workspace scanner
│   │   │   ├── OpenCodeScanner.ts       # OpenCode session scanner
│   │   │   ├── ClaudeCodeScanner.ts     # Claude Code CLI scanner
│   │   │   └── index.ts                 # Unified Scanner Registry
│   │   ├── server\
│   │   │   └── index.ts                 # Express REST API (/api/sessions, /api/summary, /api/open-session)
│   │   ├── types\
│   │   │   └── index.ts                 # Normalized data types (NormalizedSession, PromptTurn, TokenMetrics)
│   │   ├── cli.ts                       # Interactive TUI Menu + Project Scoping CLI
│   │   ├── exporter.ts                  # Formatted Markdown chat exporter for IDE viewing
│   │   └── pricing.ts                   # Token approximation and model pricing calculation
│   ├── package.json
│   └── tsconfig.json
└── PROJECT_SUMMARY.md                   # Complete summary document
```

---

## 4. Key Features Implemented & Tested

### 1. Smart Project-Specific Filtering
- **Default Auto-Detection**: Running `npm run scan` inside any project folder (e.g. `prototype` or any Git repository) automatically detects the working directory and filters sessions belonging to that project.
- **Global Overview**: `npm run scan -- --all` lists all global sessions across all projects.
- **Explicit Project Search**: `npm run scan -- --project "<name>"` matches by project name or workspace path.

### 2. Interactive Terminal UI (TUI)
- Run `npm run scan` to launch an interactive terminal menu using arrow keys.
- Selecting a session displays turn-by-turn prompts, token metrics per turn, and assistant responses.

### 3. Clean Markdown Conversation View in IDE
- When choosing **"🚀 Open in IDE / Editor"** from either the CLI or Web Dashboard, PromptBurn automatically converts the raw JSONL session into a formatted Markdown document (`~/.promptburn/exports/YYYY-MM-DD_tool_session.md`) and opens it directly in VS Code / native editor.

### 4. Interactive Web Dashboard
- Run `npm run ui` (default: `http://localhost:4321`).
- Glassmorphic UI with KPI cards (Total Tokens, Prompts, Estimated Cost, Active Tools).
- Split-screen conversation reader with searchable session list and one-click IDE launch button.

---

## 5. How to Run & Verify

```bash
# Navigate to prototype
cd D:\PetProjects\PrompotTracker\prototype

# 1. Run Project-Scoped CLI Scan (Interactive Menu)
npm run scan

# 2. Run Global CLI Scan (All Projects on Machine)
npm run scan -- --all

# 3. Launch Web Dashboard
npm run ui
```

---

## 6. Next Steps for Production Monorepo

When transitioning from prototype to full-scale production:
1. **Scaffold Turborepo / pnpm Workspace**:
   - `packages/core`: Unified scanner engine, normalization schemas, and pricing matrix.
   - `packages/cli`: Standalone global binary (`npm install -g promptburn`).
   - `packages/web`: React + Tailwind + Vite desktop web dashboard.
   - `packages/daemon`: Background filesystem watcher (`chokidar`) with SQLite / DuckDB persistence.
2. **Custom IDE Deep-Linking**: Support URI schemes (`vscode://...`, `cursor://...`, `antigravity://...`) to directly open chat windows where supported.
3. **Weekly / Monthly Analytics & PDF/CSV Export**: Spend trends, model breakdown graphs, and prompt export for team retrospectives.
