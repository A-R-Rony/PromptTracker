# 2. Date Filtering & Dynamic Memory Threshold Management

We implemented flexible date filtering (CLI flags and interactive TUI presets) along with a dynamic RAM threshold manager (`SessionStorageManager`) that spills large payloads to disk cache (`~/.prompttracker/cache/`) when memory limits are reached.

## Context
As developers use PromptTracker across days and months:
1. They need to analyze telemetry for specific dates (e.g. today's work, last 7 days, or a sprint date range).
2. Storing thousands of un-truncated AI coding conversations in RAM during terminal execution could cause heap bloat.

## Decision
1. **Multi-Mode Date Filtering**:
   - **CLI Flags**: `--date YYYY-MM-DD`, `--since 7d`, `--since 30d`, `--until YYYY-MM-DD`.
   - **Interactive TUI Selector**: `📅 Change Date Filter` option embedded at the top of the session list with quick presets (*Today*, *Yesterday*, *Last 7 Days*, *Last 30 Days*, *All Time*, *Custom Range*).
2. **Dynamic Memory Threshold & Disk Spillover**:
   - Fixed memory threshold (default 50MB RAM).
   - If accumulated turn payloads exceed the threshold, full turn bodies spill into `~/.prompttracker/cache/<session-id>.json`.
   - Lightweight metadata and summary strings remain in memory for instant list rendering.
   - When a session is selected to export or inspect, `loadFullTurns()` seamlessly rehydrates full turn text from disk.

## Consequences
- Developers have granular control over date scoping both from terminal scripts and interactive TUI.
- Memory usage is strictly bounded and safe for multi-year telemetry datasets.
