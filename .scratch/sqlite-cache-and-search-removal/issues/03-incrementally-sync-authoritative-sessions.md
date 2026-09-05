# 03: Incrementally synchronize authoritative agent records

**What to build:** Keep the derived SQLite cache synchronized with authoritative Claude, Codex, OpenCode, Antigravity, and Kiro records. New and changed Sessions are ingested, unchanged Sessions are skipped, and Sessions removed from their source are reconciled out of Prompt Lens.

**Blocked by:** 02: Introduce the rebuildable SQLite Session cache.

**Status:** ready-for-agent

- [ ] Claude, Codex, OpenCode, Antigravity, and Kiro are each represented by an isolated authoritative-source fixture in integration tests.
- [ ] Source state records a stable source identity plus modification time and size, using a content fingerprint where those signals cannot safely detect changes.
- [ ] A first scan indexes discovered Sessions and makes their metadata available to normal CLI operations.
- [ ] A repeated scan skips unchanged source records and produces identical user-visible totals without duplication.
- [ ] New source Sessions appear after an incremental scan.
- [ ] Changed source Sessions replace stale metadata and content after an incremental scan.
- [ ] When an authoritative Session disappears, reconciliation removes both its cached metadata and full Turn content.
- [ ] Prompt Lens does not retain unique historical telemetry after every authoritative copy of a Session disappears.
- [ ] When only cached Turn content was evicted but its authoritative Session remains, opening or exporting the Session can rehydrate it from the source and recache it when enabled.
- [ ] OpenCode's existing SQLite database is read strictly as an OpenCode-owned source and remains separate from the Prompt Lens cache database.
- [ ] Missing source tools, unavailable source locations, and malformed changed records produce bounded, actionable behavior without corrupting unrelated cached Sessions.
- [ ] Integration tests cover first, repeated, new, changed, deleted, and rehydrated Session scenarios across process restarts.
