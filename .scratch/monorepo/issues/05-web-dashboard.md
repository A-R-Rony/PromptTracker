# 05: Modern Glassmorphic Web Dashboard

**What to build:**
Create `packages/web` using Vite + React with glassmorphic aesthetics, KPIs (Total Tokens, Prompts, Estimated Cost, Active Tools), interactive daily spend bar charts, searchable session list, and split-screen conversation reader.

**Blocked by:** 04-server-api.md

**Status:** ready-for-agent

- [ ] Scaffold React + Vite app in `packages/web` with glassmorphic CSS styling.
- [ ] Connect dashboard to `/api/summary` for KPIs and analytics charts.
- [ ] Connect split-screen conversation reader to `/api/sessions` with search and date filters.
- [ ] Integrate "Open in IDE" button triggering `/api/open-session`.
- [ ] Configure build pipeline to bundle static assets into `packages/server/public`.
