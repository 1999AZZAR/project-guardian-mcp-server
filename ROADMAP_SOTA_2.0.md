# Project Guardian SOTA Roadmap — 1.1.0 → 2.0.0

> Documented 2026-08-26 as TODO for review. No implementation yet.

## Goal
From niche SOTA (local-first Git-aware knowledge graph) to universal SOTA (hybrid RAG + streaming + observable).

## Phase 1 — Vector Hybrid RAG (8-12d) — **NEXT**
- [ ] Choose provider: **A** `@xenova/transformers` `all-MiniLM-L6-v2` (local 80MB, 384d) vs **B** OpenAI `text-embedding-3-small` (1536d)
- [ ] Schema: `embeddings(entity_name PK, embedding BLOB, model TEXT, updated_at)` + `sqlite-vec0`
- [ ] Worker: batch queue 10 obs / 100ms, on `createEntity`/`addObservation`/`updateData`
- [ ] Hybrid: `RRF(BM25, cosine)` or `0.5*normBM25+0.5*cosine`, `search_nodes {mode, alpha, limit}` + `vector_search`
- [ ] Migrate: `PRAGMA user_version 1→2`, backfill `SELECT name,observations → embed`
- [ ] Risks: `sqlite-vec` native build, model size, 7.6MB/5k cap
- [ ] Accept: `hybrid` finds semantic misses of `keyword`

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

## Decisions needed
- [ ] Provider A vs B
- [ ] Start Phase 1 branch `feat/vector-rag` ?

## References
- Current: 33 tools, 91 tests, 0 vulns, WAL, pagination, `c2085a3` flex, `0398ef8` mobile gate, `2d93547` always-list
