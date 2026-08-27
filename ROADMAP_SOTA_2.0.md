# Project Guardian SOTA Roadmap — 1.1.0 → 2.0.0

> Documented 2026-08-26 as TODO. Updated 2026-08-27: **Provider A chosen** + **POC done** `b4d4b1d`/`673a238` + **merged to master** `f7876bf` as **2.0.0-beta-1** `6948910` (`v2.0.0-beta-1` tag).

## Goal
From niche SOTA (local-first Git-aware knowledge graph) to universal SOTA (hybrid RAG + streaming + observable).

## Phase 1 — Vector Hybrid RAG (8-12d) — **DONE in 2.0.0-beta-1 (A local)**
- [x] **Chosen: A** `@xenova/transformers` `all-MiniLM-L6-v2` (local 80MB, 384d, offline) — decision 2026-08-26
- [x] Schema: `embeddings` + `vec_entities vec0(embedding float[384])` via `ensureProjectSchema`/`ensureCentralSchema` (WAL + `createRequire` fallback for Jest)
- [x] Worker: immediate `upsertVec` on `createEntity`/`addObservation`/`delete` (batch queue TODO for 2.0)
- [x] Hybrid: `RRF k=60` merging FTS `BM25` + `vec0` cosine, `search_nodes {mode: keyword|vector|hybrid, limit}` + `GET /api/search?q=&mode=&limit=`
- [x] Migrate: `scripts/backfill_vec.mjs` — `central 105` + `project 76` vec rows, `PRAGMA user_version` bump pending
- [x] Risks: `sqlite-vec` `import.meta.resolve` Jest fix via `createRequire`, mock `Float32Array` realm fix, 7.6MB/5k cap noted
- [x] Accept: `hybrid` finds semantic miss (`authentication` → `auth-login` top, `93/93` tests, `e2e` `2/2` pass, `b4d4b1d`)

## Phase 2 — Scale & Streaming (5-7d) — **DONE in feat/phase2-scale fa033ec+ (streaming+LOD+virtual+VACUUM)**
- [x] `read_graph_stream` cursor `{updated_at, name}` paginated 500/page, `GET /api/graph/stream?cursor=&limit=` (merged central, project still `limit/offset`, UI wires streaming for central incremental)
- [x] DB: `journal_size_limit=64M` (`PRAGMA journal_size_limit=67108864`) + monthly `VACUUM` (`vacuumDatabases()` self-schedules 30d + `POST /api/vacuum`)
- [x] UI LOD: auto-collapse >300 (cluster, >400 disable orbs), `react-window` virtual list (>50 → `FixedSizeList 420h 56h`), `>1k` physics freeze (`cooldownTicks 0 d3AlphaDecay 1` — deck.gl WebGL TODO for 10k)

## Phase 3 — Collab/Auth (7-10d, optional)
- [ ] `Litestream` → S3/R2 replica (opt-in)
- [ ] `API_KEY` + rateLimit 10/s
- [ ] CRDT-lite LWW + vector_clock

## Phase 4 — Observability & Release (3d)
- [ ] `prom-client` metrics at `:9464/metrics`
- [ ] OpenTelemetry spans
- [ ] `2.0.0` breaking, CHANGELOG, CI audit gate

## Decisions
- [x] Provider **A** chosen 2026-08-26
- [x] Branch `feat/vector-rag-poc` created `2772572` + `b4d4b1d` e2e + `673a238` backfill/UI wiring — POC done, todo updated first per user, no merge to master yet

## References
- Current (feat/phase2-scale): 34 tools (33+vacuum/stream), 93 tests (91+2 e2e), 0 vulns (master) / 5 vulns (feat with @xenova), WAL+64M cap+VACUUM, cursor stream 500/page, LOD auto-collapse+react-window 403k `B2DK7m-f.js`, `c2085a3` flex, `0398ef8` mobile gate
