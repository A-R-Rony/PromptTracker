# 06: Verify the complete cache lifecycle across every Tool Scanner

**What to build:** Prove that the complete Prompt Lens cache lifecycle works through the public CLI for every supported authoritative Tool Scanner, and align all surviving documentation with the delivered behavior and domain language.

**Blocked by:** 01: Remove unsupported search and misleading RAM presentation; 03: Incrementally synchronize authoritative agent records; 04: Give users bounded and controllable Cached Content; 05: Safely migrate legacy JSON spill files.

**Status:** complete

- [x] One public-CLI acceptance suite runs against isolated Claude, Codex, OpenCode, Antigravity, and Kiro fixtures and an isolated Prompt Lens database.
- [x] The suite covers first ingestion, unchanged rescans, new and changed Sessions, deleted authoritative Sessions, lazy Turn loading, and process restarts.
- [x] The suite covers detail viewing or its CLI-accessible equivalent and full-fidelity Exported Transcript generation without eagerly loading unrelated Turn bodies.
- [x] The suite covers default and configured retention, least-recently-accessed eviction, full-content caching disabled, cache status, and cache clear.
- [x] The suite covers successful, failed, interrupted, and repeated legacy JSON migration.
- [x] The suite confirms that list and analytics operations use metadata behavior and remain correct when full Turn content is absent.
- [x] The suite confirms that full-text search is absent and that date, project, and scope navigation remain supported.
- [x] The suite confirms that no primary interface or documentation presents Cached Content as RAM or promises a strict process-memory ceiling.
- [x] Tests assert external commands, output, exported content, persisted state, and lifecycle outcomes rather than private method calls or incidental SQL layout.
- [x] Narrow unit tests remain only for deterministic retention ordering, source-change comparison, schema migration, and malformed legacy-record cases that would be ambiguous at the CLI seam.
- [x] Current product documentation uses Session, Turn, Normalized Session, Token Metrics, Exported Transcript, and Cached Content consistently with the domain glossary.
- [x] Documentation explains that agent records are authoritative, Prompt Lens SQLite is disposable, and deleting a source Session removes it from Prompt Lens after reconciliation.
- [x] Documentation tells users to create an Exported Transcript before deleting an authoritative source when they need permanent retention.
- [x] Documentation discloses local plaintext storage, supported cache controls, default limits, and the absence of application-managed encryption or cloud synchronization.
- [x] Older specifications and architectural decisions with incompatible JSON-spillover, SQLite-persistence, search, streaming, or strict-memory claims are corrected, deprecated, or explicitly superseded.
- [x] The full repository build and test suite pass with generated artifacts rebuilt from maintained sources.

