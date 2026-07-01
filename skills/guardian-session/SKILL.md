---
name: guardian-session
description: "Session context loader for Project-Guardian. Restores project context from memory.db at session start. Surfaces relevant entities, recent observations, and active tasks based on current working directory and files. Load at the beginning of every coding session."
---

# Guardian Session — Context Loader

## Purpose

Each session starts fresh. This skill restores context from `memory.db` so you know what's been done, what's in progress, and what needs attention next.

## When to Load

- At the start of every coding session
- When switching between projects
- When resuming work after a break
- When the user says "what was I working on?"

## Core Workflow

### 1. Load Project State

Read the full knowledge graph:
```
read_graph
```

This returns all entities and relations. Scan for:
- Project entities (root nodes)
- Active tasks (not marked `[COMPLETE]`)
- Open bugs (not marked `[FIX]`)
- Recent observations (check `updated_at`)

### 2. Contextualize to Current Directory

If working in a subdirectory, search for relevant files:
```
search_nodes query="file:<current-dir>"
```

If working on specific files, search for those:
```
search_nodes query="file:<filename>"
```

### 3. Surface Active Work

Find incomplete tasks:
```
query_data table="entities" conditions={"entity_type": "task"} limit=20
```

Find open bugs:
```
query_data table="entities" conditions={"entity_type": "bug"} limit=10
```

Find recent changes:
```
query_data table="entities" conditions={} orderBy="updated_at" orderDirection="DESC" limit=10
```

### 4. Build Session Summary

Create a mental model of the project state:

```
PROJECT: <name>
├── ACTIVE TASKS: <count>
│   ├── task:<id>:<title> — <status from observations>
│   └── ...
├── OPEN BUGS: <count>
│   ├── bug:<id>:<slug> — <severity>
│   └── ...
├── RECENT CHANGES: <count>
│   ├── <file or entity> — <what changed>
│   └── ...
└── NEXT UP: <suggested next action based on dependencies>
```

### 5. Report to User

Provide a concise briefing:
- What was last worked on (most recent observation)
- What's currently in progress (active tasks)
- What's blocking progress (open bugs, dependency chains)
- Suggested next action

## Context Loading Script

Use `scripts/load_context.py` for automated context extraction:

```bash
python3 scripts/load_context.py [--dir <path>] [--project <name>]
```

Output: JSON with project summary, active tasks, recent changes, and suggested next actions.

## Smart Context Detection

### By Working Directory

```python
# If current dir matches a file entity's path
search_nodes query="file:src/"
# → returns all files under src/

# If current dir is the project root
search_nodes query="project:"
# → returns project entities
```

### By File Type

When editing a specific file, load its context:
```
open_node names=["file:<path>"]
```

Then load related entities:
```
search_nodes query="<feature-or-task-name>"
```

### By Recency

Find what changed recently:
```
query_data table="entities" orderBy="updated_at" orderDirection="DESC" limit=5
```

## Session State Tracking

At session start, optionally create a session entity:
```
create_entity entities=[{
  "name": "session:<date>:<time>",
  "entityType": "milestone",
  "observations": [
    "[SESSION] started | working-dir: <dir> | focus: <what I'm working on>"
  ]
}]
```

At session end, update it:
```
add_observation observations=[{
  "entityName": "session:<date>:<time>",
  "contents": [
    "[SESSION] ended | duration: <time> | completed: <list> | next: <list>"
  ]
}]
```

## Dependency Chain Analysis

To find what to work on next, trace dependency chains:

1. Find tasks with no unresolved blockers:
   ```
   search_nodes query="task:"
   ```
2. Check which tasks `depends_on` others
3. Find tasks where all dependencies are complete
4. Those are the next actionable items

## Anti-Patterns

- Don't load the entire graph if only working on a subset
- Don't create session entities for very short interactions (< 5 min)
- Don't surface stale observations (older than 7 days) unless specifically asked
- Keep session summaries under 10 lines
