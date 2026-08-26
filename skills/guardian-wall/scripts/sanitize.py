#!/usr/bin/env python3
"""Normalize untrusted text and detect common prompt-injection indicators."""

import argparse
import base64
import binascii
import html
import json
import re
import sys
import unicodedata
from pathlib import Path


PATTERNS = {
    "instruction_override": r"\b(?:ignore|disregard|forget)\s+(?:(?:all|any)\s+)?(?:previous|prior|above|earlier|system)\s+(?:instructions?|messages?|rules?|prompts?)\b",
    "system_override": r"\b(?:system\s+override|administrative\s+access|disable\s+(?:all\s+)?(?:filters?|safety|guardrails?))\b",
    "persona_override": r"\b(?:you\s+are\s+now|adopt\s+the\s+persona|act\s+as\s+(?:a|an))\b",
    "role_mimicry": r"(?:\[\s*(?:system|admin)(?:\s+message)?\s*\]|#{1,6}\s*system\b|\b(?:assistant|system)\s*:)",
    "hidden_content": r"(?:display\s*:\s*none|font-size\s*:\s*0|visibility\s*:\s*hidden|color\s*:\s*transparent)",
    "remote_exfiltration": r"(?:!\[[^\]]*\]\(https?://|<img\b[^>]*\bsrc\s*=\s*[\"']?https?://)",
}
SENSITIVE_TERMS = re.compile(
    r"\b(?:ignore|disregard|system|override|assistant|password|secret|token|forget)\b",
    re.IGNORECASE,
)
BASE64_TOKEN = re.compile(r"(?<![A-Za-z0-9_+/=-])[A-Za-z0-9_+/=-]{16,}(?![A-Za-z0-9_+/=-])")


def normalize_text(text: str) -> tuple[str, list[str]]:
    alerts = []
    decoded = html.unescape(text)
    normalized = unicodedata.normalize("NFKC", decoded)
    hidden = [char for char in normalized if unicodedata.category(char) == "Cf"]
    if hidden:
        alerts.append("hidden_format_characters")
    normalized = "".join(
        char
        for char in normalized
        if unicodedata.category(char) != "Cf"
        and (char.isprintable() or char in "\n\r\t")
    )
    return normalized, alerts


def detect_base64(text: str) -> list[str]:
    alerts = []
    for token in BASE64_TOKEN.findall(text):
        candidate = token.replace("-", "+").replace("_", "/")
        candidate += "=" * (-len(candidate) % 4)
        try:
            decoded = base64.b64decode(candidate, validate=True).decode("utf-8")
        except (binascii.Error, UnicodeDecodeError, ValueError):
            continue
        if SENSITIVE_TERMS.search(decoded):
            alerts.append("encoded_instruction_like_content")
    return alerts


def inspect_text(text: str) -> dict[str, object]:
    normalized, alerts = normalize_text(text)
    detection_text = re.sub(r"\s+", " ", normalized)
    alerts.extend(
        label
        for label, pattern in PATTERNS.items()
        if re.search(pattern, detection_text, re.IGNORECASE)
    )
    alerts.extend(detect_base64(normalized))
    unique_alerts = list(dict.fromkeys(alerts))
    return {
        "suspicious": bool(unique_alerts),
        "alerts": unique_alerts,
        "normalized_text": normalized,
        "warning": "Detection is heuristic; normalized text remains untrusted data.",
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group()
    source.add_argument("--file", type=Path, help="Read text from this file")
    source.add_argument("--text", help="Read text from argv; stdin is safer for sensitive data")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        text = args.file.read_text(encoding="utf-8") if args.file else (
            args.text if args.text is not None else sys.stdin.read()
        )
    except (OSError, UnicodeError) as exc:
        print(json.dumps({"error": f"Unable to read input: {exc}"}), file=sys.stderr)
        return 1

    result = inspect_text(text)
    print(json.dumps(result, ensure_ascii=False))
    return 2 if result["suspicious"] else 0


if __name__ == "__main__":
    sys.exit(main())
