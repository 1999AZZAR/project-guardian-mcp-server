#!/usr/bin/env python3
"""Load project context from memory.db for session continuity.

Usage:
    python3 load_context.py [--dir <path>] [--project <name>] [--format json|text]

Reads memory.db and outputs project summary, active tasks, recent changes.
"""

import argparse
import json
import os
import sqlite3
import sys
from datetime import datetime, timezone


def find_memory_db(start_dir: str = ".") -> str | None:
    """Walk up directories to find memory.db."""
    current = os.path.abspath(start_dir)
    while True:
        db_path = os.path.join(current, "memory.db")
        if os.path.exists(db_path):
            return db_path
        parent = os.path.dirname(current)
        if parent == current:
            return None
        current = parent


def connect_db(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def get_all_entities(conn: sqlite3.Connection) -> list[dict]:
    cursor = conn.execute("SELECT * FROM entities ORDER BY updated_at DESC")
    return [dict(row) for row in cursor.fetchall()]


def get_all_relations(conn: sqlite3.Connection) -> list[dict]:
    cursor = conn.execute("SELECT * FROM relations ORDER BY created_at DESC")
    return [dict(row) for row in cursor.fetchall()]


def get_entities_by_type(conn: sqlite3.Connection, entity_type: str) -> list[dict]:
    cursor = conn.execute(
        "SELECT * FROM entities WHERE entity_type = ? ORDER BY updated_at DESC",
        (entity_type,),
    )
    return [dict(row) for row in cursor.fetchall()]


def get_recent_entities(conn: sqlite3.Connection, limit: int = 10) -> list[dict]:
    cursor = conn.execute(
        "SELECT * FROM entities ORDER BY updated_at DESC LIMIT ?", (limit,)
    )
    return [dict(row) for row in cursor.fetchall()]


def search_entities(conn: sqlite3.Connection, query: str) -> list[dict]:
    like_query = f"%{query}%"
    cursor = conn.execute(
        "SELECT * FROM entities WHERE name LIKE ? OR entity_type LIKE ? OR observations LIKE ?",
        (like_query, like_query, like_query),
    )
    return [dict(row) for row in cursor.fetchall()]


def parse_observations(obs_json: str) -> list[str]:
    try:
        observations = json.loads(obs_json)
    except (json.JSONDecodeError, TypeError):
        return []
    return observations if isinstance(observations, list) and all(isinstance(item, str) for item in observations) else []


def get_latest_observation(entity: dict) -> str:
    obs = parse_observations(entity.get("observations", "[]"))
    return obs[-1] if obs else ""


def has_latest_status(observations: list[str], complete: tuple[str, ...], reopen: tuple[str, ...]) -> bool:
    for observation in reversed(observations):
        upper = observation.upper()
        if any(marker in upper for marker in reopen):
            return False
        if any(marker in upper for marker in complete):
            return True
    return False


def build_project_summary(conn: sqlite3.Connection) -> dict:
    summary = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "project": None,
        "stats": {},
        "active_tasks": [],
        "open_bugs": [],
        "recent_changes": [],
        "entities": [],
        "relations": [],
        "suggested_next": [],
    }

    all_entities = get_all_entities(conn)
    all_relations = get_all_relations(conn)

    summary["stats"] = {
        "total_entities": len(all_entities),
        "total_relations": len(all_relations),
        "by_type": {},
    }

    for e in all_entities:
        t = e["entity_type"]
        summary["stats"]["by_type"][t] = summary["stats"]["by_type"].get(t, 0) + 1

    for e in all_entities:
        obs = parse_observations(e.get("observations", "[]"))
        latest = obs[-1] if obs else ""

        entry = {
            "name": e["name"],
            "type": e["entity_type"],
            "updated": e.get("updated_at", ""),
            "latest_observation": latest,
        }

        if e["entity_type"] == "task":
            is_complete = has_latest_status(obs, ("[COMPLETE]", "[DONE]"), ("[REOPEN]", "[IN PROGRESS]"))
            if not is_complete:
                summary["active_tasks"].append(entry)

        elif e["entity_type"] == "bug":
            is_fixed = has_latest_status(obs, ("[FIX]", "[RESOLVED]"), ("[REOPEN]", "[REGRESSION]"))
            if not is_fixed:
                summary["open_bugs"].append(entry)

        summary["entities"].append(entry)

    summary["recent_changes"] = [
        {
            "name": entity["name"],
            "type": entity["entity_type"],
            "updated": entity.get("updated_at", ""),
            "latest_observation": get_latest_observation(entity),
        }
        for entity in get_recent_entities(conn, 10)
    ]
    summary["relations"] = all_relations[:20]

    blocked = []
    for r in all_relations:
        if r.get("relation_type") == "blocks":
            blocked.append(r)

    if blocked:
        summary["suggested_next"].append(
            f"Resolve {len(blocked)} blocking relationship(s)"
        )

    incomplete_tasks = [t for t in summary["active_tasks"]][:3]
    if incomplete_tasks:
        summary["suggested_next"].extend(
            [f"Continue: {t['name']}" for t in incomplete_tasks]
        )

    return summary


def format_text_output(data: dict) -> str:
    lines = []
    lines.append(f"Project: {data.get('project', 'unknown')}")
    lines.append(f"Loaded: {data['timestamp']}")
    lines.append(f"Entities: {data['stats']['total_entities']} | Relations: {data['stats']['total_relations']}")
    lines.append("")

    if data["stats"]["by_type"]:
        lines.append("Entity types:")
        for t, count in data["stats"]["by_type"].items():
            lines.append(f"  {t}: {count}")
        lines.append("")

    if data["active_tasks"]:
        lines.append(f"Active tasks ({len(data['active_tasks'])}):")
        for t in data["active_tasks"][:5]:
            lines.append(f"  {t['name']} — {t['latest_observation'][:80]}")
        lines.append("")

    if data["open_bugs"]:
        lines.append(f"Open bugs ({len(data['open_bugs'])}):")
        for b in data["open_bugs"][:5]:
            lines.append(f"  {b['name']} — {b['latest_observation'][:80]}")
        lines.append("")

    if data["recent_changes"]:
        lines.append("Recent changes:")
        for c in data["recent_changes"][:5]:
            lines.append(f"  {c['name']} — {c['latest_observation'][:80]}")
        lines.append("")

    if data["suggested_next"]:
        lines.append("Suggested next actions:")
        for s in data["suggested_next"]:
            lines.append(f"  - {s}")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Load project context from memory.db")
    parser.add_argument("--dir", "-d", default=".", help="Working directory to search from")
    parser.add_argument("--format", "-f", choices=["json", "text"], default="json")
    args = parser.parse_args()

    db_path = find_memory_db(args.dir)
    if not db_path:
        print(json.dumps({"error": "memory.db not found", "searched_from": os.path.abspath(args.dir)}))
        sys.exit(1)

    conn = connect_db(db_path)
    summary = build_project_summary(conn)
    conn.close()

    if args.format == "json":
        print(json.dumps(summary, indent=2, default=str))
    else:
        print(format_text_output(summary))


if __name__ == "__main__":
    main()
