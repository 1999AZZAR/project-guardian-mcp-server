# Changelog

All notable changes to Project Guardian MCP.

## [2.0.0-beta-1] - 2026-08-27

### Added
- **Vector Hybrid RAG (POC)** — `sqlite-vec` `vec0(embedding float[384])` + `@xenova/transformers` `all-MiniLM-L6-v2` local 384d (`2772572`), `vector-manager.ts` lazy pipeline, `ensureProjectSchema`/`ensureCentralSchema` vec table + `createRequire` Jest fix
- **MCP: `search_nodes` hybrid** — `mode: keyword|vector|hybrid` (default `hybrid` RRF `k=60` merging FTS BM25 + vec cosine), `vectorSearch` KNN `MATCH`, `GET /api/search?q=&mode=&limit=` (`673a238`)
- **UI: Hybrid search** — `SEARCH ENTITIES` now `fetch /api/search` when `q≥2` with `HYBRID|KEYWORD|VECTOR` select, `filteredNodes = searchResults ?? baseFiltered` (`COU8SsoH.js`)
- **Backfill** — `scripts/backfill_vec.mjs` real embeddings `central 105` + `project 76` vec rows
- **E2E** — `__tests__/e2e-vector.test.ts` `2/2` pass, `93/93` total, mock `Float32Array` realm fix

### Fixed
- **Jest vec load** — `import.meta.resolve` failure via `createRequire` fallback for `sqlite-vec` (`b4d4b1d`)

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
