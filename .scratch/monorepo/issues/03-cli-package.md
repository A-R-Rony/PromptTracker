# 03: Standalone CLI Package & Interactive TUI

**What to build:**
Create `packages/cli` as an installable global binary (`npm install -g prompttracker`) with Commander argument parsing, date filtering (`--date`, `--since`, `--until`), Chalk summary cards, interactive Prompts TUI, and Markdown transcript exporter (`exportSessionToMarkdown`).

**Blocked by:** 01-core-types-and-storage.md, 02-scanners-engine.md

**Status:** ready-for-agent

- [ ] Implement `prompttracker` CLI command router with default `scan` action and smart CWD project scoping.
- [ ] Implement date filtering and preset menus (*Today*, *Yesterday*, *Last 7 Days*, *Last 30 Days*, *Custom Range*).
- [ ] Implement `exportSessionToMarkdown` with full model responses, collapsible `<details>` tool calls, and auto IDE launch.
- [ ] Verify globally via `npm link` or `bin` execution.
