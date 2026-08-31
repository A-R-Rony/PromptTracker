# 02: Pluggable Scanners Engine

**What to build:**
Create `packages/scanners` containing the `ScannerRegistry` and modular scanner implementations (`AntigravityScanner`, `ClaudeCodeScanner`, `CodexScanner`, `KiroScanner`, `OpenCodeScanner`) that parse local transcripts into `NormalizedSession[]` with un-truncated model responses and tool call captures.

**Blocked by:** 01-core-types-and-storage.md

**Status:** ready-for-agent

- [ ] Implement `AntigravityScanner` for `~/.gemini/antigravity-ide/brain/` with CWD extraction.
- [ ] Implement `ClaudeCodeScanner` for `~/.claude/` transcripts with token usage mapping.
- [ ] Implement `CodexScanner`, `KiroScanner`, and `OpenCodeScanner`.
- [ ] Create test fixtures and unit tests verifying parsing accuracy across each scanner.
