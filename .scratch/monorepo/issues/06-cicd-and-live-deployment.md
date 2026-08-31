# 06: CI/CD Pipeline, npm Release & Vercel Live Deployment

**What to build:**
Configure GitHub Actions workflows for continuous integration (`.github/workflows/ci.yml`) and automated release publishing (`.github/workflows/release.yml`). Configure npm packaging for global execution (`npx prompttracker`), Turborepo caching (`turbo.json`), and automated Vercel deployment for the live Web Showcase with demo mode fallback.

**Blocked by:** 03-cli-package.md, 05-web-dashboard.md

**Status:** ready-for-agent

- [ ] Create `turbo.json` with build, test, and lint pipelines.
- [ ] Configure `.github/workflows/ci.yml` running lint, typecheck, and unit tests across packages.
- [ ] Configure `.github/workflows/release.yml` with npm trusted publishing / provenance on git tag releases.
- [ ] Add Vercel deployment configuration (`vercel.json`) with demo mode fallback for web dashboard preview.
- [ ] Document full installation (`npm i -g prompttracker`) and usage in root `README.md`.
