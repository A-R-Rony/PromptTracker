# Replace Misleading RAM Spillover With a Local SQLite Cache and Remove Search

**Status:** ready-for-agent

## Problem Statement

Prompt Lens currently displays `RAM: <value>/50MB`, but that value is only an estimate of selected Turn strings retained by the storage manager. It excludes process memory, scanner allocations, Session metadata, previews, UI state, and rehydrated Turns, so users may reasonably mistake it for a real memory ceiling. The documentation reinforces that misunderstanding by promising strict memory bounds and streaming behavior that the implementation does not provide.

The current spillover mechanism writes full Turn content into persistent JSON files without retention, cache management, safe identifiers, or a clear privacy contract. Meanwhile, project documentation describes a Prompt Lens SQLite database that does not exist in the implementation; SQLite is currently used only to read OpenCode's source database.

Prompt Lens also exposes full-text search in the terminal, CLI, and web experiences even though search is no longer part of the product. Terminal search can inspect only truncated previews for spilled Sessions, whereas CLI search rehydrates every Session and can cause substantial disk I/O and memory use.

## Solution

Remove full-text search from every supported Prompt Lens interface while retaining date, project, and scope navigation filters. Remove the main-interface RAM indicator and expose cache diagnostics through dedicated cache commands instead.

Replace the JSON spill-file manager with a local SQLite database that acts as a disposable, rebuildable index and cache. Claude, Codex, OpenCode, Antigravity, and Kiro records remain authoritative. Prompt Lens incrementally ingests new or changed source records, lazily loads complete Turns, reconciles removed source Sessions, and applies configurable retention to cached full content.

By default, full Turn content is retained for no more than 30 days within a 250 MB limit and is evicted in least-recently-accessed order. Session metadata may remain after content eviction while its authoritative source still exists. When an authoritative source Session disappears, both its cached content and metadata are removed. The local SQLite database stores disclosed plaintext content with restrictive filesystem permissions where supported. Users can inspect, clear, configure, or disable full-content caching.

## User Stories

1. As a Prompt Lens user, I want the application to avoid claiming a false 50 MB RAM ceiling, so that I can accurately understand its resource use.
2. As a Prompt Lens user, I want technical cache information removed from the primary interface, so that usage metrics remain the focus.
3. As a Prompt Lens user, I want to inspect cache status explicitly, so that I can understand disk consumption when needed.
4. As a Prompt Lens user, I want cache status to report cached content size and cached Session counts, so that the figures have an unambiguous meaning.
5. As a Prompt Lens user, I want Prompt Lens to distinguish Cached Content from process memory, so that storage estimates are not presented as RAM measurements.
6. As a Prompt Lens user, I want my existing date filters to remain available, so that I can navigate Sessions by time without full-text search.
7. As a Prompt Lens user, I want project and scope filters to remain available, so that I can navigate relevant Sessions without full-text search.
8. As a Prompt Lens user, I do not want a search field or search shortcut in the terminal interface, so that the interface reflects the supported product scope.
9. As a CLI user, I do not want a `search` command advertised or accepted, so that unsupported behavior is not implied.
10. As a web user, I do not want a search field displayed, so that terminal and web capabilities remain consistent.
11. As a Prompt Lens user, I want obsolete search documentation removed, so that instructions match the product.
12. As a Prompt Lens user, I want large Turn bodies stored outside the long-lived in-memory Session list, so that browsing many Sessions remains responsive.
13. As a Prompt Lens user, I want complete Turns loaded only when I open or export a Session, so that ordinary navigation avoids unnecessary content loading.
14. As a Prompt Lens user, I want Prompt Lens to reuse an incremental local index, so that unchanged source records are not reparsed on every launch.
15. As a Prompt Lens user, I want changed source records reprocessed, so that cached telemetry stays current.
16. As a Prompt Lens user, I want newly discovered source records ingested, so that recent activity appears automatically.
17. As a Prompt Lens user, I want records removed from an authoritative source reconciled out of Prompt Lens, so that the derived cache does not masquerade as permanent history.
18. As a Prompt Lens user, I want to export an Exported Transcript before deleting its source, so that permanent retention is an explicit action.
19. As a Prompt Lens user, I want cached full Turn content limited to 250 MB by default, so that Prompt Lens has bounded disk usage.
20. As a Prompt Lens user, I want cached full Turn content limited to 30 days by default, so that sensitive historical content is not retained indefinitely.
21. As a Prompt Lens user, I want least-recently-accessed content evicted first, so that recently inspected Sessions remain quick to open.
22. As a Prompt Lens user, I want Session metadata preserved when only cached content is evicted and its source remains available, so that usage totals and navigation still work.
23. As a privacy-conscious user, I want to disable full-content caching, so that Prompt Lens retains only the data necessary for its metadata index.
24. As a Prompt Lens user, I want configurable size and age retention limits, so that cache behavior fits my environment.
25. As a Prompt Lens user, I want to clear cached content explicitly, so that I can remove locally duplicated prompts and responses.
26. As a Prompt Lens user, I want clear disclosure that cached content is local plaintext, so that I can make an informed privacy choice.
27. As a Prompt Lens user, I want restrictive database permissions where my operating system supports them, so that other local users cannot casually read the cache.
28. As a Prompt Lens user, I want Prompt Lens never to transmit its cache, so that local telemetry remains local.
29. As an existing Prompt Lens user, I want valid JSON spill files migrated to SQLite, so that cached Sessions remain usable after upgrading.
30. As an existing Prompt Lens user, I want each migrated record verified before its JSON file is removed, so that migration does not silently destroy cached content.
31. As an existing Prompt Lens user, I want invalid or failed JSON migrations preserved and reported, so that recovery remains possible.
32. As a Prompt Lens user, I want safe internal cache identifiers, so that source-provided Session identifiers cannot create unsafe paths or collisions.
33. As an OpenCode user, I want OpenCode's SQLite database treated as an authoritative input source rather than confused with Prompt Lens's derived database, so that ownership is clear.
34. As a developer maintaining Prompt Lens, I want documentation and ADRs to describe the implemented cache accurately, so that future changes do not repeat the current architectural contradiction.
35. As a developer maintaining Prompt Lens, I want cache failures surfaced with actionable errors, so that truncation or data loss does not fail silently.
36. As a developer maintaining Prompt Lens, I want repeated scans to be idempotent, so that accounting and stored records are not duplicated.

## Implementation Decisions

- The Prompt Lens SQLite database is a derived, disposable index and cache. It is not the authoritative owner of Sessions.
- Claude, Codex, OpenCode, Antigravity, and Kiro records are authoritative source records.
- OpenCode's source SQLite database remains an input owned by OpenCode and is distinct from Prompt Lens's SQLite cache.
- The storage boundary will persist normalized Session metadata separately from complete Turn content, allowing metadata queries without materializing Turn bodies.
- The cache schema will record stable internal identities, source tool, source identity/path, source change evidence, normalized Session metadata, serialized Turn content, content size, ingestion time, and last-access time.
- Source change evidence will include source identity plus modification time and size, with a content fingerprint where needed to avoid missed changes.
- Scanning will upsert new and changed records and skip unchanged records.
- Repeated scans must be idempotent and must not double-count Sessions, Turns, Cached Content, Token Metrics, or costs.
- Reconciliation will remove both metadata and cached content when the corresponding authoritative Session no longer exists.
- Content eviction alone will preserve Session metadata while its authoritative source remains available. Opening an evicted Session may rehydrate it from that source and recache it when caching is enabled.
- Full Turn content will be loaded only for detail display or export; list, date, project, scope, Token Metrics, and cost operations will use metadata.
- Default full-content retention is 30 days and 250 MB.
- Size enforcement uses least-recently-accessed eviction and runs after writes and during suitable maintenance points.
- Retention limits are configurable, and full-content caching can be disabled without disabling the metadata index.
- Cache diagnostics are exposed through `prompt-lens cache status`; cache removal is exposed through `prompt-lens cache clear`.
- Cache status reports disk/cache facts and does not label them as RAM or process memory.
- The primary terminal and web interfaces will not show Cached Content or process memory.
- Actual process memory, if introduced later, belongs in explicit diagnostics and is not part of this feature.
- The TUI search field, search state, `/` shortcut, footer hint, and search-only dependency will be removed.
- The CLI full-text search command will be removed.
- The web search field, search filter helper, styling, and search-specific tests will be removed.
- Generated web assets will be rebuilt from source rather than edited manually.
- Date, project, and global/local scope filtering remain supported.
- Current search and strict-memory claims will be removed or rewritten across user and architecture documentation.
- The cache database contains local plaintext. This limitation must be disclosed; application-managed encryption is not included.
- Database and containing-directory permissions will be restrictive where the host platform provides reliable permission controls.
- Prompt Lens must not transmit cache content.
- Existing JSON spill files will be migrated record by record. A source JSON file is removed only after the corresponding database content is committed and verified as readable and equivalent.
- Failed or malformed migrations remain untouched and produce an actionable diagnostic.
- Migration is restartable and idempotent.
- Raw source Session identifiers will not be used directly as filesystem paths.
- Cache reads, writes, migrations, and parsing failures will not silently fall back to incomplete content without informing the caller or user.
- Documentation will use the canonical terms Session, Turn, Normalized Session, Token Metrics, Exported Transcript, and Cached Content.
- The implementation must comply with the accepted local SQLite cache ADR. Earlier specifications and ADRs that promise strict RAM ceilings or describe incompatible persistence behavior must be corrected or explicitly superseded.

## Testing Decisions

- The primary test seam is the public Prompt Lens CLI operating against isolated fixture homes containing representative Claude, Codex, OpenCode, Antigravity, and Kiro source records and an isolated Prompt Lens database.
- Tests assert externally observable behavior: commands, displayed output, exported content, persisted behavior across invocations, cache size/retention outcomes, and reconciliation results. They should not assert private method calls or incidental SQL statement shapes.
- End-to-end CLI integration tests cover first ingestion, unchanged rescans, changed sources, new sources, deleted sources, lazy detail/export retrieval, caching disabled, cache status, cache clear, and restart persistence.
- Integration tests verify that metadata queries and list operations succeed without loading complete Turn bodies.
- Retention tests control time and access order, then verify 30-day expiry and least-recently-accessed eviction at the configured size boundary.
- Migration tests start with representative valid, malformed, partially migrated, duplicate, and interrupted JSON cache states. They verify equivalence before deletion, preservation on failure, idempotent retry, and actionable diagnostics.
- Privacy-oriented tests verify that no network operation is part of cache management and validate restrictive permissions on platforms where that behavior can be asserted reliably.
- Interface tests verify that terminal and web experiences no longer render a search control or RAM indicator and that date/project/scope filters continue to work.
- CLI contract tests verify that the search subcommand is absent from help and rejected as unknown, while cache status and clear commands are documented and functional.
- Scanner fixtures should reuse existing scanner test patterns and normalized Session fixtures where possible.
- Existing storage tests provide prior art for retention and rehydration scenarios but should be replaced or elevated to assert behavior through the new database-backed boundary.
- Existing filter tests provide prior art for preserving date filtering while removing search-specific cases.
- Narrow unit tests are appropriate for deterministic eviction ordering, change-fingerprint comparison, schema migration, and malformed legacy-record handling when exercising these cases through the CLI would make failures ambiguous.
- Tests use isolated temporary directories and databases and must never read, modify, migrate, or clear a developer's real Prompt Lens or agent-tool data.

## Out of Scope

- Full-text search, SQLite FTS, search indexing, and replacement search experiences are out of scope.
- Application-managed encryption and encryption-key lifecycle management are out of scope.
- A strict process-RAM ceiling is out of scope.
- Displaying live Node.js heap, RSS, or operating-system memory metrics is out of scope.
- Treating Prompt Lens as the permanent archive or authoritative owner of deleted source Sessions is out of scope.
- Changing the file formats or databases owned by Claude, Codex, OpenCode, Antigravity, or Kiro is out of scope.
- Cloud synchronization, remote backup, telemetry upload, and multi-device cache sharing are out of scope.
- Restoring a Session to an external coding agent is out of scope.
- Changing date, project, or global/local scope filtering behavior is out of scope except where required to preserve it during search removal.
- Hand-editing generated web bundles is out of scope; they must be rebuilt from maintained source.

## Further Notes

- **Cached Content** means estimated full Turn content retained for immediate access; it must not be used as a synonym for RAM, memory usage, or process memory.
- Exported Transcripts are the explicit mechanism for permanent user-owned preservation before an authoritative source is deleted.
- The present implementation uses JSON spill files and in-process bookkeeping rather than a Prompt Lens SQLite database. It can under-report memory and rehydrate content outside its nominal threshold.
- The existing OpenCode scanner shells out to SQLite to read OpenCode-owned data; implementation planning should consider reliable SQLite access without conflating the source and cache databases.
- This specification implements the decisions recorded in the local SQLite cache ADR and supersedes conflicting strict-memory and JSON-spillover claims in older documentation.
