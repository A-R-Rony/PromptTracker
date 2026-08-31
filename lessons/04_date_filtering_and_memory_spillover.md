# Engineering Lesson 04: Date Filtering & Dynamic Memory Spillover Architecture

> **Target Audience**: Engineers building production-ready CLI tools handling time-series queries and memory safety bounds on large local datasets.

---

## 1. What We Built

In this milestone, we addressed two critical real-world requirements:
1. **Date-Based Telemetry Scoping**: Filter work by exact date (`--date 2026-08-31`), relative timeframes (`--since 7d`), or interactive TUI calendar presets (*Today*, *Yesterday*, *Last 7 Days*, *Last 30 Days*, *Custom Range*).
2. **Memory Threshold & Disk Spillover (`SessionStorageManager`)**: Prevent RAM exhaustion when thousands of long LLM conversations are scanned.

---

## 2. How Date Filtering Works (`src/dateFilter.ts`)

### A. Relative Expression Parsing (`parseRelativeDate`)
Developers often want to query relative intervals rather than typing exact dates:
- `"today"` $\rightarrow$ Midnight of current local date.
- `"yesterday"` $\rightarrow$ Midnight of yesterday.
- `"7d"` / `"30d"` $\rightarrow$ Current timestamp minus $(N \times 24 \times 60 \times 60 \times 1000)$ milliseconds.
- `"YYYY-MM-DD"` $\rightarrow$ Exact ISO date instance.

### B. Two-Layer UX Integration
1. **Direct CLI Flags**:
   ```bash
   npm run scan -- --date 2026-08-31
   npm run scan -- --since 7d
   npm run scan -- --since 2026-08-01 --until 2026-08-15
   ```
2. **Interactive TUI Preset Picker**:
   When launching `npm run scan`, the top menu item is:
   ```text
   [Project: PromptTracker | All Dates] Select session or action:
   ❯ 📅 Change Date Filter (Current: All Dates)
     2026-08-31 | antigravity | PromptTracker  [prototype] | 24,465 tok
   ```
   Selecting `📅 Change Date Filter` lets you instantly switch date presets with arrow keys or enter a custom date range without restarting the CLI.

---

## 3. Dynamic Memory Spillover (`src/storage.ts`)

### The Architecture Problem:
In Node.js, storing full prompt responses (which can include multi-thousand-line code diffs) across 1,000+ sessions could consume several gigabytes of RAM.

### The Solution: Two-Tier Storage Manager (`SessionStorageManager`)

```
                          [ Incoming Session ]
                                    │
                                    ▼
                 [ SessionStorageManager.manageSessionMemory() ]
                                    │
                     Is (currentRAM + sessionBytes) > 50MB?
                                    │
                 ┌──────────────────┴──────────────────┐
                 │                                     │
               [ NO ]                                [ YES ]
                 ▼                                     ▼
        Keep full turns in RAM            1. Write full turns JSON to
                                             ~/.prompttracker/cache/<id>.json
                                          2. In RAM: keep lightweight summary turns
                                             (first 300 chars of prompts & responses)
```

### On-Demand Rehydration (`loadFullTurns`):
When a developer chooses a session from the list:
```typescript
sel.turns = storageManager.loadFullTurns(sel);
```
If the session was spilled to disk, it lazily rehydrates the full payload in milliseconds only for the active session being exported or inspected.

---

## 4. How to Verify

From `d:\PetProjects\PromptTracker\prototype`:

```bash
# 1. Filter by relative 7 days
npm run scan -- --since 7d

# 2. Filter by exact date
npm run scan -- --date 2026-08-31

# 3. Interactive date selection
npm run scan
# -> Choose "📅 Change Date Filter"
```
