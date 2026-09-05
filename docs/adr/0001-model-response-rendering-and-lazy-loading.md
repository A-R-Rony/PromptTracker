# 1. Model Response Rendering & Two-Tier Lazy Loading

> The response-rendering decision remains active. Memory guarantees and the original loading implementation are superseded by ADR 0005.

We decided to preserve full, un-truncated model responses and tool executions in exported Markdown transcripts while using a two-tier metadata indexing strategy to prevent high memory usage during CLI scanning.

## Context
AI coding assistants produce large session logs containing detailed explanations, generated code diffs, and tool invocations. Displaying raw JSONL logs directly to developers causes poor readability due to JSON escaping and tool schema noise. Conversely, truncating model responses early in the scanning pipeline permanently loses context needed for retrospectives. Furthermore, loading thousands of full historical sessions into memory during CLI startup risks high memory consumption.

## Decision
1. **Full Un-Truncated Markdown Transcripts**: When generating an Exported Transcript (`.md`), include the complete developer prompt, entire model response, and formatted tool calls, accompanied by a metadata link to the raw source file on disk.
2. **Two-Tier Loading (Metadata-First)**: Scanners index session metadata (date, project, token counts, cost, turn count, source file path) at startup with minimal RAM overhead (~1KB/session). Complete turn-by-turn text and model responses are loaded lazily on-demand when a developer selects a Session in the CLI or Web UI.
3. **Terminal Preview Boundaries**: The Terminal UI (TUI) displays a concise preview (200-300 characters) to avoid scrollback flooding, while the full content is accessible via the IDE Markdown export.

## Consequences
- **Memory Efficiency**: Metadata-first loading reduces the amount of full Turn content retained during ordinary navigation; it is not a strict process-memory guarantee.
- **Developer Experience**: Developers get clean, syntax-highlighted, full-fidelity conversation transcripts inside their preferred IDE without losing access to original raw files.
