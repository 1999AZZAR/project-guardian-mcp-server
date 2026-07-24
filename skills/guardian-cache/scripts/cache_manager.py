#!/usr/bin/env python3
"""
Mema Memory Cache Manager. Fast, robust Redis client with key validation.
Uses redis-py connection pool, SCAN (not KEYS), timeouts, and retries.
"""
import argparse
import json
import os
import re
import sys
from typing import Optional, cast

try:
    import redis
    from redis.backoff import ExponentialBackoff
    from redis.retry import Retry
except ImportError:
    print("Error: redis package required. Run: pip install redis", file=sys.stderr)
    sys.exit(1)

REDIS_URL = os.getenv("REDIS_URL")
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD") or None

KEY_PREFIX = "mema:"
KEY_PATTERN = re.compile(r"^mema:[a-z]+:[a-zA-Z0-9_:.-]+$")
MAX_KEY_LEN = 512
MAX_VALUE_BYTES = 512 * 1024  # 512 KiB


class CacheError(Exception):
    pass


class KeyValidationError(CacheError):
    pass


def _client() -> redis.Redis:
    try:
        port = int(os.getenv("REDIS_PORT", "6379"))
        db = int(os.getenv("REDIS_DB", "0"))
        socket_timeout = float(os.getenv("REDIS_SOCKET_TIMEOUT", "5.0"))
        connect_timeout = float(os.getenv("REDIS_SOCKET_CONNECT_TIMEOUT", "2.0"))
    except ValueError as exc:
        raise CacheError("Redis numeric configuration is invalid") from exc

    retry = Retry(ExponentialBackoff(cap=1.0), 3)
    try:
        if REDIS_URL:
            return redis.from_url(
                REDIS_URL,
                socket_timeout=socket_timeout,
                socket_connect_timeout=connect_timeout,
                retry=retry,
                retry_on_timeout=True,
                decode_responses=True,
            )
        return redis.Redis(
            host=REDIS_HOST,
            port=port,
            db=db,
            password=REDIS_PASSWORD,
            socket_timeout=socket_timeout,
            socket_connect_timeout=connect_timeout,
            retry=retry,
            retry_on_timeout=True,
            decode_responses=True,
        )
    except (TypeError, ValueError) as exc:
        raise CacheError("Redis connection configuration is invalid") from exc


def validate_key(key: str) -> None:
    if not key or not isinstance(key, str):
        raise KeyValidationError("Key must be a non-empty string")
    if len(key) > MAX_KEY_LEN:
        raise KeyValidationError(f"Key length exceeds {MAX_KEY_LEN}")
    if not key.startswith(KEY_PREFIX):
        raise KeyValidationError(f"Key must start with {KEY_PREFIX}")
    if not KEY_PATTERN.match(key):
        raise KeyValidationError(
            f"Key must match mema:<category>:<name> (snake_case, alphanumeric, : . - _)"
        )


def set_key(key: str, value: str, ttl: Optional[int] = None) -> str:
    validate_key(key)
    if len(value.encode("utf-8")) > MAX_VALUE_BYTES:
        raise CacheError(f"Value size exceeds {MAX_VALUE_BYTES} bytes")
    if ttl is not None and ttl <= 0:
        raise KeyValidationError("TTL must be positive")
    r = _client()
    try:
        if ttl is not None:
            r.set(key, value, ex=ttl)
        else:
            r.set(key, value)
        return "OK"
    except redis.RedisError as e:
        raise CacheError(str(e))


def get_key(key: str) -> Optional[str]:
    validate_key(key)
    r = _client()
    try:
        return cast(Optional[str], r.get(key))
    except redis.RedisError as e:
        raise CacheError(str(e))


def del_key(key: str) -> int:
    validate_key(key)
    r = _client()
    try:
        return cast(int, r.delete(key))
    except redis.RedisError as e:
        raise CacheError(str(e))


def exists_key(key: str) -> int:
    validate_key(key)
    r = _client()
    try:
        return cast(int, r.exists(key))
    except redis.RedisError as e:
        raise CacheError(str(e))


def key_ttl(key: str) -> int:
    validate_key(key)
    r = _client()
    try:
        ttl = cast(int, r.ttl(key))
        return ttl if ttl is not None else -2
    except redis.RedisError as e:
        raise CacheError(str(e))


def expire_key(key: str, ttl: int) -> bool:
    validate_key(key)
    if ttl <= 0:
        raise KeyValidationError("TTL must be positive")
    r = _client()
    try:
        return cast(bool, r.expire(key, ttl))
    except redis.RedisError as e:
        raise CacheError(str(e))


def scan_keys(pattern: str, count: int = 100):
    if count <= 0:
        raise KeyValidationError("SCAN count must be positive")
    if pattern == "*":
        pattern = f"{KEY_PREFIX}*"
    elif not pattern.startswith(KEY_PREFIX):
        pattern = f"{KEY_PREFIX}*{pattern}*"
    r = _client()
    try:
        yield from r.scan_iter(match=pattern, count=count)
    except redis.RedisError as e:
        raise CacheError(str(e))


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Mema Memory Cache Manager",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    p_set = subparsers.add_parser("set", help="Set a key (mema:category:name)")
    p_set.add_argument("key", help="Key (e.g. mema:cache:search:123)")
    p_set.add_argument("value", nargs="?", help="String value; prefer --stdin")
    p_set.add_argument("--stdin", action="store_true", help="Read value from standard input")
    p_set.add_argument("--ttl", type=int, help="TTL in seconds")
    p_set.add_argument("--json", action="store_true", help="Encode value as JSON")

    p_get = subparsers.add_parser("get", help="Get a key")
    p_get.add_argument("key")
    p_get.add_argument("--json", action="store_true", help="Decode value as JSON")

    p_del = subparsers.add_parser("del", help="Delete a key")
    p_del.add_argument("key")

    p_exists = subparsers.add_parser("exists", help="Return 1 if key exists, 0 otherwise")
    p_exists.add_argument("key")

    p_ttl = subparsers.add_parser("ttl", help="Get key TTL in seconds (-1 no expiry, -2 missing)")
    p_ttl.add_argument("key")

    p_expire = subparsers.add_parser("expire", help="Set TTL on existing key")
    p_expire.add_argument("key")
    p_expire.add_argument("seconds", type=int, help="TTL in seconds")

    p_scan = subparsers.add_parser("scan", help="List keys by pattern (SCAN, safe for production)")
    p_scan.add_argument("pattern", default="*", nargs="?", help="Glob pattern (default: mema:*)")
    p_scan.add_argument("--count", type=int, default=100, help="SCAN count hint")

    p_keys = subparsers.add_parser("keys", help="List keys by pattern (alias for scan)")
    p_keys.add_argument("pattern", default="*", nargs="?", help="Glob pattern (default: mema:*)")

    p_ping = subparsers.add_parser("ping", help="Check Redis connection")

    args = parser.parse_args()

    try:
        if args.command == "set":
            if args.stdin == (args.value is not None):
                raise KeyValidationError("Provide exactly one of value or --stdin")
            value = sys.stdin.read() if args.stdin else args.value
            if getattr(args, "json", False):
                try:
                    json.loads(value)
                except json.JSONDecodeError:
                    value = json.dumps(value)
            print(set_key(args.key, value, getattr(args, "ttl", None)))
        elif args.command == "get":
            out = get_key(args.key)
            if out is None:
                return 0
            if getattr(args, "json", False):
                try:
                    parsed = json.loads(out)
                    print(json.dumps(parsed, indent=2))
                except json.JSONDecodeError:
                    print(out)
            else:
                print(out)
        elif args.command == "del":
            print(del_key(args.key))
        elif args.command == "exists":
            print(exists_key(args.key))
        elif args.command == "ttl":
            print(key_ttl(args.key))
        elif args.command == "expire":
            print("1" if expire_key(args.key, args.seconds) else "0")
        elif args.command == "scan":
            for k in scan_keys(args.pattern, getattr(args, "count", 100)):
                print(k)
        elif args.command == "keys":
            for k in scan_keys(args.pattern, 100):
                print(k)
        elif args.command == "ping":
            r = _client()
            r.ping()
            print("PONG")
    except KeyValidationError as e:
        print(f"Validation error: {e}", file=sys.stderr)
        return 2
    except CacheError as e:
        print(f"Cache error: {e}", file=sys.stderr)
        return 1
    except redis.RedisError as e:
        print(f"Redis error: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
