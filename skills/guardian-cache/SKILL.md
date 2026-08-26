---
name: guardian-cache
description: "Store temporary agent state and cached API results in Redis using enforced mema:* namespaces and TTL controls. Use when session data or expensive intermediate results must be shared across steps or sub-agents."
---

# Guardian Cache

Standardized Redis-backed caching for agents.

## Prerequisites
- **Binary**: Python 3.9+ must be available on the host.
- **Credentials**: `REDIS_URL` environment variable (e.g., `redis://localhost:6379/0`).

## Setup
1. Install dependencies with `python3 -m pip install -r skills/guardian-cache/requirements.txt`.
2. Export `REDIS_URL`; use `.env.example` only as a configuration reference.

## Core Workflows

### 1. Store and Retrieve
- **Store**: `printf '%s' "$VALUE" | python3 $WORKSPACE/skills/guardian-cache/scripts/cache_manager.py set mema:cache:<name> --stdin --ttl 3600`
- **Fetch**: `python3 $WORKSPACE/skills/guardian-cache/scripts/cache_manager.py get mema:cache:<name>`

### 2. Search & Maintenance
- **Scan**: `python3 $WORKSPACE/skills/guardian-cache/scripts/cache_manager.py scan [pattern]`
- **Ping**: `python3 $WORKSPACE/skills/guardian-cache/scripts/cache_manager.py ping`

Prefer `--stdin` for values so secrets and private data do not appear in process listings or shell history. Explicit TTL values must be positive.

## Key Naming Convention
Strictly enforce the `mema:` prefix:
- `mema:context:*` – Session state.
- `mema:cache:*` – Volatile data.
- `mema:state:*` – Persistent state.
