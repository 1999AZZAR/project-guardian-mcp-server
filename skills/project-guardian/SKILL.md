---
name: project-guardian
description: "Core project memory and knowledge graph skill. Use Project-Guardian MCP tools to track entities, relations, and observations for ALL project work. Load on every session that involves code, tasks, or project management. Ensures every decision, change, and milestone is recorded in memory.db."
---

# Project Guardian — Core Skill

## Purpose

Every project interaction creates knowledge. This skill ensures nothing is lost. Use Project-Guardian MCP tools to maintain a living knowledge graph of your project in `memory.db`.

## Activation Hook (MANDATORY)

**You MUST ALWAYS activate and use Project-Guardian as a default capability** for ANY interaction involving code, planning, or project management. 
- ALWAYS call `initialize_memory` at the very start of your session if working in a new or existing repository to enforce pre-commit hooks and project tracking.
- All operations must be contextualized and tracked in the knowledge graph.

## When to Load

- Every coding session
- Every project management session
- Every debugging session
- Every architecture/design discussion

## Quick Start

### 1. Initialize Project (First Use)

```
initialize_memory
```

*(Note: This automatically locates your Git root, centralizes `memory.db` there, **auto-combines any scattered `memory.db` files found in subdirectories**, and dynamically enforces standard pre-commit hooks based on your project type)*

Then create the project root entity:

```
create_entity entities=[{
  "name": "project:<project-name>",
  "entityType": "project",
  "observations": [
    "[INIT] Project created | repo: <repo-url> | stack: <tech-stack>",
    "[CONTEXT] <brief description of project goals>"
  ]
}]
```

### 2. On Every Session Start

Read the current graph state:

```
read_graph
```

Search for entities related to current work:

```
search_nodes query="<file-or-topic>"
```

### 3. During Work — Track Everything

After every significant action, record it:

```
add_observation observations=[{
  "entityName": "project:<name>",
  "contents": ["[<timestamp>] action: <what> | impact: <effect> | files: <list>"]
}]
```

## Entity Naming Schema

| Type | Pattern | Example |
|------|---------|---------|
| `project` | `project:<name>` | `project:guardian-mcp` |
| `file` | `file:<relative-path>` | `file:src/server.ts` |
| `function` | `func:<file>:<name>` | `func:src/server.ts:createEntity` |
| `task` | `task:<id>:<slug>` | `task:T001:fix-auth-bug` |
| `decision` | `decision:<date>:<slug>` | `decision:2026-07-02:use-sqlite` |
| `bug` | `bug:<id>:<slug>` | `bug:B001:null-pointer` |
| `feature` | `feature:<name>` | `feature:auto-tracking` |
| `milestone` | `milestone:<name>` | `milestone:v1-release` |
| `person` | `person:<name>` | `person:azzar` |
| `resource` | `resource:<name>` | `resource:redis-cache` |
| `risk` | `risk:<slug>` | `risk:data-loss` |

## Relation Schema

| Relation | Meaning | Example |
|----------|---------|---------|
| `implements` | Code fulfills requirement | `file:auth.ts` → `feature:login` |
| `depends_on` | Task requires another | `task:T002` → `task:T001` |
| `blocks` | Prevents progress | `bug:B001` → `task:T003` |
| `owns` | Person responsible | `person:azzar` → `project:guardian` |
| `relates_to` | General connection | `decision:X` → `feature:Y` |
| `part_of` | Component of | `file:auth.ts` → `feature:auth-system` |
| `precedes` | Must come before | `milestone:v1` → `milestone:v2` |
| `supports` | Enables | `resource:redis` → `feature:caching` |

## Observation Patterns

Use these prefixes for consistent, queryable observations:

```
[<timestamp>] action: <what was done> | impact: <what changed> | files: <list>
[DECISION] chose <A> over <B> | reason: <rationale> | tradeoffs: <list>
[BUG] <error message> | cause: <root cause> | fix: <solution>
[PROGRESS] <percentage> | <milestone> | <blockers if any>
[REVIEW] <feedback summary> | action: <follow-up needed>
[DEPLOY] <environment> | status: <success/fail> | notes: <details>
[REFACTOR] <scope> | reason: <why> | before: <state> | after: <state>
```

## Workflow Templates

### New Feature

1. `create_entity` → `feature:<name>` with goal observations
2. `create_entity` → `task:<id>:<subtask>` for each implementation step
3. `create_relation` → tasks `depends_on` each other sequentially
4. During coding: `create_entity` → `file:<path>` for new files
5. `create_relation` → `file:` `implements` `feature:`
6. After each task: `add_observation` with `[PROGRESS]`

### Bug Fix

1. `create_entity` → `bug:<id>:<slug>` with error details
2. `search_nodes` for related entities
3. `create_relation` → `bug:` `blocks` affected `task:`
4. During investigation: `add_observation` with findings
5. After fix: `add_observation` with `[BUG]` resolution pattern
6. `delete_relation` → remove `blocks` relation

### Sprint Planning

1. `create_entity` → `milestone:<sprint-name>` with date observations
2. `create_entity` → `task:<id>:<title>` for each sprint item
3. `create_relation` → all sprint tasks `part_of` milestone
4. `create_relation` → dependent tasks with `depends_on`
5. `add_observation` → sprint goals and capacity

## Performance Rules

- **Batch entity creation** when setting up (pass array to `create_entity`)
- **Batch relation creation** similarly
- Use `search_nodes` before creating to avoid duplicates
- Use `open_node` to check if entity exists before creating
- Keep observations concise — one line per observation
- Use `query_data` for complex SQL when `search_nodes` isn't enough

## Integration with Other Skills

- **guardian-tracker**: Automatically creates entities/observations after file edits
- **guardian-session**: Loads context from memory.db at session start
- Both skills use the same naming conventions defined here
