# 2. Date Filtering & Two-Tier Navigation

> **Status Note**: The date-filtering decision remains active. The original 50MB RAM threshold and JSON spillover design described in this document have been explicitly superseded by ADR 0005 (Local SQLite Session Cache With Explicit Retention) and must not be interpreted as a process-memory guarantee.

We implemented flexible date filtering (CLI flags and interactive TUI presets) along with two-tier Session loading to allow developers to navigate historical prompts without loading every complete Turn body simultaneously.

## Context
As developers use PromptTracker / Prompt Lens across days and months:
1. They need to analyze telemetry for specific dates (e.g. today's work, last 7 days, or a sprint date range).
2. Loading thousands of un-truncated AI coding conversations simultaneously during terminal execution could cause UI sluggishness and high memory consumption.

## Decision
1. **Multi-Mode Date Filtering**:
   - **CLI Flags**: `--date YYYY-MM-DD`, `--since 7d`, `--since 30d`, `--until YYYY-MM-DD`.
   - **Interactive TUI Selector**: `📅 Change Date Filter` option embedded at the top of the session list with quick presets (*Today*, *Yesterday*, *Last 7 Days*, *Last 30 Days*, *All Time*, *Custom Range*).
2. **Two-Tier Session Loading (Superseded by ADR 0005)**:
   - Metadata (ID, project, date, turn count, token counts, cost) is indexed and available for instant list navigation.
   - Complete Turn text and model responses are loaded lazily when a Session is inspected or exported.
   - Storage and eviction of Turn bodies are managed by SQLite according to explicit retention policies (see ADR 0005).

## Consequences
- Developers have granular control over date scoping both from terminal scripts and the interactive TUI.
- Navigation remains responsive across large historical session sets without eager loading of unneeded conversation bodies.

