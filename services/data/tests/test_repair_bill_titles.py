from __future__ import annotations

import importlib.util
from pathlib import Path
from unittest.mock import MagicMock

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "db" / "repair_bill_titles.py"
spec = importlib.util.spec_from_file_location("repair_bill_titles", SCRIPT)
repair = importlib.util.module_from_spec(spec)
spec.loader.exec_module(repair)

SUMMARY = "대안의 제안이유\n\n  농어업경영체 등록제도를 정비하려는 것임.\n"


def test_heading_title_without_ai_summary_uses_first_content_line():
    rows = [{"bill_id": "B1", "bill_name": "농어업법(대안)", "title": "대안의 제안이유", "summary": SUMMARY}]

    assert repair.plan_title_repairs(rows) == [
        {"bill_id": "B1", "old_title": "대안의 제안이유", "new_title": "농어업경영체 등록제도를 정비하려는 것임."}
    ]


def test_failed_title_uses_official_bill_name():
    rows = [{"bill_id": "B2", "bill_name": "특수교육법 전부개정법률안", "title": "error", "gpt_summary": "요약"}]

    assert repair.plan_title_repairs(rows)[0]["new_title"] == "특수교육법 전부개정법률안"


def test_titles_with_ai_summary_or_real_content_are_kept():
    rows = [
        {"bill_id": "B3", "bill_name": "법안", "title": "대안의 제안이유", "gpt_summary": "AI 요약", "summary": SUMMARY},
        {"bill_id": "B4", "bill_name": "법안", "title": "제안이유 및 주요내용을 정비", "summary": SUMMARY},
    ]

    assert repair.plan_title_repairs(rows) == []


def test_apply_updates_only_unchanged_titles_and_refreshes_search():
    db = MagicMock()
    cursor = db.transaction.return_value.__enter__.return_value
    cursor.executemany.return_value = 1
    db.refresh_bill_search_documents.return_value = 1

    result = repair.apply_title_repairs(db, [{"bill_id": "B1", "old_title": "error", "new_title": "법안"}])

    sql, params = cursor.executemany.call_args.args
    assert "AND title = %s" in sql and "modified_date = NOW()" in sql
    assert params == [("법안", "B1", "error")]
    db.refresh_bill_search_documents.assert_called_once_with(["B1"])
    assert result == {"updated": 1, "search_rebuilt": 1}
