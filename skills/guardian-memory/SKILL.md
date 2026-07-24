---
name: guardian-memory
description: "Maintain project context in Project Guardian's memory.db knowledge graph. Use during coding, debugging, planning, and project-management sessions to restore relevant context and record significant decisions, changes, tasks, and milestones."
---

# Guardian Memory

## Purpose

Every project interaction creates knowledge. This skill ensures nothing is lost. Use Project-Guardian MCP tools to maintain a living knowledge graph of your project in `memory.db`.

## Safety

- Never store credentials, tokens, private keys, or sensitive personal data in observations.
- Ask before any operation that installs hooks, modifies repository files, consolidates databases, or deletes source databases.
- Record significant work only; skip trivial reads, formatting, and transient details.

## Quick Start

### 1. Initialize Project (First Use Only)

```
initialize_memory
```

`initialize_memory` may modify repository configuration, install hooks, and consolidate databases. Explain the effects and get user approval before calling it.

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

Search for entities related to the current project, directory, file, or topic:

```
search_nodes query="<file-or-topic>"
```

Use `open_node` for exact entities. Use `read_graph` only when the graph is known to be small or the user explicitly requests a complete view.

### 3. During Work — Track Everything

After every significant action, record it:

```
add_observation observations=[{
  "entityName": "project:<name>",
  "contents": ["[<timestamp>] action: <what> | impact: <effect> | files: <list>"]
}]
```

## Entity Naming Schema

See `references/entity-schema.md` for detailed examples.

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

See `references/relation-schema.md` for detailed examples and query guidance.

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
- Use `query_data` for structured table filtering, ordering, and pagination when `search_nodes` is insufficient

## Integration with Other Skills

- **guardian-tracker**: Automatically creates entities/observations after file edits
- **guardian-session**: Loads context from memory.db at session start
- Both skills use the same naming conventions defined here
