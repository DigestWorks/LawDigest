#!/usr/bin/env python3
"""잘못 저장된 법안 제목을 고친다. 기본 실행은 저장하지 않는다.

- AI 요약이 없고 제목이 원문 소제목인 법안: 원문 첫 내용 줄로 바꾼다.
- 제목이 "error"인 법안: 정식 법안명으로 바꾼다.

사용:
  python services/data/scripts/db/repair_bill_titles.py --mode prod
  python services/data/scripts/db/repair_bill_titles.py --mode prod --execute
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[4]
for path in (PROJECT_ROOT / "services" / "data" / "src", PROJECT_ROOT / "services" / "ai" / "src"):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from lawdigest_data.core.WorkFlowManager import WorkFlowManager, is_summary_heading

FAILED_TITLE = "error"
SELECT_CANDIDATES = """
    SELECT bill_id, bill_name, title, summary, gpt_summary
    FROM Bill
    WHERE ingest_status = 'READY'
      AND (title = %s OR (COALESCE(TRIM(gpt_summary), '') = '' AND (title LIKE %s OR title LIKE %s)))
    ORDER BY bill_id
"""
UPDATE_TITLE = (
    "UPDATE Bill SET title = %s, modified_date = NOW() "
    "WHERE bill_id = %s AND title = %s AND ingest_status = 'READY'"
)


def plan_title_repairs(rows: list[dict[str, Any]]) -> list[dict[str, str]]:
    repairs = []
    for row in rows:
        title = str(row.get("title") or "").strip()
        has_ai_summary = bool(str(row.get("gpt_summary") or "").strip())
        if title == FAILED_TITLE:
            new_title = WorkFlowManager._shorten_text(str(row.get("bill_name") or ""), max_length=255)
        elif not has_ai_summary and is_summary_heading(title):
            new_title = WorkFlowManager._derive_title(row.get("summary"), row.get("bill_name"), None)
        else:
            continue
        if new_title and new_title != title:
            repairs.append({"bill_id": row["bill_id"], "old_title": title, "new_title": new_title})
    return repairs


def apply_title_repairs(db, repairs: list[dict[str, str]]) -> dict[str, int]:
    with db.transaction() as cursor:
        updated = cursor.executemany(
            UPDATE_TITLE,
            [(item["new_title"], item["bill_id"], item["old_title"]) for item in repairs],
        )
    rebuilt = db.refresh_bill_search_documents([item["bill_id"] for item in repairs])
    return {"updated": int(updated or 0), "search_rebuilt": rebuilt}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="잘못 저장된 법안 제목 수리")
    parser.add_argument("--mode", default="test", choices=["test", "prod"])
    parser.add_argument("--execute", action="store_true", help="실제 UPDATE 수행(기본은 저장 없음)")
    args = parser.parse_args(argv)

    db = WorkFlowManager._build_db_manager(args.mode)
    with db.transaction() as cursor:
        cursor.execute(SELECT_CANDIDATES, (FAILED_TITLE, "%제안%이유%", "%주요%내용%"))
        repairs = plan_title_repairs(list(cursor.fetchall()))

    result: dict[str, Any] = {"mode": args.mode, "execute": args.execute, "planned": len(repairs)}
    if args.execute and repairs:
        result.update(apply_title_repairs(db, repairs))
    result["repairs"] = repairs
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
