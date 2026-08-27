# Changelog

All notable changes to Project Guardian MCP.

## [1.1.0] - 2026-08-26

### Added
- **UI: Observation orbs** — each observation as cyan hollow orb, amber clustered per-entity with expand/collapse (`ec4bb7f`), default `false` (`8529a36`), expand-all/collapse-all
- **UI: Always-visible entity browser** — persistent A-Z list filtered by name/group with `obs•links` counts (`2d93547`)
- **UI: Desktop-only gate** — mobile overlay at `<768px` or `<1024px+touch` with blur backdrop (`0398ef8`)
- **MCP: `close_ui` / `stop_ui`** — mirror `start_ui`, 33 tools total (was 31) (`4268fcb`)
- **API: Pagination** — `readStore`/`readGraph` `{limit,offset}` (default 5000, validated), `searchNodes` `limit` (20 default, 100 cap), `GET /api/graph/:view?limit=&offset=` (`e6872cd`)
- **DB: WAL** — `journal_mode=WAL`, `synchronous=NORMAL`, `cache_size=-64000`, `temp_store=MEMORY`, `busy_timeout=5000` per connection

### Fixed
- **UI 404** — `join(process.cwd(),'ui','dist')` fallback to `MCPservers/.../ui/dist` + SPA fallback (`e736e1c`)
- **UI layout** — right panel flex sibling (was absolute overlay) → no out-of-screen graph (`c2085a3`)
- **Memory: `no such table: entities`** — lazy `ensureProjectSchema()` on fresh 0-byte DB (`6f1f712`)
- **Memory: Batch transactions** — `syncToCentral` + bulk `createEntities/createRelations/addObservations` single `BEGIN/COMMIT`, `sqlite insertData` batch (100 rows 8ms)

### Security
- **Audit 24→0** — `sqlite3 5.1.7→6.0.1`, `@typescript-eslint/parser+plugin 6→8` (`e6872cd`)

### Docs
- **README** synced to 33 tools (7 DB +10 memory +1 guidance +12 runtime +3 UI), 9 suites 91 tests, WAL/pagination notes (`13621ae`)

## [1.0.0] - prior
- Initial 31 tools, 11 resources, 27 prompts, FTS5, central mirror `~/memory/memory.db`, daily backup, pre-commit on-demand.
