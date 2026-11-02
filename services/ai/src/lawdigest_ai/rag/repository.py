"""질문과 인덱스에서 사용하는 법안 원문을 읽기 전용으로 가져온다."""

import hashlib
import json
import re
import pymysql

from lawdigest_ai.db import get_prod_db_config, get_test_db_config

FIELDS = "bill_id, bill_name, title, summary, gpt_summary, assembly_number, propose_date, stage, bill_result"
READY = "ingest_status = 'READY' AND summary IS NOT NULL AND TRIM(summary) <> '' AND assembly_number IN (21, 22)"
# 처리 상태·AI 요약은 매번 DB에서 읽는다. 검색 임베딩에 사용한 원문만 대조한다.
HASH_FIELDS = ("bill_id", "bill_name", "summary", "assembly_number", "propose_date")


def content_hash(row):
    data = {field: row.get(field) for field in HASH_FIELDS}
    return hashlib.sha256(
        json.dumps(data, ensure_ascii=False, sort_keys=True, default=str).encode()
    ).hexdigest()


class BillRepository:
    def __init__(self, mode="prod", connection_factory=None):
        self.mode = mode
        self.connection_factory = connection_factory or self._connect

    def _connect(self):
        config = get_prod_db_config() if self.mode == "prod" else get_test_db_config()
        return pymysql.connect(
            **config,
            charset="utf8mb4",
            cursorclass=pymysql.cursors.DictCursor,
            autocommit=False,
            connect_timeout=5,
            read_timeout=10,
            write_timeout=10,
        )

    def _read(self, sql, params=()):
        connection = self.connection_factory()
        try:
            with connection.cursor() as cursor:
                cursor.execute("SET TRANSACTION READ ONLY")
                connection.begin()
                cursor.execute(sql, params)
                return cursor.fetchall()
        finally:
            connection.rollback()
            connection.close()

    def snapshot(self):
        return self._read(f"SELECT {FIELDS} FROM Bill WHERE {READY} ORDER BY bill_id")

    def hydrate(self, ids, assembly=22):
        ids = list(dict.fromkeys(ids))
        if not ids:
            return {}
        if len(ids) > 40 or any(
            not re.fullmatch(r"[A-Za-z0-9_-]{1,100}", value) for value in ids
        ):
            raise ValueError("근거 법안 식별자가 올바르지 않습니다.")
        if assembly not in (0, 21, 22):
            raise ValueError("대수 범위가 올바르지 않습니다.")
        placeholders = ",".join(["%s"] * len(ids))
        sql = f"SELECT {FIELDS} FROM Bill WHERE {READY} AND bill_id IN ({placeholders})"
        params = list(ids)
        if assembly:
            sql += " AND assembly_number = %s"
            params.append(assembly)
        return {row["bill_id"]: row for row in self._read(sql, params)}

    def stats(self, assembly=22):
        if assembly not in (0, 21, 22):
            raise ValueError("대수 범위가 올바르지 않습니다.")
        sql = f"SELECT COUNT(*) AS count, MAX(propose_date) AS data_as_of FROM Bill WHERE {READY}"
        params = ()
        if assembly:
            sql += " AND assembly_number = %s"
            params = (assembly,)
        rows = self._read(sql, params)
        return rows[0] if rows else {"count": 0, "data_as_of": None}
