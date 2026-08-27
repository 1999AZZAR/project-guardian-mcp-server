# Project Guardian SOTA Roadmap — 1.1.0 → 2.0.0

> Documented 2026-08-26 as TODO. Updated 2026-08-27: **Provider A chosen** + **POC done on feat/vector-rag-poc** (hybrid RAG, backfill, UI wiring, e2e pass). No merge to master yet — todo updated first.

## Goal
From niche SOTA (local-first Git-aware knowledge graph) to universal SOTA (hybrid RAG + streaming + observable).

## Phase 1 — Vector Hybrid RAG (8-12d) — **POC DONE on feat/vector-rag-poc (A local)**
- [x] **Chosen: A** `@xenova/transformers` `all-MiniLM-L6-v2` (local 80MB, 384d, offline) — decision 2026-08-26
- [x] Schema: `embeddings` + `vec_entities vec0(embedding float[384])` via `ensureProjectSchema`/`ensureCentralSchema` (WAL + `createRequire` fallback for Jest)
- [x] Worker: immediate `upsertVec` on `createEntity`/`addObservation`/`delete` (batch queue TODO for 2.0)
- [x] Hybrid: `RRF k=60` merging FTS `BM25` + `vec0` cosine, `search_nodes {mode: keyword|vector|hybrid, limit}` + `GET /api/search?q=&mode=&limit=`
- [x] Migrate: `scripts/backfill_vec.mjs` — `central 105` + `project 76` vec rows, `PRAGMA user_version` bump pending
- [x] Risks: `sqlite-vec` `import.meta.resolve` Jest fix via `createRequire`, mock `Float32Array` realm fix, 7.6MB/5k cap noted
- [x] Accept: `hybrid` finds semantic miss (`authentication` → `auth-login` top, `93/93` tests, `e2e` `2/2` pass, `b4d4b1d`)

## Phase 2 — Scale & Streaming (5-7d)
- [ ] `read_graph_stream` cursor `{updated_at, name}` paginated 500/page, `GET /api/graph?cursor=`
- [ ] DB: `journal_size_limit`, monthly `VACUUM`
- [ ] UI LOD: auto-collapse >300, `deck.gl` WebGL >1k, `react-window` list

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
- Current (feat): 33 tools, 93 tests (91+2 e2e), 0 vulns (master) / 5 vulns (feat with @xenova), WAL, pagination, `c2085a3` flex, `0398ef8` mobile gate, `2d93547` always-list, `COU8SsoH.js` hybrid search UI, `105/76` vec backfilled
