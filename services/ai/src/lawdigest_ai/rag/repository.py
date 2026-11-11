"""질문과 인덱스에서 사용하는 법안 원문을 읽기 전용으로 가져온다."""

import hashlib
import json
import re
import time

import pymysql

from lawdigest_ai.db import get_prod_db_config, get_test_db_config

FIELDS = "bill_id, bill_name, title, summary, gpt_summary, assembly_number, propose_date, stage, bill_result"
READY = "ingest_status = 'READY' AND summary IS NOT NULL AND TRIM(summary) <> '' AND assembly_number IN (21, 22)"
# 다른 테이블과 조인할 때 쓰는 같은 조건(Bill 별칭 b)
READY_JOINED = "b.ingest_status = 'READY' AND b.summary IS NOT NULL AND TRIM(b.summary) <> '' AND b.assembly_number IN (21, 22)"
# 처리 상태·AI 요약은 매번 DB에서 읽는다. 검색 임베딩에 사용한 원문만 대조한다.
HASH_FIELDS = ("bill_id", "bill_name", "summary", "assembly_number", "propose_date")
# 질문 속 이름 대조에 쓰는 의원·정당 이름 목록의 캐시 시간(초)
DIRECTORY_TTL = 600


def content_hash(row):
    data = {field: row.get(field) for field in HASH_FIELDS}
    return hashlib.sha256(
        json.dumps(data, ensure_ascii=False, sort_keys=True, default=str).encode()
    ).hexdigest()


class BillRepository:
    def __init__(self, mode="prod", connection_factory=None):
        self.mode = mode
        self.connection_factory = connection_factory or self._connect
        self._directory = None
        self._directory_at = 0.0

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

    def find_members(self, name, assembly=22):
        """이름이 정확히 같은 의원을 현직·최근 대수 순으로 최대 2명 돌려준다."""
        name = (name or "").strip()
        if not 2 <= len(name) <= 20:
            return []
        if assembly not in (0, 21, 22):
            raise ValueError("대수 범위가 올바르지 않습니다.")
        sql = (
            "SELECT c.congressman_id, c.name, p.name AS party, c.district, c.elect_sort,"
            " c.elected, c.commits, c.assembly_number, c.state"
            " FROM Congressman c LEFT JOIN Party p ON p.party_id = c.party_id"
            " WHERE c.name = %s"
        )
        params = [name]
        if assembly:
            sql += " AND c.assembly_number = %s"
            params.append(assembly)
        sql += " ORDER BY c.state DESC, c.assembly_number DESC LIMIT 2"
        return self._read(sql, params)

    def directory(self):
        """질문 속 이름 대조용 의원·정당 이름 목록. 무소속은 정당이 아니므로 뺀다."""
        if self._directory and time.monotonic() - self._directory_at < DIRECTORY_TTL:
            return self._directory
        members = [
            row["name"]
            for row in self._read("SELECT DISTINCT name FROM Congressman")
            if row["name"]
        ]
        parties = [
            row["name"]
            for row in self._read("SELECT name FROM Party WHERE name <> '무소속'")
            if row["name"]
        ]
        self._directory = {"members": members, "parties": parties}
        self._directory_at = time.monotonic()
        return self._directory

    def find_parties(self, names):
        """정당 정보(의석 수, 지도부)를 돌려준다."""
        names = list(dict.fromkeys(name.strip() for name in names if name))[:2]
        if not names:
            return []
        placeholders = ",".join(["%s"] * len(names))
        return self._read(
            "SELECT party_id, name, district_congressman_count, proportional_congressman_count,"
            " party_leader, parliamentary_leader"
            f" FROM Party WHERE name IN ({placeholders})",
            names,
        )

    def party_bills(self, party_ids, assembly=22, limit=8):
        """발의 당시 그 정당 소속 의원이 대표발의한 법안을 최근 발의 순으로, 발의 의원 이름과 함께 돌려준다."""
        ids = [int(value) for value in dict.fromkeys(party_ids)][:2]
        if not ids:
            return []
        if assembly not in (0, 21, 22):
            raise ValueError("대수 범위가 올바르지 않습니다.")
        columns = ", ".join(f"b.{field.strip()}" for field in FIELDS.split(","))
        placeholders = ",".join(["%s"] * len(ids))
        sql = (
            f"SELECT {columns}, rp.party_id, c.name AS proposer_name"
            " FROM RepresentativeProposer rp"
            " JOIN Bill b ON b.bill_id = rp.bill_id"
            " LEFT JOIN Congressman c ON c.congressman_id = rp.congressman_id"
            f" WHERE rp.party_id IN ({placeholders}) AND {READY_JOINED}"
        )
        params = list(ids)
        if assembly:
            sql += " AND b.assembly_number = %s"
            params.append(assembly)
        sql += " ORDER BY b.propose_date DESC, b.bill_id DESC LIMIT %s"
        # 공동대표발의는 행이 여럿이므로 넉넉히 읽은 뒤 법안 단위로 합친다.
        params.append(max(1, min(int(limit), 8)) * 3)
        bills = {}
        for row in self._read(sql, params):
            bill = bills.setdefault(row["bill_id"], {**row, "proposers": []})
            if (
                row.get("proposer_name")
                and row["proposer_name"] not in bill["proposers"]
            ):
                bill["proposers"].append(row["proposer_name"])
        return list(bills.values())[: max(1, min(int(limit), 8))]

    def proposer_info(self, bill_ids):
        """법안별 대표발의자(이름, 의원 ID, 사진, 발의 당시 정당과 로고) 목록"""
        ids = list(dict.fromkeys(bill_ids))
        if not ids:
            return {}
        if len(ids) > 40 or any(
            not re.fullmatch(r"[A-Za-z0-9_-]{1,100}", value) for value in ids
        ):
            raise ValueError("근거 법안 식별자가 올바르지 않습니다.")
        placeholders = ",".join(["%s"] * len(ids))
        rows = self._read(
            "SELECT rp.bill_id, c.congressman_id, c.name, c.congressman_image_url,"
            " p.party_id, p.name AS party, p.party_image_url"
            " FROM RepresentativeProposer rp"
            " JOIN Congressman c ON c.congressman_id = rp.congressman_id"
            " LEFT JOIN Party p ON p.party_id = rp.party_id"
            f" WHERE rp.bill_id IN ({placeholders})"
            " ORDER BY rp.representative_proposer_id",
            ids,
        )
        found = {}
        for row in rows:
            found.setdefault(row["bill_id"], []).append(row)
        return found

    def member_bills(self, congressman_ids, assembly=22, limit=6):
        """의원이 대표발의한 법안을 최근 발의 순으로 돌려준다."""
        ids = list(dict.fromkeys(congressman_ids))
        if not ids:
            return []
        if len(ids) > 2 or any(
            not re.fullmatch(r"[A-Za-z0-9_-]{1,100}", value) for value in ids
        ):
            raise ValueError("의원 식별자가 올바르지 않습니다.")
        if assembly not in (0, 21, 22):
            raise ValueError("대수 범위가 올바르지 않습니다.")
        columns = ", ".join(f"b.{field.strip()}" for field in FIELDS.split(","))
        placeholders = ",".join(["%s"] * len(ids))
        sql = (
            f"SELECT DISTINCT {columns} FROM RepresentativeProposer rp"
            " JOIN Bill b ON b.bill_id = rp.bill_id"
            f" WHERE rp.congressman_id IN ({placeholders})"
            f" AND {READY_JOINED}"
        )
        params = list(ids)
        if assembly:
            sql += " AND b.assembly_number = %s"
            params.append(assembly)
        sql += " ORDER BY b.propose_date DESC, b.bill_id DESC LIMIT %s"
        params.append(max(1, min(int(limit), 8)))
        return self._read(sql, params)

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
