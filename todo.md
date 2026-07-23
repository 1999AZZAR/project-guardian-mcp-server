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

## Priority: Low — UNCHANGED

### [L1] Hardcoded model references in BEHAVIORAL_PROTOCOL_SYSTEM_MESSAGE
The behavioral protocol prompt hardcodes model names like `deepseek-v4-flash-free`. These go stale when models are added/removed.

### [L2] Constructor uses async method synchronously
Already addressed by C2 fix.

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
