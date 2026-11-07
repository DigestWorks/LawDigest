from unittest.mock import MagicMock, patch

import pytest


def _mock_connection(fetch_rows=None):
    conn = MagicMock()
    cur = conn.cursor.return_value.__enter__.return_value
    cur.fetchall.return_value = fetch_rows or []
    return conn


def test_update_bill_summary_skips_summary_tags_when_column_absent():
    from lawdigest_ai.db import update_bill_summary

    conn = _mock_connection()
    cur = conn.cursor.return_value.__enter__.return_value

    with patch("lawdigest_ai.db.get_db_connection", return_value=conn), patch(
        "lawdigest_ai.db.get_bill_table_columns",
        return_value={"bill_id", "title", "gpt_summary"},
    ):
        update_bill_summary(
            bill_id="B001",
            title="짧은 요약",
            gpt_summary="상세 요약",
            summary_tags='["태그"]',
            mode="prod",
        )

    query, params = cur.execute.call_args.args
    assert "summary_tags" not in query
    assert params == ("짧은 요약", "상세 요약", "B001")

@pytest.mark.parametrize(
    "rows",
    [
        [{"ingest_status": "READY", "gpt_summary": "이미 생성된 요약"}],
        [{"ingest_status": "READY", "gpt_summary": None}, {"bill_id": "B001"}],
        [{"ingest_status": "PENDING", "gpt_summary": None}],
    ],
)
def test_operating_generation_preserves_existing_output(rows):
    from datetime import datetime

    from lawdigest_ai.db import update_bill_summary

    conn = _mock_connection()
    cur = conn.cursor.return_value.__enter__.return_value
    cur.fetchone.side_effect = rows
    with patch("lawdigest_ai.db.get_db_connection", return_value=conn), patch(
        "lawdigest_ai.db.get_bill_table_columns", return_value={"bill_id", "title", "gpt_summary"}
    ):
        saved = update_bill_summary(
            "B001", "새 제목", "새 요약", None, mode="prod",
            report_published_at=datetime(2026, 11, 4), preserve_existing=True,
        )
    assert saved is False
    assert all("FOR UPDATE" in call.args[0] for call in cur.execute.call_args_list)
    conn.commit.assert_not_called()
    conn.rollback.assert_called_once()
