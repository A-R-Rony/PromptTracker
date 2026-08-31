# 4. Dynamic 24-Hour Model Pricing Sync & Token Ingestion Priority

We implemented dynamic 24-hour background model pricing synchronization (`PricingEngine`) with offline embedded fallback, alongside a two-tier token counting priority strategy.

## Context
AI model pricing evolves rapidly as providers (Google, Anthropic, OpenAI, DeepSeek) release new models and discount existing inference rates. Hardcoding prices statically in compiled binaries risks delivering outdated cost estimates to developers. Furthermore, different AI coding tools log telemetry with varying levels of precision—some log exact token usage headers, while others only store raw conversational text.

## Decision
1. **Dynamic Background Pricing Sync**:
   - The `@prompttracker/core` package ships with an `EMBEDDED_PRICING_TABLE` providing immediate, zero-latency offline pricing.
   - When PromptTracker runs, `PricingEngine` checks if the local cache file (`~/.prompttracker/pricing.json`) is older than 24 hours.
   - If stale, it initiates a non-blocking asynchronous HTTP GET to the canonical remote pricing registry (`data/pricing.json` on GitHub/CDN) and refreshes the cache without blocking the CLI or Web UI.
   - If the developer is offline or the network fails, PromptTracker silently falls back to the embedded/cached rates.
2. **Token Ingestion Priority**:
   - **Tier 1 (Exact Native Usage)**: Scanners extract exact hardware token counts directly from tool metadata whenever available (e.g., Claude Code's `usage.input_tokens` and `usage.output_tokens`).
   - **Tier 2 (Approximation Fallback)**: When a tool (like raw JSONL event streams) omits usage counters, `approximateTokens` calculates tokens based on character length ($\lceil \text{characters} / 4 \rceil$).

## Consequences
- Developers get continually updated dollar estimations without requiring constant npm package updates.
- Token accuracy is preserved at 100% precision for tools that record exact usage, with robust fallback for tools that do not.
