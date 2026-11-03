"""운영 연결을 받지 않는 격리 로컬 MySQL 반복 적재 회귀 검사."""

import json
import os

import pymysql
import pytest

from lawdigest_data.connectors.DatabaseManager import DatabaseManager

pytestmark = pytest.mark.integration


@pytest.fixture
def manager():
    port = os.environ.get("LAWDIGEST_INGEST_MYSQL_PORT")
    if not port:
        pytest.skip("전용 로컬 MySQL 포트를 지정해야 합니다.")
    if not port.isdecimal() or not 1024 < int(port) < 65536:
        raise ValueError("로컬 임시 MySQL 포트만 허용합니다.")
    connection = pymysql.connect(
        host="127.0.0.1",
        port=int(port),
        user="root",
        password="",
        database="lawdigest_ingest_recovery",
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
    )
    db = DatabaseManager.__new__(DatabaseManager)
    db.connection = connection
    with connection.cursor() as cursor:
        cursor.execute("""
            CREATE TEMPORARY TABLE Bill (
                bill_id VARCHAR(100) PRIMARY KEY, assembly_number INT,
                bill_name TEXT, committee TEXT, gpt_summary LONGTEXT,
                propose_date DATE, summary LONGTEXT, stage VARCHAR(50),
                proposers TEXT, bill_pdf_url TEXT, viewCount INT,
                title TEXT, bill_number INT, bill_link TEXT, bill_result TEXT,
                summary_tags JSON,
                proposer_kind ENUM('CONGRESSMAN','CHAIRMAN','GOVERNMENT'),
                ingest_status VARCHAR(30), created_date DATETIME(6),
                modified_date DATETIME(6)
            ) ENGINE=InnoDB
        """)
        cursor.execute("""
            CREATE TEMPORARY TABLE Party (
                party_id BIGINT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100),
                created_date DATETIME, modified_date DATETIME
            )
        """)
        cursor.execute("""
            CREATE TEMPORARY TABLE Congressman (
                congressman_id VARCHAR(100) PRIMARY KEY, assembly_number INT,
                name TEXT, party_id BIGINT, district TEXT, elect_sort TEXT,
                commits TEXT, elected TEXT, homepage TEXT, congressman_image_url TEXT,
                email TEXT, sex TEXT, congressman_age TEXT, congressman_office TEXT,
                congressman_telephone TEXT, brief_history TEXT, state BOOLEAN,
                created_date DATETIME, modified_date DATETIME
            )
        """)
        cursor.execute("""
            CREATE TEMPORARY TABLE BillSearchDocument (
                bill_id VARCHAR(100) PRIMARY KEY, bill_name_text VARCHAR(255) NOT NULL,
                title_text TEXT NOT NULL, gpt_summary_text TEXT NOT NULL,
                raw_summary_text MEDIUMTEXT NOT NULL, search_text MEDIUMTEXT NOT NULL,
                source_modified_date DATETIME(6), rebuilt_date DATETIME(6)
            ) ENGINE=InnoDB
        """)
        cursor.execute("""
            CREATE TEMPORARY TABLE IngestCheckpoint (
                source_name VARCHAR(60), assembly_number INT, last_reference_date DATE, metadata_json JSON,
                created_date DATETIME, modified_date DATETIME, PRIMARY KEY(source_name, assembly_number)
            ) ENGINE=InnoDB
        """)
    yield db
    connection.close()


def row(**updates):
    return {
        "bill_id": "repeated-bill",
        "assembly_number": 22,
        "bill_name": "재수집 검증 법안",
        "committee": None,
        "gpt_summary": None,
        "propose_date": "2026-11-02",
        "summary": "새 원문 요약",
        "stage": "접수",
        "proposers": "정부",
        "bill_pdf_url": None,
        "title": "원문에서 만든 제목",
        "bill_number": 2222388,
        "bill_link": None,
        "bill_result": None,
        "summary_tags": None,
        "proposer_kind": "GOVERNMENT",
        "ingest_status": "READY",
        **updates,
    }


def read(db):
    with db.connection.cursor() as cursor:
        cursor.execute("SELECT * FROM Bill")
        return cursor.fetchone()


@pytest.mark.parametrize("missing", [None, "", "  \n "])
def test_reingest_preserves_ai_content_views_and_created_date(manager, missing):
    manager.insert_bill_info(
        [row(gpt_summary="기존 AI 요약", title="기존 AI 제목", summary_tags=["행정"])]
    )
    with manager.connection.cursor() as cursor:
        cursor.execute(
            "UPDATE Bill SET viewCount=17, created_date='2026-07-01 00:00:00'"
        )
    manager.connection.commit()
    manager.insert_bill_info([row(gpt_summary=missing, summary_tags=missing)])
    saved = read(manager)
    assert saved["gpt_summary"] == "기존 AI 요약"
    assert saved["title"] == "기존 AI 제목"
    assert json.loads(saved["summary_tags"]) == ["행정"]
    assert saved["summary"] == "새 원문 요약"
    assert saved["viewCount"] == 17
    assert str(saved["created_date"]) == "2026-07-01 00:00:00"


def test_explicit_new_ai_content_is_updated(manager):
    manager.insert_bill_info(
        [row(gpt_summary="기존 AI", title="기존 제목", summary_tags=["행정"])]
    )
    manager.insert_bill_info(
        [row(gpt_summary="새 AI", title="새 AI 제목", summary_tags=["보건"])]
    )
    saved = read(manager)
    assert saved["gpt_summary"] == "새 AI"
    assert saved["title"] == "새 AI 제목"
    assert json.loads(saved["summary_tags"]) == ["보건"]


def test_bill_without_ai_keeps_ingest_title_and_can_receive_ai_later(manager):
    manager.insert_bill_info([row()])
    assert read(manager)["title"] == "원문에서 만든 제목"
    manager.insert_bill_info([row(gpt_summary="첫 AI", title="첫 AI 제목")])
    assert read(manager)["gpt_summary"] == "첫 AI"
    assert read(manager)["title"] == "첫 AI 제목"


def test_title_only_ai_result_is_preserved_without_an_ai_summary(manager):
    manager.insert_bill_info([row(title="제목 전용 생성 결과")])
    manager.insert_bill_info([row(title="재수집 원문 제목")])
    assert read(manager)["title"] == "제목 전용 생성 결과"


def test_ingest_refreshes_search_from_saved_fields_and_keeps_it_current_on_retry(manager):
    checkpoint = {"source_name": "bill_ingest", "assembly_number": 22, "last_reference_date": "2026-11-02"}
    manager.insert_bill_info(
        [row(gpt_summary="보존할 AI 요약", title="보존할 제목", summary="첫 원문")],
        checkpoint=checkpoint,
        refresh_search=True,
    )
    manager.insert_bill_info(
        [row(summary="재수집한 원문"), row(bill_id="pending", bill_number=2222389, ingest_status="PENDING")],
        checkpoint=checkpoint,
        refresh_search=True,
    )
    with manager.connection.cursor() as cursor:
        cursor.execute("SELECT bill_id,title_text,gpt_summary_text,raw_summary_text FROM BillSearchDocument")
        assert cursor.fetchall() == [{
            "bill_id": "repeated-bill", "title_text": "보존할 제목",
            "gpt_summary_text": "보존할 AI 요약", "raw_summary_text": "재수집한 원문",
        }]
        cursor.execute("SELECT last_reference_date FROM IngestCheckpoint")
        assert str(cursor.fetchone()["last_reference_date"]) == "2026-11-02"
        cursor.execute("UPDATE Bill SET summary='갱신된 원문' WHERE bill_id='repeated-bill'")
    manager.connection.commit()
    assert manager.refresh_bill_search_documents(["repeated-bill", "pending"]) == 1
    with manager.connection.cursor() as cursor:
        cursor.execute("SELECT raw_summary_text FROM BillSearchDocument")
        assert cursor.fetchall() == [{"raw_summary_text": "갱신된 원문"}]


def test_failed_search_or_checkpoint_rolls_back_the_ingest(manager):
    checkpoint = {"source_name": "bill_ingest", "assembly_number": 22, "last_reference_date": "2026-11-02"}
    with manager.connection.cursor() as cursor:
        cursor.execute("ALTER TABLE BillSearchDocument RENAME COLUMN title_text TO invalid_title")
    with pytest.raises(pymysql.MySQLError, match="title_text"):
        manager.insert_bill_info([row()], checkpoint=checkpoint, refresh_search=True)
    with manager.connection.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) AS count FROM Bill")
        assert cursor.fetchone()["count"] == 0
        cursor.execute("SELECT COUNT(*) AS count FROM IngestCheckpoint")
        assert cursor.fetchone()["count"] == 0
        cursor.execute("ALTER TABLE BillSearchDocument RENAME COLUMN invalid_title TO title_text")
        cursor.execute("DROP TEMPORARY TABLE IngestCheckpoint")
    with pytest.raises(pymysql.MySQLError, match="IngestCheckpoint"):
        manager.insert_bill_info([row()], checkpoint=checkpoint, refresh_search=True)
    with manager.connection.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) AS count FROM Bill")
        assert cursor.fetchone()["count"] == 0
        cursor.execute("SELECT COUNT(*) AS count FROM BillSearchDocument")
        assert cursor.fetchone()["count"] == 0


def test_partial_lawmaker_upsert_keeps_other_members_active_and_saves_assembly(manager):
    manager.update_lawmaker_info(
        [{"congressman_id": "old", "name": "기존", "party_name": "정당"}]
    )
    manager.update_lawmaker_info(
        [
            {
                "congressman_id": "new",
                "name": "추가",
                "party_name": "정당",
                "assembly_number": 22,
                "elect_sort": "비례대표",
            }
        ]
    )
    with manager.connection.cursor() as cursor:
        cursor.execute(
            "SELECT congressman_id, assembly_number, state FROM Congressman ORDER BY congressman_id"
        )
        rows = cursor.fetchall()
    assert {r["congressman_id"] for r in rows if r["state"]} == {"old", "new"}
    assert all(r["assembly_number"] == 22 for r in rows)
    manager.update_lawmaker_info(
        [{"congressman_id": "new", "name": "추가", "party_name": "정당"}],
        full_snapshot=True,
    )
    with manager.connection.cursor() as cursor:
        cursor.execute("SELECT congressman_id, elect_sort FROM Congressman WHERE state=1")
        assert cursor.fetchall() == [{"congressman_id": "new", "elect_sort": "비례대표"}]
