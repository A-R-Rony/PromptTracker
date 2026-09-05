# 01: Remove unsupported search and misleading RAM presentation

**What to build:** Remove full-text search from every Prompt Lens interface and remove the misleading RAM counter from the primary experience. Users retain date, project, and scope navigation, and all user-facing guidance accurately reflects the reduced interface.

**Blocked by:** None (can start immediately).

**Status:** complete

- [x] The terminal interface has no search field, search state, `/` shortcut, or search footer hint.
- [x] The CLI no longer advertises or accepts a full-text search command.
- [x] The web interface has no search field or search-specific filtering behavior.
- [x] Search-only runtime dependencies, styles, helpers, and tests are removed when no longer used.
- [x] Generated web output is rebuilt from maintained source and is not hand-edited.
- [x] The terminal and web interfaces no longer display an estimated value as RAM, process memory, or a strict memory ceiling.
- [x] Date filtering continues to work in the CLI, terminal UI, and web UI.
- [x] Project and global/local scope filtering continue to work where currently supported.
- [x] User and architecture documentation no longer advertise search or claim a strict 50 MB RAM guarantee or streaming behavior.
- [x] Automated tests verify the absence of search and RAM presentation while protecting the retained navigation filters.
