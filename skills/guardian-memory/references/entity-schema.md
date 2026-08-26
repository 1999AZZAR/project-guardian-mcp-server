# Entity Type Reference

## Standard Entity Types

### `project`
Top-level container for all project work.
```json
{
  "name": "project:<name>",
  "entityType": "project",
  "observations": [
    "[INIT] Created | repo: <url> | stack: <tech>",
    "[CONTEXT] <description>"
  ]
}
```

### `file`
Source files, configs, documentation.
```json
{
  "name": "file:<relative-path>",
  "entityType": "file",
  "observations": [
    "[CREATE] New file | purpose: <why> | lines: <count>",
    "[EDIT] Modified | changes: <summary> | impact: <effect>"
  ]
}
```

### `function`
Specific functions or methods within files.
```json
{
  "name": "func:<file>:<name>",
  "entityType": "function",
  "observations": [
    "[CREATE] New function | params: <list> | returns: <type>",
    "[REFACTOR] Changed signature | before: <old> | after: <new>"
  ]
}
```

### `task`
Work items, deliverables, action items.
```json
{
  "name": "task:<id>:<slug>",
  "entityType": "task",
  "observations": [
    "[CREATE] Task created | priority: <high/med/low> | assignee: <person>",
    "[PROGRESS] 50% | Blocker: <description>",
    "[COMPLETE] Done | duration: <time> | notes: <summary>"
  ]
}
```

### `feature`
Functional capabilities or user stories.
```json
{
  "name": "feature:<name>",
  "entityType": "feature",
  "observations": [
    "[DEFINE] Requirements: <list>",
    "[IMPLEMENT] Core logic done | files: <list>",
    "[TEST] Unit tests passing | coverage: <percent>"
  ]
}
```

### `bug`
Issues, defects, errors.
```json
{
  "name": "bug:<id>:<slug>",
  "entityType": "bug",
  "observations": [
    "[REPORT] <error message> | severity: <critical/high/med/low>",
    "[INVESTIGATE] Root cause: <description>",
    "[FIX] Solution: <what was done> | files: <list>"
  ]
}
```

### `decision`
Architecture or design choices.
```json
{
  "name": "decision:<date>:<slug>",
  "entityType": "decision",
  "observations": [
    "[DECIDE] Chose <A> over <B> | reason: <why> | tradeoffs: <list>"
  ]
}
```

### `milestone`
Checkpoints, releases, deadlines.
```json
{
  "name": "milestone:<name>",
  "entityType": "milestone",
  "observations": [
    "[DEFINE] Target: <date> | scope: <what's included>",
    "[PROGRESS] 75% | remaining: <list>",
    "[REACH] Completed | duration: <time>"
  ]
}
```

### `person`
Team members, stakeholders.
```json
{
  "name": "person:<name>",
  "entityType": "person",
  "observations": [
    "[ROLE] <role> | focus: <areas>",
    "[CONTRIBUTION] <what they did>"
  ]
}
```

### `resource`
Tools, infrastructure, dependencies.
```json
{
  "name": "resource:<name>",
  "entityType": "resource",
  "observations": [
    "[ADD] <tool/service> | purpose: <why> | config: <details>",
    "[UPDATE] Changed config | reason: <why>"
  ]
}
```

### `risk`
Potential issues or concerns.
```json
{
  "name": "risk:<slug>",
  "entityType": "risk",
  "observations": [
    "[IDENTIFY] <description> | impact: <high/med/low> | likelihood: <high/med/low>",
    "[MITIGATE] Action: <what> | status: <resolved/monitoring>"
  ]
}
```
