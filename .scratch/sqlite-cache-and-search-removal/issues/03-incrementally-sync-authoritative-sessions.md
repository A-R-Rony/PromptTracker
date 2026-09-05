# 03: Incrementally synchronize authoritative agent records

**What to build:** Keep the derived SQLite cache synchronized with authoritative Claude, Codex, OpenCode, Antigravity, and Kiro records. New and changed Sessions are ingested, unchanged Sessions are skipped, and Sessions removed from their source are reconciled out of Prompt Lens.

**Blocked by:** 02: Introduce the rebuildable SQLite Session cache.

**Status:** complete

- [x] Claude, Codex, OpenCode, Antigravity, and Kiro are each represented by an isolated authoritative-source fixture in integration tests.
- [x] Source state records a stable source identity plus modification time and size, using a content fingerprint where those signals cannot safely detect changes.
- [x] A first scan indexes discovered Sessions and makes their metadata available to normal CLI operations.
- [x] A repeated scan skips unchanged source records and produces identical user-visible totals without duplication.
- [x] New source Sessions appear after an incremental scan.
- [x] Changed source Sessions replace stale metadata and content after an incremental scan.
- [x] When an authoritative Session disappears, reconciliation removes both its cached metadata and full Turn content.
- [x] Prompt Lens does not retain unique historical telemetry after every authoritative copy of a Session disappears.
- [x] When only cached Turn content was evicted but its authoritative Session remains, opening or exporting the Session can rehydrate it from the source and recache it when enabled.
- [x] OpenCode's existing SQLite database is read strictly as an OpenCode-owned source and remains separate from the Prompt Lens cache database.
- [x] Missing source tools, unavailable source locations, and malformed changed records produce bounded, actionable behavior without corrupting unrelated cached Sessions.
- [x] Integration tests cover first, repeated, new, changed, deleted, and rehydrated Session scenarios across process restarts.
