# PromptTracker

Universal developer telemetry and prompt analytics engine for AI coding assistants.

## Language

### Core Domain

**Session**:
A single conversation or task lifecycle between a developer and an AI assistant tool.
_Avoid_: Chat, thread, ticket, interaction

**Turn**:
A single round-trip unit within a Session, consisting of one developer prompt and the corresponding assistant response and tool actions.
_Avoid_: Message, prompt-response pair, step

**Tool Scanner**:
A pluggable extractor responsible for locating, parsing, and normalizing raw session files from a specific AI coding assistant (e.g. Antigravity IDE, Claude Code).
_Avoid_: Parser, scraper, watcher, crawler

**Normalized Session**:
The standardized in-memory and persisted representation of a Session with consistent metadata, token counts, and turn schemas across all tools.
_Avoid_: Clean data, raw session, unified model

**Token Metrics**:
The quantified token usage breakdown (input tokens, output tokens, cached tokens, and total).
_Avoid_: Usage stats, character count

**Exported Transcript**:
A human-readable Markdown document generated from a Session containing the full prompt history and un-truncated model responses for IDE viewing.
_Avoid_: Export file, dump, log copy
