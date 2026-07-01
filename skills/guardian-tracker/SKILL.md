---
name: guardian-tracker
description: "Auto-tracking skill for Project-Guardian. Automatically records file changes, code edits, decisions, and bug fixes to memory.db. Trigger after every significant operation (file edit, git commit, bug fix, refactor). Uses git diff and file analysis to generate observations."
---

# Guardian Tracker — Auto-Track Skill

## Purpose

Manually tracking every change is tedious. This skill automates it. After every significant operation, it analyzes what changed and records it to memory.db via Project-Guardian MCP tools.

## When to Load

- After file edits or creates
- After git commits
- After bug fixes
- After refactoring
- After architectural decisions
- At end of significant work blocks

## Core Workflow

### After File Edit/Create

1. Identify what changed (new file? modified? which functions?)
2. Check if file entity exists:
   ```
   search_nodes query="file:<path>"
   ```
3. Create or update file entity:
   ```
   create_entity entities=[{
     "name": "file:<path>",
     "entityType": "file",
     "observations": ["[<timestamp>] action: edit | changes: <summary> | lines: +/-<count>"]
   }]
   ```
4. Link to relevant features/tasks:
   ```
   create_relation relations=[{
     "from": "file:<path>",
     "to": "feature:<name>",
     "relationType": "implements"
   }]
   ```

### After Git Commit

1. Run `git diff HEAD~1 --stat` to see changed files
2. Create/update entities for each changed file
3. Create a task observation for the commit:
   ```
   add_observation observations=[{
     "entityName": "project:<name>",
     "contents": ["[<timestamp>] commit: <hash> | message: <msg> | files: <count>"]
   }]
   ```
4. Link changed files to the commit's purpose

### After Bug Fix

1. Create bug entity:
   ```
   create_entity entities=[{
     "name": "bug:<id>:<slug>",
     "entityType": "bug",
     "observations": [
       "[<timestamp>] reported: <error> | severity: <level>",
       "[<timestamp>] cause: <root cause>",
       "[<timestamp>] fix: <solution> | files: <list>"
     ]
   }]
   ```
2. Link bug to affected entities:
   ```
   create_relation relations=[{
     "from": "bug:<id>:<slug>",
     "to": "task:<id>",
     "relationType": "blocks"
   }]
   ```
3. After fix, remove blocks relation:
   ```
   delete_relation relations=[{
     "from": "bug:<id>:<slug>",
     "to": "task:<id>",
     "relationType": "blocks"
   }]
   ```

### After Decision

1. Create decision entity:
   ```
   create_entity entities=[{
     "name": "decision:<date>:<slug>",
     "entityType": "decision",
     "observations": ["[DECIDE] chose <A> over <B> | reason: <why> | tradeoffs: <list>"]
   }]
   ```
2. Link to affected features/files:
   ```
   create_relation relations=[{
     "from": "decision:<date>:<slug>",
     "to": "feature:<name>",
     "relationType": "relates_to"
   }]
   ```

### After Refactor

1. Update file entities with before/after observations
2. Create decision entity for refactor rationale
3. Update any affected function entities
4. Link refactor to technical debt or improvement goals

## Change Detection Script

Use `scripts/track_changes.py` for automated git diff analysis:

```bash
python3 scripts/track_changes.py [--commit <hash>] [--since <time>]
```

Output: JSON array of changed files with diffs, ready for entity creation.

## Batch Tracking

When multiple changes happen at once (e.g., after a commit with many files):

```json
create_entity entities=[
  {"name": "file:a.ts", "entityType": "file", "observations": ["[EDIT] ..."]},
  {"name": "file:b.ts", "entityType": "file", "observations": ["[EDIT] ..."]}
]

create_relation relations=[
  {"from": "file:a.ts", "to": "feature:x", "relationType": "implements"},
  {"from": "file:b.ts", "to": "feature:x", "relationType": "implements"}
]
```

## Observation Templates

Use consistent prefixes for machine-parseable observations:

| Prefix | Use When | Format |
|--------|----------|--------|
| `[EDIT]` | File modified | `[EDIT] <summary> \| lines: +/-<n>` |
| `[CREATE]` | New file/function | `[CREATE] <type> \| purpose: <why>` |
| `[DELETE]` | Removed code | `[DELETE] <what> \| reason: <why>` |
| `[REFACTOR]` | Restructured code | `[REFACTOR] <scope> \| reason: <why>` |
| `[FIX]` | Bug resolution | `[FIX] <solution> \| root-cause: <cause>` |
| `[DECIDE]` | Choice made | `[DECIDE] <A> over <B> \| reason: <why>` |
| `[PERF]` | Performance change | `[PERF] <metric>: <before> → <after>` |
| `[SEC]` | Security change | `[SEC] <what> \| impact: <level>` |
| `[DEPLOY]` | Deployment event | `[DEPLOY] <env> \| status: <ok/fail>` |
| `[PROGRESS]` | Milestone update | `[PROGRESS] <pct>% \| <what's done>` |

## Anti-Patterns

- Don't create entities for trivial changes (typo fixes, whitespace)
- Don't duplicate observations — check existing ones first
- Don't create relations that already exist
- Keep observations under 200 chars each
- Use batch operations for multiple related changes
