# 03: Standalone CLI Package & Interactive TUI

**What to build:**
Create `packages/cli` as an installable global binary (`npm install -g prompttracker`) with Commander argument parsing, date filtering (`--date`, `--since`, `--until`), Chalk summary cards, interactive Prompts TUI, and Markdown transcript exporter (`exportSessionToMarkdown`).

**Blocked by:** 01-core-types-and-storage.md, 02-scanners-engine.md

**Status:** ready-for-agent

- [x] Implement `prompttracker` CLI command router with default `scan` action and smart CWD project scoping.
- [x] Implement date filtering and preset menus (*Today*, *Yesterday*, *Last 7 Days*, *Last 30 Days*, *Custom Range*).
- [x] Implement `exportSessionToMarkdown` with full model responses, collapsible `<details>` tool calls, and auto IDE launch.
- [x] Verify globally via `npm link` or `bin` execution.
