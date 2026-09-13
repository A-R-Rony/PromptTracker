# Specification: PromptTracker Production Monorepo & Live Deployment

## Problem Statement
Developers work across multiple AI coding assistants (Google Antigravity IDE, Claude Code, OpenAI Codex/ChatGPT, Kiro, OpenCode, Cursor, Cline) across multiple repositories daily. However:
1. They have zero centralized visibility into what prompts they wrote, how many tokens were consumed, or what it cost.
2. Every tool stores session logs in proprietary directories and disparate formats (`.jsonl`, `.json`, nested workspace UUIDs).
3. Starting a new session or retrospective requires manually hunting through filesystem directories.
4. Telemetry engines can become sluggish if thousands of historical Turns are held in memory at once.
5. Developers need a zero-configuration global tool (`npx prompt-lens` or `npm i -g prompt-lens`) as well as a live online web demo to explore telemetry features before installing.

## Solution
PromptTracker / Prompt Lens is a **local-first developer telemetry and prompt analytics engine** with dual distribution (global npm CLI + live web showcase):
1. Ingests all local AI assistant coding sessions without requiring cloud accounts or tracking tokens.
2. Normalizes disparate session formats into unified Sessions, Turns, and Token Metrics.
3. Provides a fast, interactive Terminal UI (TUI) and an aesthetic Glassmorphic Web Dashboard.
4. Preserves full, un-truncated model responses and tool executions in Exported Transcripts for IDE review.
5. Uses two-tier Session loading so navigation does not require every complete Turn body at once.
6. Maintains a disposable derived SQLite index and cache for instant navigation and bounding Cached Content.
7. Deploys a live interactive web showcase to Vercel with mock telemetry data and publishes versioned packages to npm.

## User Stories

1. As a developer, I want to run `npx prompt-lens` anywhere without prior installation to inspect current project prompts.
2. As a developer, I want running `prompt-lens` in any terminal to automatically filter AI sessions for my current project.
3. As a developer, I want to filter sessions by date presets (*Today*, *Yesterday*, *Last 7 Days*, *Last 30 Days*, *All Time*, *Custom Range*) so I can see what I accomplished today or this sprint.
4. As a developer, I want to filter sessions across all global repositories on my computer using `--all`.
5. As a developer, I want to filter sessions across any project name or path using `--project <name>`.
6. As a developer, I want to inspect a session turn-by-turn in my terminal to review user prompts and model responses.
7. As a developer, I want to click "Open in IDE" to generate a formatted `.md` Exported Transcript with full un-truncated model responses and collapsible tool calls, and immediately open it in VS Code.
8. As a developer, I want to launch an interactive web dashboard via `prompt-lens ui` to view charts, daily spend trends, tool breakdowns, and split-screen conversation readers.
9. As a developer, I want the tool to navigate large Session histories without loading every complete Turn body at once.
10. As a developer, I want to see token metrics (input, output, cache read, total) and estimated dollar costs per session and aggregated across tools.
11. As a developer, I want to inspect and manage the local disposable cache via `prompt-lens cache status`, `cache clear`, and `cache migrate`.
12. As a prospective user, I want to visit the live web demo on Vercel to explore sample telemetry charts and conversation readers before installing locally.
13. As a maintainer, I want pushing a release tag to automatically trigger GitHub Actions to run tests, publish to npm with provenance, and deploy the web demo to Vercel.

## Cache Lifecycle & Storage Policy

1. **Authoritative Sources vs Disposable Derived Cache**:
   - The original session files produced by AI assistants (Claude Code, OpenAI Codex, OpenCode, Antigravity IDE, Kiro) remain the authoritative source of truth.
   - Prompt Lens uses an embedded SQLite database (`~/.prompttracker/data.db`) purely as a disposable derived cache and index.
   - When an authoritative source session is deleted or modified, Prompt Lens reconciles the cache on subsequent scans: deleted source sessions are removed from Prompt Lens's index and cache.
   - Users who need permanent archiving must generate an **Exported Transcript** (`prompt-lens export <sessionId>`) before deleting the authoritative source session.

2. **Cached Content & Retention**:
   - Turn bodies held in SQLite are managed as **Cached Content** with a default retention limit of 30 days and 250 MB, evicting least-recently-accessed content first while preserving Session metadata.
   - Users can configure retention limits or disable full-content caching entirely via `~/.prompttracker/config.json`.
   - Cached Content is stored locally in plaintext without application-managed encryption or cloud synchronization.

## Implementation Decisions

### Monorepo Architecture (npm/pnpm Workspaces)
```
PromptTracker/
├── packages/
│   ├── core/           # Normalized schemas, SQLite storage engine, pricing matrix, cache management
│   ├── scanners/       # Pluggable scanners (Antigravity, Claude, Codex, Kiro, OpenCode)
│   ├── cli/            # Commander CLI binary (prompt-lens) + Prompts TUI
│   ├── server/         # Express REST API (/api/sessions, /api/summary, /api/open-session)
│   └── web/            # Modern Glassmorphic Web Dashboard (React + Vite + Vanilla CSS)
├── .github/
│   └── workflows/
│       ├── ci.yml      # Typecheck, lint, and unit tests on pull requests
│       └── release.yml # Automated npm publish (provenance) & Vercel deployment
├── docs/
│   ├── adr/            # Architectural Decision Records (0001-0005)
│   └── SPEC.md         # This technical specification
├── pnpm-workspace.yaml # Workspace definitions
└── CONTEXT.md          # Domain glossary
```

### Seams & Boundaries
1. **Tool Scanner Seam**: All assistant extractors implement `ToolScanner` returning `Promise<NormalizedSession[]>`.
2. **Storage Seam**: `SessionStorageManager` separates compact Session navigation metadata from complete Turn bodies loaded lazily for inspection or export.
3. **Transport Seam**: `NormalizedSession` schema is the shared contract between Core, Scanners, CLI, REST API, and Web UI.
4. **Distribution Seam**:
   - CLI package published to npm under `prompt-lens` (with aliases `promptlens`, `prompttracker`, `promptburn`).
   - Web package build deployed to Vercel/Netlify with demo mode fallback when running disconnected from local backend.

## Testing Decisions
- **Unit Tests**: Test each Scanner against fixture `.jsonl`, `.json`, and database logs to verify Turn extraction, token calculation, and CWD detection.
- **Storage & Retention Tests**: Test that SQLite migrations, LRU eviction, and `SessionStorageManager` correctly store, evict, and rehydrate Turn bodies.
- **Acceptance Tests**: Full public-CLI acceptance test suite exercising all 5 Tool Scanners, incremental sync, process restarts, Exported Transcripts, cache lifecycle, and scope navigation.
- **E2E / Browser Smoke Tests**: Test Web Dashboard KPIs and split-screen conversation reader.

## Out of Scope
- Arbitrary full-text search across complete historical prompt transcripts (navigation is powered by date, project, and scope filtering).
- Cloud synchronization of private developer prompt history (strictly local-first).
- Live intercepting / proxying LLM network traffic (Prompt Lens ingests local logs produced by the tools).

