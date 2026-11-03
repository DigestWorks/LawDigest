from collections import deque
from contextlib import contextmanager
from datetime import datetime, time as day_time, timedelta
import math
import threading
import time
from zoneinfo import ZoneInfo


class RequestLimited(RuntimeError):
    def __init__(self, code, retry_after):
        self.code = code
        self.retry_after = max(1, int(retry_after))
        super().__init__(code)


class RequestLimits:
    """단일 서비스 worker의 동시 실행과 익명 요청 예산을 제한한다."""

    def __init__(self, settings, *, monotonic=time.monotonic, now=None):
        self.settings = settings
        self.monotonic = monotonic
        self.now = now or (lambda: datetime.now(ZoneInfo("Asia/Seoul")))
        self.lock = threading.Lock()
        self.semaphore = threading.BoundedSemaphore(settings.concurrent_requests)
        self.day = self.now().date()
        self.daily_count = 0
        self.clients = {}

    @contextmanager
    def lease(self, client):
        if not self.semaphore.acquire(blocking=False):
            raise RequestLimited("QA_BUSY", 5)
        try:
            with self.lock:
                now = self.now()
                if now.date() != self.day:
                    self.day = now.date()
                    self.daily_count = 0
                    self.clients.clear()
                if self.daily_count >= self.settings.daily_requests:
                    tomorrow = datetime.combine(
                        now.date() + timedelta(days=1), day_time(), now.tzinfo
                    )
                    raise RequestLimited(
                        "QA_DAILY_LIMIT", math.ceil((tomorrow - now).total_seconds())
                    )
                clock = self.monotonic()
                entries = self.clients.setdefault(client, deque())
                while entries and clock - entries[0] >= self.settings.window_seconds:
                    entries.popleft()
                if len(entries) >= self.settings.requests_per_window:
                    raise RequestLimited(
                        "QA_RATE_LIMIT",
                        math.ceil(self.settings.window_seconds - (clock - entries[0])),
                    )
                entries.append(clock)
                self.daily_count += 1
            yield
        finally:
            self.semaphore.release()
