"""최근 법안의 Bill.summary_tags 백필.

요약이 있고 태그가 없는 READY 법안만 대상으로 한다. 기본 실행은 저장하지 않는다.

사용:
  python -m scripts.backfill_bill_summary_tags --mode prod --limit 10            # 생성 결과만 출력
  python -m scripts.backfill_bill_summary_tags --mode prod --execute             # 최근 14일 저장
"""
from __future__ import annotations

import argparse
import json

from lawdigest_ai.processor.bill_tags import (
    DEFAULT_TAG_CHUNK_SIZE,
    DEFAULT_TAG_LIMIT,
    DEFAULT_TAG_WINDOW_DAYS,
    run_bill_tagging,
)


def main() -> int:
    parser = argparse.ArgumentParser(description="Bill.summary_tags 백필")
    parser.add_argument("--mode", default="test", choices=["test", "prod"])
    parser.add_argument("--days", type=int, default=DEFAULT_TAG_WINDOW_DAYS)
    parser.add_argument("--limit", type=int, default=DEFAULT_TAG_LIMIT)
    parser.add_argument("--chunk-size", type=int, default=DEFAULT_TAG_CHUNK_SIZE)
    parser.add_argument("--execute", action="store_true", help="실제 UPDATE 수행(기본은 저장 없음)")
    args = parser.parse_args()
    result = run_bill_tagging(
        mode=args.mode,
        days=args.days,
        limit=args.limit,
        chunk_size=args.chunk_size,
        execute=args.execute,
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["status"] == "success" else 1


if __name__ == "__main__":
    raise SystemExit(main())
