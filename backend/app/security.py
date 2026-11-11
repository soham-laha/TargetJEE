"""Small deployment-safe guards for public demo endpoints.

For multi-instance production, replace the in-memory window with a Redis/API-gateway
limiter and authenticated user quotas. This guard still prevents a single Railway instance
from turning anonymous repeated extraction requests into unbounded Vision spend.
"""
from __future__ import annotations

import os
from collections import defaultdict, deque
from threading import Lock
from time import monotonic

from fastapi import Request


class SlidingWindowRateLimiter:
    def __init__(self, requests_per_window: int, window_seconds: float) -> None:
        self.requests_per_window = requests_per_window
        self.window_seconds = window_seconds
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def allow(self, key: str) -> bool:
        now = monotonic()
        with self._lock:
            events = self._events[key]
            while events and now - events[0] >= self.window_seconds:
                events.popleft()
            if len(events) >= self.requests_per_window:
                return False
            events.append(now)
            return True


def request_client_key(request: Request) -> str:
    # Railway's public edge populates X-Forwarded-For. Set TRUST_PROXY_HEADERS=false if
    # the API is reachable without a trusted reverse proxy in a private deployment.
    if os.getenv("TRUST_PROXY_HEADERS", "true").lower() == "true":
        forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        if forwarded:
            return forwarded
    return request.client.host if request.client else "unknown"


EXTRACTION_RATE_LIMITER = SlidingWindowRateLimiter(
    requests_per_window=max(1, int(os.getenv("EXTRACTION_RATE_LIMIT_PER_MINUTE", "8"))),
    window_seconds=60,
)
