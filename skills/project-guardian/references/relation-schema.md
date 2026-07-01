# Relation Type Reference

## Standard Relation Types

### `implements`
Code fulfills a requirement or feature.
```
file:auth.ts --implements--> feature:login-system
func:auth.ts:validateToken --implements--> feature:auth
```

### `depends_on`
Task requires another to complete first.
```
task:T002:api-endpoints --depends_on--> task:T001:database-schema
feature:frontend --depends_on--> feature:backend-api
```

### `blocks`
Prevents another entity from progressing.
```
bug:B001:null-pointer --blocks--> task:T003:deploy
risk:data-loss --blocks--> milestone:v1-release
```

### `owns`
Person or team responsible for an entity.
```
person:azzar --owns--> project:guardian-mcp
person:dev1 --owns--> feature:auth
```

### `relates_to`
General connection between entities.
```
decision:use-sqlite --relates_to--> feature:storage
task:T001 --relates_to--> decision:architecture-v2
```

### `part_of`
Component belongs to a larger entity.
```
file:auth.ts --part_of--> feature:auth-system
func:server.ts:start --part_of--> file:server.ts
task:T001 --part_of--> milestone:v1-sprint
```

### `precedes`
Must come before in sequence.
```
milestone:alpha --precedes--> milestone:beta
task:T001 --precedes--> task:T002
```

### `supports`
Provides capability or infrastructure.
```
resource:redis-cache --supports--> feature:caching
resource:ci-pipeline --supports--> milestone:v1-release
```

## Creating Relations

```json
create_relation relations=[{
  "from": "entity-a",
  "to": "entity-b",
  "relationType": "implements"
}]
```

## Batch Relations

```json
create_relation relations=[
  {"from": "task:T001", "to": "feature:auth", "relationType": "part_of"},
  {"from": "task:T002", "to": "feature:auth", "relationType": "part_of"},
  {"from": "task:T002", "to": "task:T001", "relationType": "depends_on"}
]
```

## Querying Relations

Use `search_nodes` with entity names to find connected entities:
```json
search_nodes query="task:T001"
```

Or use `open_node` to get full entity details including relations:
```json
open_node names=["task:T001"]
```

## Deleting Relations

```json
delete_relation relations=[{
  "from": "bug:B001",
  "to": "task:T003",
  "relationType": "blocks"
}]
```
