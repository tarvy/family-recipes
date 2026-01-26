#!/usr/bin/env python3
"""Grafana HTTP API helper.

Requires:
  GRAFANA_URL (e.g., https://tarvy.grafana.net)
  GRAFANA_API_KEY (Grafana service account token)
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from typing import Dict, List, Optional


def parse_query(items: Optional[List[str]]) -> Dict[str, List[str]]:
    if not items:
        return {}
    parsed: Dict[str, List[str]] = {}
    for item in items:
        if "=" not in item:
            raise ValueError(f"Invalid query item '{item}'. Use key=value.")
        key, value = item.split("=", 1)
        parsed.setdefault(key, []).append(value)
    return parsed


def build_url(base: str, path: str, query: Dict[str, List[str]]) -> str:
    base = base.rstrip("/")
    path = path if path.startswith("/") else f"/{path}"
    url = f"{base}{path}"
    if query:
        url = f"{url}?{urllib.parse.urlencode(query, doseq=True)}"
    return url


def read_payload(data: Optional[str], data_file: Optional[str]) -> Optional[bytes]:
    if data and data_file:
        raise ValueError("Use only one of --data or --data-file.")
    if data_file:
        with open(data_file, "rb") as handle:
            return handle.read()
    if data is not None:
        return data.encode("utf-8")
    return None


def make_request(method: str, url: str, token: str, payload: Optional[bytes], content_type: str) -> bytes:
    request = urllib.request.Request(url, method=method)
    request.add_header("Authorization", f"Bearer {token}")
    request.add_header("Accept", "application/json")
    if payload is not None:
        request.add_header("Content-Type", content_type)
        request.data = payload
    try:
        with urllib.request.urlopen(request) as response:
            return response.read()
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code} {exc.reason}: {body}") from exc


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Grafana HTTP API helper (uses GRAFANA_URL + GRAFANA_API_KEY).",
        formatter_class=argparse.RawTextHelpFormatter,
    )

    parser.add_argument(
        "method",
        choices=["get", "post", "put", "delete"],
        help="HTTP method",
    )
    parser.add_argument("path", help="API path, e.g. /api/health")
    parser.add_argument(
        "--query",
        action="append",
        default=[],
        help="Query param in key=value form (repeatable)",
    )
    parser.add_argument(
        "--data",
        help="Raw request body (string). Use --content-type to override.",
    )
    parser.add_argument(
        "--data-file",
        help="Path to a file to use as the request body.",
    )
    parser.add_argument(
        "--content-type",
        default="application/json",
        help="Content-Type for request body (default: application/json)",
    )
    parser.add_argument(
        "--raw",
        action="store_true",
        help="Print raw response instead of pretty JSON.",
    )

    args = parser.parse_args()

    grafana_url = os.getenv("GRAFANA_URL")
    grafana_token = os.getenv("GRAFANA_API_KEY")
    if not grafana_url or not grafana_token:
        print("GRAFANA_URL and GRAFANA_API_KEY must be set.", file=sys.stderr)
        return 1

    try:
        query = parse_query(args.query)
        url = build_url(grafana_url, args.path, query)
        payload = read_payload(args.data, args.data_file)
        response = make_request(args.method.upper(), url, grafana_token, payload, args.content_type)
    except (ValueError, RuntimeError) as exc:
        print(str(exc), file=sys.stderr)
        return 1

    if args.raw:
        sys.stdout.buffer.write(response)
        return 0

    try:
        parsed = json.loads(response.decode("utf-8"))
    except json.JSONDecodeError:
        sys.stdout.buffer.write(response)
        return 0

    print(json.dumps(parsed, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
