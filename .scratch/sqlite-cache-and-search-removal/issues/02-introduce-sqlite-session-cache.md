# 02: Introduce the rebuildable SQLite Session cache

**What to build:** Replace new JSON spillover and manual in-memory content accounting with a local, rebuildable SQLite cache. Prompt Lens reads lightweight Session metadata for lists and analytics, and loads complete Turns only when users inspect or export a Session.

**Blocked by:** None (can start immediately).

**Status:** complete

- [x] Prompt Lens creates and migrates its own local SQLite database without confusing it with an authoritative tool-owned database.
- [x] The database stores Normalized Session metadata separately from complete Turn content.
- [x] Stored metadata supports dates, source tool and identity, project, model, Token Metrics, cost, Turn count, ingestion state, and content availability without loading full Turns.
- [x] Stored content supports faithful reconstruction of complete Turns, including prompts, complete assistant responses, summaries, tool calls, timestamps, and Token Metrics.
- [x] Stable internal identities prevent collisions and do not expose raw source Session identifiers as filesystem paths.
- [x] Session listing, date/project/scope filtering, and analytics operate from metadata without materializing complete Turn bodies.
- [x] Detail display and Exported Transcript generation lazily load complete Turns and preserve full fidelity.
- [x] Repeating the same cache write is idempotent and does not duplicate Sessions, Turns, Token Metrics, cost, or Cached Content accounting.
- [x] Database read, write, schema, and content-decoding failures are surfaced as actionable errors rather than silently returning incomplete content.
- [x] The cache can be deleted and rebuilt from authoritative sources without becoming the permanent owner of Session history.
- [x] Integration tests invoke the public CLI with isolated source and cache locations and never touch real user data.
- [x] Tests assert observable CLI results and persisted behavior across separate process invocations rather than private SQL statements.
