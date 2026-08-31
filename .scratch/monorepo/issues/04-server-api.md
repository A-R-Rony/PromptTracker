# 04: Express REST API & Web Server

**What to build:**
Create `packages/server` providing local REST API endpoints (`/api/sessions`, `/api/summary`, `/api/open-session`) with in-memory 10s caching, static file serving, and cross-platform IDE launcher.

**Blocked by:** 01-core-types-and-storage.md, 02-scanners-engine.md

**Status:** ready-for-agent

- [x] Implement Express server in `packages/server`.
- [x] Implement `GET /api/sessions` with `force=true` query refresh.
- [x] Implement `GET /api/summary` calculating daily summaries, tool aggregates, and model spend breakdown.
- [x] Implement `POST /api/open-session` to export Markdown transcript and trigger editor launch.
