# 05: Safely migrate legacy JSON spill files

**What to build:** Upgrade existing users from legacy JSON spill files to SQLite without silently losing private Session content. Every source entry is migrated, committed, read back, and verified before that specific JSON file is removed; failures remain recoverable and visible.

**Blocked by:** 02: Introduce the rebuildable SQLite Session cache; 04: Give users bounded and controllable Cached Content.

**Status:** ready-for-agent

- [ ] Startup or an explicit supported migration path discovers legacy Prompt Lens JSON spill entries only within the intended legacy cache location.
- [ ] Valid legacy Turns are written into the corresponding SQLite Session content record without truncation.
- [ ] A legacy file is removed only after its database transaction commits and the stored content is read back and verified as equivalent.
- [ ] Malformed, unreadable, unsupported, or unverifiable JSON files remain untouched and produce actionable diagnostics.
- [ ] A database write or verification failure leaves the corresponding JSON source file recoverable.
- [ ] Migration can resume after interruption without duplicating content or deleting an unverified source file.
- [ ] Running migration repeatedly is idempotent.
- [ ] Session identifier collisions and unsafe source-provided characters cannot redirect or overwrite migration targets.
- [ ] When full-content caching is disabled, migration does not unexpectedly retain full Turn content and clearly reports the applicable behavior.
- [ ] Migrated content participates in the configured 30-day/250 MB retention policy without bypassing its limits.
- [ ] Tests cover valid content, malformed JSON, unreadable entries where portable, duplicates, collisions, partial prior migration, transaction failure, verification failure, and interrupted restart.
- [ ] Tests use an isolated legacy directory and database and never inspect, migrate, or remove a developer's real cache files.
