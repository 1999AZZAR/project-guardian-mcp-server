#!/usr/bin/env python3
"""Report exact Git change paths for Project Guardian tracking."""

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone


def run_git(args: list[str]) -> str:
    result = subprocess.run(["git", *args], capture_output=True, text=True, check=True)
    return result.stdout


def commit_info(revision: str) -> dict[str, str]:
    fields = run_git(["log", "-1", "--format=%H%x00%s%x00%ai", revision]).rstrip("\n").split("\0")
    if len(fields) != 3:
        raise ValueError(f"Unable to parse commit metadata for {revision}")
    return {"hash": fields[0], "message": fields[1], "date": fields[2]}


def empty_tree() -> str:
    return run_git(["hash-object", "-t", "tree", "/dev/null"]).strip()


def parent_or_empty(commit: str) -> str:
    try:
        return run_git(["rev-parse", f"{commit}^" ]).strip()
    except subprocess.CalledProcessError:
        return empty_tree()


def base_from_since(value: str) -> str:
    if value.isdigit():
        return f"HEAD~{value}"
    revision = run_git(["rev-list", "-1", f"--before={value}", "HEAD"]).strip()
    if not revision:
        raise ValueError(f"No commit found before {value!r}")
    return revision


def changed_files(base: str, target: str | None = None) -> list[dict[str, str]]:
    args = ["diff", "--name-status", "-z", base]
    if target:
        args.append(target)
    records = run_git(args).split("\0")
    files = []
    index = 0
    while index < len(records) and records[index]:
        status = records[index]
        index += 1
        old_path = None
        if status.startswith(("R", "C")):
            old_path, path = records[index:index + 2]
            index += 2
        else:
            path = records[index]
            index += 1
        entry = {"path": path, "changes": status}
        if old_path:
            entry["old_path"] = old_path
        files.append(entry)
    return files


def untracked_files() -> list[dict[str, str]]:
    return [
        {"path": path, "changes": "??"}
        for path in run_git(["ls-files", "--others", "--exclude-standard", "-z"]).split("\0")
        if path
    ]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--commit", "-c", help="Specific commit to analyze")
    group.add_argument("--since", "-s", default="1", help="Changes since N commits ago or a Git date")
    parser.add_argument("--format", "-f", choices=("json", "text"), default="json")
    args = parser.parse_args()

    try:
        run_git(["rev-parse", "--git-dir"])
        now = datetime.now(timezone.utc).isoformat()
        if args.commit:
            commit = commit_info(args.commit)
            files = changed_files(parent_or_empty(args.commit), args.commit)
        else:
            commit = {"hash": "WORKTREE", "message": "current changes", "date": now}
            files = changed_files(base_from_since(args.since)) + untracked_files()
        deduplicated = {entry["path"]: entry for entry in files}
        files = list(deduplicated.values())
    except (subprocess.CalledProcessError, ValueError) as exc:
        detail = exc.stderr.strip() if isinstance(exc, subprocess.CalledProcessError) and exc.stderr else str(exc)
        print(f"Error: {detail}", file=sys.stderr)
        return 1

    output = {"timestamp": now, "commit": commit, "files": files}
    if args.format == "json":
        print(json.dumps(output, indent=2))
    else:
        print(f"Revision: {commit['hash']}\nFiles changed: {len(files)}")
        for entry in files:
            print(f"  {entry['changes']} {entry['path']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
