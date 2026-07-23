# Project Guardian — Bug Tracker & Dev Timeline

## Priority: Critical — FIXED

### [C1] Server hangs when CWD is home directory
**Root cause:** `initializeMemoryDatabase()` runs `find` scanning the entire home directory tree for `memory.db` files (line 180), AND `pre-commit install` blocks indefinitely in non-git directories without timeout.

**Fixes applied:**
- Skip `find` scan when `targetRoot` is the user's `$HOME` directory (`memory-manager.ts:188-211`)
- `pre-commit install` now has a 30-second timeout via `Promise.race` (`memory-manager.ts:123-126`)
- Pre-commit setup is gated: first checks `which pre-commit` exists, then checks `git rev-parse --git-dir` confirms we're in a valid repo (`memory-manager.ts:112-120`)
- C3/M1/M2 fixes also contribute to C1 — silent error swallowing masked the timeout.

### [C2] Double un-awaited `initializeMemorySystem()` in constructor
**Fix applied:** Removed `this.initializeMemorySystem()` from constructor (`server.ts:76`). Only `run()` calls it now, properly awaited.

### [C3] `pre-commit install` blocks async init
**Fix applied:** Added `which pre-commit` check + `git rev-parse --git-dir` check before writing config. Added 30-second `Promise.race` timeout to `pre-commit install`.

## Priority: High — FIXED

### [H1] Missing stderr suppression on `git rev-parse`
**Fix applied:** Both `server.ts:38` (`execSync`) and `memory-manager.ts:23` (`execAsync`) now append `2>/dev/null`.

### [H2] Memory.db placed in arbitrary CWD
**Fix applied:** When not in a git repo, dbPath now resolves to `$XDG_DATA_HOME/project-guardian/` or `$HOME/.local/share/project-guardian/` (`server.ts:40-43`).

### [H3] `createDatabase` / `initializeDefaultDatabase` leak connections
**Fix applied:** Both methods now wrap `db.close()` in a proper Promise with callback, ensuring the connection is actually released (`sqlite-manager.ts:36-40`, `sqlite-manager.ts:72-76`).

## Priority: Medium — FIXED

### [M1] Pre-commit config written without pre-commit installed
**Fix applied:** `memory-manager.ts:112-114` runs `which pre-commit` before any config write or install.

### [M2] No error logging anywhere
**Fix applied:** All catch blocks across 4 source files now call `console.error` or `console.warn` with structured error context. Zero `// console.error` comments remain.

## Priority: High — Leaks & Overflow (UNFIXED)

### [LK1] Connection map unbounded growth
`connections: Map<string, sqlite3.Database>` in `getConnection()` grows without eviction. Every unique database name creates a permanent SQLite connection + file descriptor that lives until `closeAllConnections()`. Long-running server with many `createDatabase` calls leaks FDs.
- **File:** `src/sqlite-manager.ts:15,49-56`
- **Fix:** LRU eviction at ~20 connections or close-after-use for non-`memory` databases.

### [LK2] No row limit in `query()` — unbounded result sets
`db.all()` loads ALL matching rows into one array. `execute_sql` with `SELECT *` on a million-row table OOMs. `queryData()` appends LIMIT but raw SQL via `executeSql` bypasses it entirely.
- **File:** `src/sqlite-manager.ts:628-634`
- **Fix:** Hard cap (10k rows) in `query()` unless explicitly overridden.

### [LK3] Import loads entire file into memory
`readFileSync` + `.split('\n')` / `JSON.parse` loads whole file into RAM. A 2GB CSV/JSON causes OOM. Also builds unbounded `records[]` array before any DB insert.
- **File:** `src/import-export.ts:146,209,222`
- **Fix:** Stream + batch insert (1k rows per batch).

### [LK4] O(n²) string concatenation in CSV export
`content += values.join(delimiter)` in a loop — each iteration copies the entire previous string. 100k rows generates ~5GB temporary string allocations.
- **File:** `src/import-export.ts:266-270`
- **Fix:** Build array of lines, `join('\n')` at the end.

## Priority: High — Input Validation (UNFIXED)

### [V1] SQL injection in ORDER BY clause
`orderBy` is interpolated directly into SQL without sanitization. Could inject `; DROP TABLE entities;--`.
- **File:** `src/sqlite-manager.ts:400`
- **Fix:** Validate `orderBy` against known column names; validate `orderDirection` server-side.

### [V2] Zod schemas defined but never applied
`types.ts` has full Zod schemas (`ExecuteSqlSchema`, `QueryDataSchema`, etc.) but `request-handlers.ts` never imports/uses them. `args` passes through unchecked.
- **File:** `src/handlers/request-handlers.ts:15-132`
- **Fix:** Parse `args` with Zod schemas before use.

## Sprint 1: Security & Robustness — FIXED

### [M3] Shell injection in `find` command
`execAsync(\`find "\${targetRoot}" ...\`)` — if repo path contains backticks, `$()`, semicolons, arbitrary commands execute.
- **File:** `src/memory-manager.ts:192`
- **Fix:** Use `cp.execFile('find', [...])` no shell.

### [M5] SQL injection via ATTACH DATABASE filename
`ATTACH DATABASE '${dbPath}' AS nested` — a file with `'` breaks SQL; `'; DROP TABLE entities;--.db` is exploitable.
- **File:** `src/memory-manager.ts:199`
- **Fix:** Escape single quotes: `dbPath.replace(/'/g, "''")`.

### [M6] `execSync` no timeout in constructor
`execSync('git rev-parse ...')` — stale `.git/index.lock` or NFS hang blocks constructor forever.
- **File:** `src/server.ts:40`
- **Fix:** Add `timeout: 5000` to execSync options.

### [M7] Shutdown race + no timeout
Double SIGINT races `closeAllConnections`; if close hangs, process never exits.
- **File:** `src/server.ts:214-222`
- **Fix:** Debounce signals, add 5s shutdown timeout.

### [M8] Zombie process on pre-commit timeout
`Promise.race` rejects but the child process continues running.
- **File:** `src/memory-manager.ts:126`
- **Fix:** Use `AbortController` + `kill()` on timeout.

## Sprint 2: Memory & Data Integrity — FIXED

### [M4] Unbounded `find` output
`execAsync` captures entire `find` stdout. A repo with 100k `.db` files fills RAM.
- **File:** `src/memory-manager.ts:192-193`
- **Fix:** Stream via `spawn` + line reader.

### [M9] `JSON.parse` on DB rows without try-catch
Corrupted `observations` column crashes `readGraph`/`searchNodes`/`openNode`.
- **File:** `src/memory-manager.ts:442,477,513`
- **Fix:** Wrap in try-catch, fallback to `[]`.

### [M10] `0`/`false` silently lost in CSV export
`value || ''` converts `0` and `false` to empty string.
- **File:** `src/import-export.ts:268`
- **Fix:** `value ?? ''`.

### [M11] No streaming in SQL import
Entire SQL dump loaded into memory then `.split(';')`.
- **File:** `src/import-export.ts:222-225`
- **Fix:** Chunked reading or readline interface.

### [M12] Scattered DB merge — unbounded loop
Thousands of memory.db files block startup for minutes.
- **File:** `src/memory-manager.ts:195-209`
- **Fix:** Cap at 100 files, warn and skip rest.

## Priority: Low — UNFIXED

### [L1] Hardcoded model references in BEHAVIORAL_PROTOCOL_SYSTEM_MESSAGE
The behavioral protocol prompt hardcodes model names like `deepseek-v4-flash-free`. These go stale when models are added/removed.

### [L2] Constructor uses async method synchronously
Already addressed by C2 fix.

### [L3] No transaction in `deleteEntity()` cascade
Three separate `deleteData` calls — if middle one fails, orphaned relations.
- **File:** `src/memory-manager.ts:357-367`
- **Fix:** Wrap in `BEGIN`/`COMMIT`/`ROLLBACK`.

### [L4] Duplicate signal handler registration
No guard against registering SIGINT/SIGTERM handlers twice.
- **File:** `src/server.ts:214-222`
- **Fix:** Dedup flag.

### [L5] Partial failures silently swallowed in batch tools
`createEntities` returns success even if some items fail.
- **File:** `src/handlers/request-handlers.ts:98,102`
- **Fix:** Return `{ failures: [...] }` in response.

---

## Fix applied checklist

- [x] C1 — Skip `find` in home dir; gate pre-commit on binary+git; add 30s timeout
- [x] C2 — Removed redundant `initializeMemorySystem()` from constructor
- [x] C3 — `which pre-commit` check + git-dir check + 30s timeout
- [x] H1 — `2>/dev/null` on all `git rev-parse` calls
- [x] H2 — `$XDG_DATA_HOME/project-guardian` fallback for dbPath
- [x] H3 — Proper `db.close()` Promise in `createDatabase` and `initializeDefaultDatabase`
- [x] M1 — `which pre-commit` guard before config write/install
- [x] M2 — Active `console.error`/`console.warn` in all catch blocks
- [ ] LK1 — Connection map LRU eviction
- [ ] LK2 — Row limit in `query()`
- [ ] LK3 — Stream imports
- [ ] LK4 — Array-join CSV export
- [ ] V1 — ORDER BY sanitization
- [ ] V2 — Zod validation in request handlers
- [x] M3 — `execFile` instead of `execAsync` for find
- [x] M4 — Stream find output
- [x] M5 — Escape ATTACH filename
- [x] M6 — execSync timeout
- [x] M7 — Shutdown debounce + timeout
- [x] M8 — AbortController for pre-commit
- [x] M9 — Try-catch JSON.parse on DB rows
- [x] M10 — `??` instead of `||` in CSV
- [x] M11 — Stream SQL import
- [x] M12 — Cap scattered DB merge
- [x] L3 — deleteEntity transaction
- [x] L4 — Dedup signal handlers
- [x] L5 — Partial failure reporting
