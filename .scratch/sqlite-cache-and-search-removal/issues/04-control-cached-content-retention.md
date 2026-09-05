# 04: Give users bounded and controllable Cached Content

**What to build:** Give users explicit control over locally cached full Turn content. Prompt Lens enforces safe default retention, exposes clear cache diagnostics and clearing controls, and allows full-content caching to be configured or disabled without disabling metadata analytics.

**Blocked by:** 02: Introduce the rebuildable SQLite Session cache.

**Status:** ready-for-agent

- [ ] Full Turn content defaults to a maximum age of 30 days and a maximum stored size of 250 MB.
- [ ] Size enforcement evicts least-recently-accessed full content first and updates access time when complete Turns are successfully used.
- [ ] Age and size enforcement run after relevant writes and at suitable maintenance points so limits remain effective across restarts.
- [ ] Evicting full Turn content preserves Session metadata while the authoritative Session still exists.
- [ ] Users can configure both content age and size limits through the product's supported configuration mechanism.
- [ ] Users can disable full-content caching while retaining the metadata index, filters, Token Metrics, and analytics.
- [ ] `prompt-lens cache status` reports unambiguously named Cached Content size, content-bearing Session count, configured limits, and whether full-content caching is enabled.
- [ ] Cache status does not label Cached Content as RAM, heap, RSS, process memory, or a strict process-memory limit.
- [ ] `prompt-lens cache clear` removes cached full Turn content safely without deleting authoritative agent records.
- [ ] Cache clearing has explicit, observable success and failure results and is idempotent.
- [ ] The database and its containing directory receive restrictive permissions where the host platform reliably supports them.
- [ ] Documentation discloses that cached prompts and responses are local plaintext and are never transmitted by cache-management behavior.
- [ ] Cache identifiers cannot escape the intended storage boundary or collide because of source-provided path characters.
- [ ] Cache maintenance failures are actionable and do not silently claim successful eviction or clearing.
- [ ] Deterministic tests control time, content sizes, and access order to verify age expiry and least-recently-accessed eviction.
- [ ] CLI integration tests cover status, clearing, configuration, disabling, metadata preservation, and behavior across restarts using isolated storage.
