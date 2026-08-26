#!/usr/bin/env python3
"""Scan project text files for likely hardcoded credentials."""

import argparse
import json
import os
import re
import sys
from pathlib import Path


PATTERNS = {
    "Generic API Key": re.compile(
        r"(?:key|api|token|secret|auth|password|pwd)\s*[:=]\s*['\"]?([a-zA-Z0-9_-]{16,})",
        re.IGNORECASE,
    ),
    "Google API Key": re.compile(r"AIza[0-9A-Za-z_-]{35}"),
    "Slack Webhook": re.compile(
        r"https://hooks\.slack\.com/services/T[a-zA-Z0-9_]{8}/B[a-zA-Z0-9_]{8}/[a-zA-Z0-9_]{24}"
    ),
    "Firebase Config": re.compile(r"apiKey:\s*['\"][A-Za-z0-9_-]{35,45}['\"]"),
    "Private Key": re.compile(r"-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----"),
}
DANGEROUS_PATHS = {Path(path).resolve() for path in ("/", "/etc", "/var", "/usr", "/boot", "/dev", "/root")}
DEFAULT_EXCLUDES = {".git", "node_modules", "venv", ".venv", "__pycache__"}
MAX_FILE_BYTES = 5 * 1024 * 1024


def scan_file(path: Path) -> tuple[list[dict[str, object]], str | None]:
    if path.is_symlink():
        return [], f"Skipped symlink: {path}"
    try:
        if path.stat().st_size > MAX_FILE_BYTES:
            return [], f"Skipped file larger than {MAX_FILE_BYTES} bytes: {path}"
        findings = []
        with path.open("r", encoding="utf-8", errors="strict") as handle:
            for line_number, line in enumerate(handle, 1):
                for name, pattern in PATTERNS.items():
                    if pattern.search(line):
                        findings.append({"type": name, "line": line_number, "file": str(path)})
        return findings, None
    except (OSError, UnicodeError) as exc:
        return [], f"Unable to scan {path}: {exc}"


def iter_files(target: Path, excludes: set[str]):
    if target.is_file() or target.is_symlink():
        yield target
        return
    for root, dirs, files in os.walk(target, followlinks=False):
        dirs[:] = [name for name in dirs if name not in excludes]
        for name in files:
            yield Path(root, name)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", type=Path, help="Project directory or file to scan")
    parser.add_argument("--exclude", action="append", default=[], help="Directory name to exclude")
    args = parser.parse_args()

    target = args.path.expanduser().absolute()
    resolved = target.resolve(strict=False)
    if not target.exists():
        print(json.dumps({"error": f"Path does not exist: {target}"}), file=sys.stderr)
        return 2
    if resolved in DANGEROUS_PATHS:
        print(json.dumps({"error": f"Refusing to scan system path: {resolved}"}), file=sys.stderr)
        return 2

    findings = []
    errors = []
    excludes = DEFAULT_EXCLUDES | set(args.exclude)
    for path in iter_files(target, excludes):
        file_findings, error = scan_file(path)
        findings.extend(file_findings)
        if error:
            errors.append(error)

    result = {"findings": findings, "errors": errors, "scanned_path": str(target)}
    print(json.dumps(result, indent=2))
    if errors:
        return 2
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main())
