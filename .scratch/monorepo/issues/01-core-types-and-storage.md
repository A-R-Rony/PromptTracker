# 01: Core Architecture & Schema Types Package

**What to build:**
Scaffold the monorepo root workspace with `packages/core`, containing the canonical TypeScript domain types (`NormalizedSession`, `PromptTurn`, `TokenMetrics`, `DailySummary`, `ToolScanner`), token pricing engine (`approximateTokens`, `estimateCost`), and `SessionStorageManager` with 50MB RAM threshold and lazy disk rehydration.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] Initialize `packages/core` with `package.json` and `tsconfig.json`.
- [x] Export normalized domain types from `packages/core/src/types`.
- [x] Implement and unit test `pricing.ts` with model token estimation.
- [x] Implement and unit test `SessionStorageManager` with memory spillover to `~/.prompttracker/cache`.
