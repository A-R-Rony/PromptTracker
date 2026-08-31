# Primary Source Research: AI Assistant Storage Schemas & Failure Modes

> **Objective**: Conduct deep primary source research across **Claude Code**, **OpenAI Codex CLI**, and **Kiro IDE** on the host environment to ensure scanners remain 100% resilient and avoid regex/structural failure modes (such as greedy model string captures or missed subdirectories).

---

## 1. OpenAI Codex CLI Primary Source Findings

### Storage Discovery on Real System
- **Path**: `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl` and `~/.codex/session_index.jsonl`
- **Previous Scanner Blindspot**:
  - The previous scanner only checked for `.json` files directly inside `~/.codex/sessions/`, missing the nested `YYYY/MM/DD/rollout-*.jsonl` hierarchy.
- **Data Format & Model Specification**:
  - Rollout files are multi-line JSON Lines (`.jsonl`).
  - Session metadata line: `{"type": "session_meta", "payload": { "session_id": "...", "cwd": "..." }}`.
  - Model specification line: `{"type": "turn_context", "model": "gpt-5.6-terra"}`.
  - Messages: `{"type": "response_item", "payload": { "type": "message", "role": "user" | "assistant", "content": [...] }}`.
  - Token usage: Recorded in `token_usage` payloads and event messages.

### Hardening Strategy
1. Recursively traverse `~/.codex/sessions/` for `*.jsonl` as well as flat `*.json`.
2. Parse `turn_context` lines for exact model names (`gpt-5.6-terra`, `gpt-4o`, `o3-mini`).
3. Extract `cwd` from `session_meta.payload.cwd` for accurate project scoping.

---

## 2. Claude Code Primary Source Findings

### Storage Discovery on Real System
- **Path**: `~/.claude/sessions/` and `~/.claude/projects/`
- **Data Format & Model Specification**:
  - Multi-line JSONL streams.
  - Model field: `item.model` or `item.model_name` (e.g. `anthropic/claude-3-7-sonnet-20250219`).
  - Usage headers: `item.usage.input_tokens` and `item.usage.output_tokens`.
- **Potential Failure Modes**:
  - In some CLI versions, `model` strings contain dated snapshot suffixes (e.g., `claude-3-7-sonnet-20250219`).
  - `item.content` can be either a raw string or an array of content blocks `[{ type: "text", text: "..." }]`.

### Hardening Strategy
1. Add array-safe content block unpacker: `Array.isArray(item.content) ? item.content.map(c => c.text || '').join('\n') : item.content`.
2. Clean snapshot suffixes and provider prefixes: `claude-3-7-sonnet-20250219` $\rightarrow$ `claude-3-7-sonnet`.

---

## 3. Kiro IDE Primary Source Findings

### Storage Discovery & Schema
- **Path**: `~/.kiro/workspaces/*/sessions.json` or `~/.kiro/sessions/*.json`
- **Data Format & Model Specification**:
  - Array of workspace session objects or key-value dictionary.
  - Model field: `sess.model`, `sess.config.model`, or `sess.settings.model`.
  - Prompts & Responses: `sess.history` or `sess.messages` with `{ prompt, response }` or `{ role, content }`.

### Hardening Strategy
1. Support both array format (`[ { history: [...] } ]`) and object map format (`{ sessions: { ... } }`).
2. Support both `sess.history` and `sess.messages`.

---

## 4. Summary of Scanner Hardening Matrix

| Scanner | Discovered Primary Path | Model Extraction Seam | Content Extraction Seam |
| :--- | :--- | :--- | :--- |
| **Antigravity** | `~/.gemini/antigravity-ide/brain/*/logs/transcript.jsonl` | Phrase boundary regex terminating at `\s*\([^)]*\)` | Clean `<USER_REQUEST>` tag stripper |
| **OpenCode** | `~/.local/share/opencode/opencode.db` | Native SQLite `session.model` column | Native SQLite `message` + `part` table join |
| **Codex** | `~/.codex/sessions/**/*.jsonl` | `turn_context.model` or `payload.model` | `response_item.payload.content` + `cwd` |
| **Claude Code** | `~/.claude/**/*.jsonl` | `item.model` with snapshot suffix stripping | String or `content[]` array block parsing |
| **Kiro** | `~/.kiro/**/*.json` | `sess.model` / `sess.config.model` | `history[]` or `messages[]` fallback |
