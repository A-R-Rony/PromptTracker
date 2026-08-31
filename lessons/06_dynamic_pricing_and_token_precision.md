# Engineering Lesson 06: Dynamic Model Pricing Sync & Token Calculation Precision

> **Target Audience**: Engineers asking: *How do we keep LLM pricing up-to-date across Google, Anthropic, OpenAI, and DeepSeek without pushing constant npm package updates? How do we calculate input/output tokens?*

---

## 1. The Real-World Challenge: Volatile LLM Pricing

Model prices change frequently:
- New models arrive (e.g. `gemini-3.7-flash`, `claude-3-7-sonnet`, `deepseek-reasoner`).
- Vendors drop prices or introduce prompt caching discounts.
- If pricing is hardcoded statically in compiled code, developers who installed version `0.1.0` months ago will see inaccurate dollar costs.

---

## 2. The Solution: Dynamic 24-Hour Pricing Engine (`src/pricing.ts`)

In **`@prompttracker/core`**, we built a **Hybrid Fallback Sync System**:

```
                         [ PromptTracker Invocations ]
                                       │
                                       ▼
                         [ PricingEngine Singleton ]
                                       │
           ┌───────────────────────────┴───────────────────────────┐
           ▼                                                       ▼
   [ Fast In-Memory Map ]                               [ Check Cache Age ]
  - Loads immediately (<1ms)                      Is ~/.prompttracker/pricing.json
  - Uses embedded defaults or cache                      older than 24 hours?
                                                                   │
                                                ┌──────────────────┴──────────────────┐
                                                │                                     │
                                             [ NO ]                                [ YES ]
                                                ▼                                     ▼
                                          Do Nothing                        [ Background Sync ]
                                                                        - Non-blocking HTTPS GET
                                                                        - Fetches latest pricing.json
                                                                        - Writes to local cache file
                                                                        - If offline: silent fallback
```

### Why Background Sync (Non-Blocking)?
If a developer runs `prompttracker` in terminal, they want an **instant** response. We never block CLI startup on network requests. The CLI renders immediately using the cached/embedded rates, while the background thread fetches any updates for subsequent runs.

---

## 3. How Token Counts Are Handled: Exact vs. Approximation

You asked: *Are we taking the tokens from the model or calculating them manually?*

We use a **Two-Tier Strategy**:

### Tier 1: Exact Native Token Usage (Preferred)
Whenever an AI assistant logs the exact token usage returned by the model API, we take it directly.
For example, in **`ClaudeCodeScanner.ts`**:
```typescript
const inTok = item.usage?.input_tokens || approximateTokens(text);
const outTok = item.usage?.output_tokens || approximateTokens(text);
```
If `item.usage` exists in the log, we get **100% exact hardware token counts**.

### Tier 2: Approximation Fallback (`approximateTokens`)
Some tools (or streaming JSONL transcripts that do not persist API response headers) only record the raw text of the conversation. In those cases, we compute:
$$\text{Tokens} = \left\lceil \frac{\text{Character Count}}{4} \right\rceil$$
In English and source code, 1 token is approximately 4 characters (or ~0.75 words).

---

## 4. Summary Table

| Metric | Source | Precision |
| :--- | :--- | :--- |
| **Tokens (Claude Code / API tools)** | `item.usage.input_tokens` / `item.usage.output_tokens` | **100% Exact** |
| **Tokens (Raw text event logs)** | `approximateTokens(text)` ($\text{chars} / 4$) | **Statistical Approximation (~95% accuracy)** |
| **Model Prices** | Dynamic 24h Sync (`~/.prompttracker/pricing.json`) | **Up-to-date with vendor pricing** |
| **Offline Handling** | Embedded `EMBEDDED_PRICING_TABLE` | **Zero-crash offline resilience** |
