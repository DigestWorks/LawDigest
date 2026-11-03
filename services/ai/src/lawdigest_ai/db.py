from __future__ import annotations
from datetime import datetime
import os
from pathlib import Path
from typing import Any, Dict
import pymysql
from dotenv import load_dotenv, dotenv_values

_AIRFLOW_DOTENV_PATH = os.getenv("AIRFLOW_DOTENV_PATH")
_DEFAULT_AIRFLOW_DOTENV_PATH = str(
    Path(__file__).resolve().parents[4] / "services" / "data" / ".env",
)
_ENV_DOTENV_PATH = _AIRFLOW_DOTENV_PATH or _DEFAULT_AIRFLOW_DOTENV_PATH
load_dotenv(dotenv_path=_ENV_DOTENV_PATH)


def _get_db_config(prefix: str = "") -> Dict[str, Any]:
    """공통 DB 설정 조회 함수. prefix로 TEST_ 등 구분."""
    file_env = dotenv_values(_ENV_DOTENV_PATH)

    def _get(key: str) -> str | None:
        return os.getenv(key) or file_env.get(key)

    host = _get(f"{prefix}DB_HOST")
    port_str = _get(f"{prefix}DB_PORT")
    user = _get(f"{prefix}DB_USER")
    password = _get(f"{prefix}DB_PASSWORD")
    database = _get(f"{prefix}DB_NAME")

    missing = [k for k, v in {
        f"{prefix}DB_HOST": host,
        f"{prefix}DB_PORT": port_str,
        f"{prefix}DB_USER": user,
        f"{prefix}DB_PASSWORD": password,
        f"{prefix}DB_NAME": database,
    }.items() if not v]

    if missing:
        raise ValueError(f"DB 환경변수 누락: {', '.join(missing)}")

    assert port_str is not None  # missing 체크 이후 안전
    return {
        "host": host,
        "port": int(port_str),
        "user": user,
        "password": password,
        "database": database,
    }


def get_prod_db_config() -> Dict[str, Any]:
    """운영 DB 환경 설정을 반환합니다."""
    return _get_db_config(prefix="")


def get_test_db_config() -> Dict[str, Any]:
    """테스트 DB 환경 설정을 반환합니다."""
    return _get_db_config(prefix="TEST_")


def get_db_connection(mode: str = "test") -> pymysql.connections.Connection:
    """지정된 모드에 따른 DB 연결 객체를 반환합니다."""
    cfg = get_prod_db_config() if mode == "prod" else get_test_db_config()
    return pymysql.connect(
        host=cfg["host"], port=cfg["port"], user=cfg["user"],
        password=cfg["password"], db=cfg["database"],
        charset="utf8mb4", cursorclass=pymysql.cursors.DictCursor,
        autocommit=False,
    )


def get_bill_table_columns(mode: str = "test") -> set[str]:
    """Bill 테이블의 실제 컬럼 목록을 반환합니다."""
    cfg = get_prod_db_config() if mode == "prod" else get_test_db_config()
    conn = get_db_connection(mode=mode)
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT COLUMN_NAME
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'Bill'
                """,
                (cfg["database"],),
            )
            return {str(row["COLUMN_NAME"]) for row in cur.fetchall()}
    finally:
        conn.close()


def update_bill_summary(
    bill_id: str,
    title: str | None,
    gpt_summary: str | None,
    summary_tags: str | None,
    mode: str = "test",
    category: str | None = None,
    *,
    report_published_at: datetime | None = None,
    preserve_existing: bool = False,
) -> bool:
    """Update the bill summary and optionally publish the validated deep report atomically."""
    if report_published_at is not None and (not title or not gpt_summary):
        raise ValueError("리포트 제목과 본문이 필요합니다.")
    bill_columns = get_bill_table_columns(mode=mode)
    conn = get_db_connection(mode=mode)
    try:
        set_clauses = ["title=%s", "gpt_summary=%s"]
        params: list[Any] = [title, gpt_summary]
        if "summary_tags" in bill_columns:
            set_clauses.append("summary_tags=%s")
            params.append(summary_tags)
        # category는 값이 있을 때만 기록(미분류 경로가 기존 분류를 NULL로 덮지 않도록).
        if category is not None and "category" in bill_columns:
            set_clauses.append("category=%s")
            params.append(category)
        params.append(bill_id)
        with conn.cursor() as cur:
            if preserve_existing:
                cur.execute(
                    "SELECT ingest_status, gpt_summary FROM Bill WHERE bill_id=%s FOR UPDATE",
                    (bill_id,),
                )
                bill = cur.fetchone()
                if not bill or bill["ingest_status"] != "READY" or (bill["gpt_summary"] or "").strip():
                    conn.rollback()
                    return False
                cur.execute("SELECT bill_id FROM BillReport WHERE bill_id=%s FOR UPDATE", (bill_id,))
                if cur.fetchone() is not None:
                    conn.rollback()
                    return False
            if report_published_at is not None:
                cur.execute("SELECT bill_id FROM Bill WHERE bill_id=%s FOR UPDATE", (bill_id,))
                if cur.fetchone() is None:
                    raise ValueError("리포트를 연결할 법안이 없습니다.")
                cur.execute("SELECT published_at FROM BillReport WHERE bill_id=%s", (bill_id,))
                previous = cur.fetchone()
                if previous and previous["published_at"] > report_published_at:
                    raise ValueError("이미 더 최근에 생성된 리포트가 있습니다.")
                cur.execute(
                    """
                    INSERT INTO BillReport (bill_id, title, markdown, published_at)
                    VALUES (%s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                        title=VALUES(title), markdown=VALUES(markdown), published_at=VALUES(published_at)
                    """,
                    (bill_id, title, gpt_summary, report_published_at),
                )
            cur.execute(
                f"UPDATE Bill SET {', '.join(set_clauses)} WHERE bill_id=%s",
                tuple(params),
            )
        conn.commit()
        return True
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
