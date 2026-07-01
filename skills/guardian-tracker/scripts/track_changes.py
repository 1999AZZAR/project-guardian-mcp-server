#!/usr/bin/env python3
"""Track git changes and output JSON for Project-Guardian entity creation.

Usage:
    python3 track_changes.py [--commit <hash>] [--since <time>] [--format json|text]

Outputs changed files with summaries, ready for entity/observation creation.
"""

import argparse
import json
import subprocess
import sys
from datetime import datetime


def run_git(args: list[str]) -> str:
    result = subprocess.run(
        ["git"] + args,
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout.strip()


def get_commit_info(commit_hash: str) -> dict:
    info = run_git(["log", "-1", "--format=%H|%s|%an|%ai", commit_hash])
    parts = info.split("|", 3)
    return {
        "hash": parts[0] if len(parts) > 0 else commit_hash,
        "message": parts[1] if len(parts) > 1 else "",
        "author": parts[2] if len(parts) > 2 else "",
        "date": parts[3] if len(parts) > 3 else "",
    }


def get_changed_files(commit_hash: str) -> list[dict]:
    stat = run_git(["diff", f"{commit_hash}~1", commit_hash, "--stat", "--format="])
    files = []
    for line in stat.splitlines():
        if "|" in line:
            parts = line.split("|")
            filepath = parts[0].strip()
            changes = parts[1].strip()
            files.append({"path": filepath, "changes": changes})
    return files


def get_changed_files_since(since: str) -> list[dict]:
    stat = run_git(["diff", f"HEAD~{since}" if since.isdigit() else since, "--stat", "--format="])
    files = []
    for line in stat.splitlines():
        if "|" in line:
            parts = line.split("|")
            filepath = parts[0].strip()
            changes = parts[1].strip()
            files.append({"path": filepath, "changes": changes})
    return files


def get_diff_summary(commit_hash: str, filepath: str) -> str:
    try:
        diff = run_git(["diff", f"{commit_hash}~1", commit_hash, "--", filepath, "--shortstat"])
        return diff
    except subprocess.CalledProcessError:
        return ""


def format_text_output(data: dict) -> str:
    lines = [f"Commit: {data['commit']['hash'][:8]}"]
    lines.append(f"Message: {data['commit']['message']}")
    lines.append(f"Author: {data['commit']['author']}")
    lines.append(f"Date: {data['commit']['date']}")
    lines.append(f"Files changed: {len(data['files'])}")
    lines.append("")
    for f in data["files"]:
        lines.append(f"  {f['path']} ({f['changes']})")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Track git changes for Project-Guardian")
    parser.add_argument("--commit", "-c", help="Specific commit hash to analyze")
    parser.add_argument("--since", "-s", default="1", help="Changes since N commits ago or date")
    parser.add_argument("--format", "-f", choices=["json", "text"], default="json")
    args = parser.parse_args()

    try:
        run_git(["rev-parse", "--git-dir"])
    except subprocess.CalledProcessError:
        print("Error: Not a git repository", file=sys.stderr)
        sys.exit(1)

    now = datetime.utcnow().isoformat() + "Z"

    if args.commit:
        commit = get_commit_info(args.commit)
        files = get_changed_files(args.commit)
    else:
        commit = {
            "hash": "HEAD",
            "message": "current changes",
            "author": "",
            "date": now,
        }
        files = get_changed_files_since(args.since)

    output = {
        "timestamp": now,
        "commit": commit,
        "files": files,
        "suggestions": [],
    }

    for f in files:
        path = f["path"]
        if path.endswith((".ts", ".js", ".py", ".go", ".rs", ".java", ".cpp", ".c")):
            entity_type = "file"
            name = f"file:{path}"
        elif path.endswith((".json", ".yaml", ".yml", ".toml", ".env")):
            entity_type = "file"
            name = f"file:{path}"
        elif path.endswith((".md", ".txt", ".rst")):
            entity_type = "file"
            name = f"file:{path}"
        else:
            entity_type = "file"
            name = f"file:{path}"

        output["suggestions"].append({
            "entity": {"name": name, "entityType": entity_type},
            "observation": f"[{now[:10]}] commit:{commit['hash'][:8]} | changes: {f['changes']}",
        })

    if args.format == "json":
        print(json.dumps(output, indent=2))
    else:
        print(format_text_output(output))


if __name__ == "__main__":
    main()
