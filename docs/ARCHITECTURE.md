# Production Architecture & Design Blueprint: PromptBurn / Universal AI Tracker

A local-first telemetry and intelligence hub for developers using multiple AI coding assistants (**Antigravity IDE, OpenAI Codex / ChatGPT, Kiro IDE, OpenCode, Claude Code, Cursor, Cline/Roo Code, Aider**).

---

## 1. System Vision & Non-Negotiables

1. **100% Privacy & Local-First**: No developer prompts or sensitive code snippets ever leave the developer machine.
2. **Zero-Config Passive Scanning**: Automatic ingestion from standard OS file paths (JSONL, SQLite, JSON, Markdown).
3. **Deep Navigation**: One-click opening from dashboard directly into the source IDE or conversation file.
4. **Rich Aesthetics**: Glassmorphic, dark-mode-first dashboard with instant search, date filters, and multi-model cost analytics.

---

## 2. Monorepo Structure (pnpm + 	urborepo)

`
D:\PetProjects\PrompotTracker\
├── apps\
│   ├── web\                      # Vite + React + Tailwind + Radix UI + Lucide
│   │   ├── src\
│   │   │   ├── components\       # KPI cards, charts, prompt drawers, search
│   │   │   ├── hooks\            # useSessions, useSummary, useFilters
│   │   │   └── App.tsx
│   │   └── package.json
│   │
│   └── cli\                      # Standalone CLI binary & embedded server
│       ├── src\
│       │   ├── commands\         # scan, ui, export, config, watch
│       │   └── index.ts
│       └── package.json
│
├── packages\
│   ├── core\                     # Core scanner engine, parser registry & normalizer
│   │   ├── src\
│   │   │   ├── adapters\         # Antigravity, Codex, Kiro, OpenCode, ClaudeCode, Cursor, Cline, Aider
│   │   │   ├── models\           # Pricing catalog & token counters
│   │   │   ├── store\            # SQLite incremental cache (better-sqlite3)
│   │   │   └── watcher\          # File system watcher (chokidar) for real-time tracking
│   │   └── package.json
│   │
│   └── types\                    # Shared TypeScript interfaces & contracts
│       ├── src\
│       │   └── index.ts
│       └── package.json
│
├── prototype\                    # Completed Proof of Concept
├── docs\                         # Architecture & RFC specifications
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
`

---

## 3. Core Engine Adapter Architecture

`mermaid
graph TD
    A1[Antigravity Logs] --> R[Scanner Registry]
    A2[OpenAI Codex & ChatGPT] --> R
    A3[Kiro IDE Sessions] --> R
    A4[OpenCode Sessions] --> R
    A5[Claude Code Projects] --> R
    A6[Cursor & VS Code Storage] --> R
    A7[Cline and Roo Storage] --> R
    W[File Watcher] --> R
    R --> N[Session Normalizer]
    N --> SQL[(Local SQLite Cache)]
    SQL --> CLI[CLI Scanner]
    SQL --> API[Embedded REST API]
    API --> Web[Web Dashboard]
`

---

## 4. Phased Implementation Roadmap

### Phase 1: Monorepo Foundation & Core Engine (packages/core, packages/types)
- Setup pnpm workspace and TypeScript configuration.
- Implement incremental SQLite caching (etter-sqlite3) tracking file hashes to ensure instantaneous queries.
- Build hardened adapters for **Antigravity IDE**, **OpenAI Codex**, **Kiro IDE**, **OpenCode**, **Claude Code**, and **Cursor**.
- Token and pricing catalog supporting latest 2026 models (Gemini 2.5/3.7, Claude 3.7 Sonnet, GPT-4o, o3-mini, DeepSeek-V3/R1).

### Phase 2: Production CLI & Background Daemon (pps/cli)
- Terminal commands: promptburn scan, promptburn ui, promptburn export --format csv|json.
- Live file watcher mode (promptburn watch) to stream incoming prompts in real-time.

### Phase 3: Modern Desktop Web Experience (pps/web)
- React + Vite + Tailwind glassmorphic UI.
- Interactive timeline, prompt full-text search, cost projection meters, and one-click IDE deep-linking.
