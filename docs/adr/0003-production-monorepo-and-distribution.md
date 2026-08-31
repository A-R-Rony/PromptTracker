# 3. Production Monorepo Toolchain, SQLite Persistence, and Dual Distribution

We decided to structure PromptTracker as a pnpm + Turborepo monorepo with local SQLite persistence and dual distribution (CLI on npm registry and live web demo deployed to Vercel).

## Context
Transitioning PromptTracker from a prototype to a production product requires:
1. Fast, cached multi-package builds (`packages/core`, `scanners`, `cli`, `server`, `web`).
2. High-performance persistence that scales to hundreds of thousands of historical turns with sub-millisecond query latency.
3. Easy developer adoption via both zero-install CLI (`npx prompttracker`) and an online live web showcase on Vercel for new users to test.
4. Automated continuous delivery via GitHub Actions for testing, npm publishing with provenance, and web deployment.

## Decision
1. **Workspace Toolchain**: Use `pnpm` workspaces with `Turborepo` (`turbo.json`) for pipeline orchestration and incremental build/test caching.
2. **Persistence Engine**: Use embedded local SQLite (`~/.prompttracker/data.db`) managed by `packages/core`. This enables fast SQL aggregations, date indexing, and zero-RAM overhead when querying historical metrics.
3. **Dual Distribution & Deployment**:
   - **CLI**: Published to npm as `prompttracker` (also aliased to `promptburn`) with `bin` execution.
   - **Web Demo**: Deployed to Vercel via GitHub Actions with a standalone mock demo mode when disconnected from local servers.
4. **Automated CI/CD**: Pull requests run automated typecheck, linting, and unit tests. Pushing release tags automatically publishes the CLI to npm with provenance and deploys the latest dashboard to Vercel.

## Consequences
- The project has a clear separation of concerns across core logic, scanners, CLI, server, and web.
- Developers can run PromptTracker locally with zero cloud dependencies while new users can preview the dashboard online.
