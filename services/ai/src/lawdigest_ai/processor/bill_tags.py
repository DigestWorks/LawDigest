"""요약이 끝난 법안에 탐색 키워드 집계용 주제 태그를 붙인다."""
from __future__ import annotations

import json
import re
import subprocess
import tempfile
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

from lawdigest_ai.db import get_bill_table_columns, get_db_connection
from lawdigest_ai.processor.agentic_bill_report import (
    CodexBillReportAgent,
    _extract_json_object,
)

DEFAULT_TAG_WINDOW_DAYS = 14
DEFAULT_TAG_LIMIT = 200
DEFAULT_TAG_CHUNK_SIZE = 10
MAX_TAGS_PER_BILL = 5
MIN_TAG_LENGTH = 2  # SearchController는 2자 미만 검색어를 거부한다.
MAX_TAG_LENGTH = 10
SUMMARY_INPUT_LIMIT = 800
TAG_PATTERN = re.compile(r"^[가-힣A-Za-z0-9·]+$")
GENERIC_TAGS = frozenset(
    {
        "개정", "개정안", "국회", "규정", "법", "법률", "법률안", "법안", "시행", "시행령",
        "의원", "일부개정", "입법", "전부개정", "정부", "제도", "제정", "제정안", "조항",
    }
)
GENERIC_TAG_SUFFIXES = ("법률", "법률안", "개정안", "법안")


def normalize_tags(value: Any) -> list[str]:
    """검색 링크와 집계에 쓸 수 있는 태그만 순서대로 남긴다."""
    if not isinstance(value, list):
        return []
    tags: list[str] = []
    for item in value:
        if not isinstance(item, str):
            continue
        tag = re.sub(r"\s+", "", item).lstrip("#")
        if (
            len(item.split()) > 2  # 세 어절 이상은 주제어가 아니라 문장이다.
            or not MIN_TAG_LENGTH <= len(tag) <= MAX_TAG_LENGTH
            or not TAG_PATTERN.fullmatch(tag)
            or tag in GENERIC_TAGS
            or tag.endswith(GENERIC_TAG_SUFFIXES)
            or tag in tags
        ):
            continue
        tags.append(tag)
    return tags[:MAX_TAGS_PER_BILL]


def build_tag_prompt(bills: list[dict[str, Any]]) -> str:
    items = [
        {
            "bill_id": bill["bill_id"],
            "bill_name": bill.get("bill_name"),
            "title": bill.get("title"),
            "summary": str(bill.get("gpt_summary") or "")[:SUMMARY_INPUT_LIMIT],
        }
        for bill in bills
    ]
    return (
        "작업: 각 법안이 다루는 정책 주제를 나타내는 태그를 만드세요.\n"
        "추가 도구 호출, 웹 검색, 셸 명령 실행을 하지 말고 입력만 사용하세요.\n\n"
        "태그 규칙:\n"
        f"- 법안마다 3~{MAX_TAGS_PER_BILL}개를 씁니다.\n"
        "- 일반 독자가 검색할 만한 2~8자 명사 하나로 쓰고, 띄어쓰기를 넣지 않습니다.\n"
        "- 다른 법안에도 붙을 수 있는 주제어를 씁니다. 예: 병역, 전세사기, 아동학대, 교통약자, 벤처기업\n"
        "- 법률명, 조문 번호, 기관 고유명, 사람 이름, 문장은 쓰지 않습니다.\n"
        "- 법안, 개정, 제도, 국회, 의원처럼 모든 법안에 해당하는 말은 쓰지 않습니다.\n\n"
        "출력 규칙:\n"
        "- JSON 객체 하나만 쓰고 앞뒤에 설명이나 코드펜스를 붙이지 않습니다.\n"
        '- 스키마: {"items":[{"bill_id":"입력의 bill_id","tags":["병역","군복무"]}]}\n\n'
        f"입력:\n{json.dumps(items, ensure_ascii=False, indent=2, default=str)}"
    )


def parse_tag_output(text: str, expected_bill_ids: list[str]) -> dict[str, list[str]]:
    """입력에 있던 법안의 유효한 태그만 돌려준다."""
    payload = json.loads(_extract_json_object(text))
    items = payload.get("items") if isinstance(payload, dict) else None
    if not isinstance(items, list):
        raise ValueError("태그 출력에 items 배열이 없습니다.")  # noqa: TRY004
    expected = set(expected_bill_ids)
    parsed: dict[str, list[str]] = {}
    for item in items:
        if not isinstance(item, dict) or item.get("bill_id") not in expected:
            continue
        tags = normalize_tags(item.get("tags"))
        if tags:
            parsed[str(item["bill_id"])] = tags
    return parsed


def generate_tags(bills: list[dict[str, Any]], *, agent: CodexBillReportAgent | None = None) -> dict[str, list[str]]:
    agent = agent or CodexBillReportAgent()
    with tempfile.TemporaryDirectory(prefix="lawdigest-bill-tags-") as tmp_dir:
        output_path = Path(tmp_dir) / "tags.json"
        command, stdin_text = agent.build_command(prompt=build_tag_prompt(bills), output_path=str(output_path))
        proc = subprocess.run(
            command,
            input=stdin_text,
            capture_output=True,
            text=True,
            cwd=agent.workdir,
            env=agent.build_environment(),
            timeout=agent.timeout_seconds,
            check=False,
        )
        if proc.returncode != 0:
            raise RuntimeError((proc.stderr or proc.stdout or "Codex 태그 생성에 실패했습니다.").strip()[:500])
        if not output_path.exists():
            raise RuntimeError("Codex 태그 출력이 비어 있습니다.")
        return parse_tag_output(output_path.read_text(encoding="utf-8"), [str(bill["bill_id"]) for bill in bills])


def _window_start(days: int, today: date | None = None) -> date:
    return (today or datetime.now(ZoneInfo("Asia/Seoul")).date()) - timedelta(days=days)


def fetch_untagged_bills(*, mode: str, days: int, limit: int, today: date | None = None) -> list[dict[str, Any]]:
    conn = get_db_connection(mode=mode)
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT bill_id, bill_name, title, gpt_summary
                FROM Bill
                WHERE ingest_status = 'READY'
                  AND summary_tags IS NULL
                  AND COALESCE(TRIM(gpt_summary), '') <> ''
                  AND propose_date >= %s
                ORDER BY propose_date DESC, bill_id DESC
                LIMIT %s
                """,
                (_window_start(days, today), limit),
            )
            return list(cur.fetchall())
    finally:
        conn.close()


def save_tags(tags_by_bill: dict[str, list[str]], *, mode: str) -> int:
    """비어 있는 법안에만 저장해 다시 실행해도 기존 태그를 바꾸지 않는다."""
    if not tags_by_bill:
        return 0
    conn = get_db_connection(mode=mode)
    try:
        with conn.cursor() as cur:
            updated = cur.executemany(
                "UPDATE Bill SET summary_tags=%s WHERE bill_id=%s AND summary_tags IS NULL AND ingest_status='READY'",
                [(json.dumps(tags, ensure_ascii=False), bill_id) for bill_id, tags in tags_by_bill.items()],
            )
        conn.commit()
        return int(updated or 0)
    finally:
        conn.close()


def run_bill_tagging(
    *,
    mode: str,
    days: int = DEFAULT_TAG_WINDOW_DAYS,
    limit: int = DEFAULT_TAG_LIMIT,
    chunk_size: int = DEFAULT_TAG_CHUNK_SIZE,
    execute: bool = False,
    agent: CodexBillReportAgent | None = None,
) -> dict[str, Any]:
    """대상 법안의 태그를 생성한다. execute가 거짓이면 저장하지 않는다."""
    if days < 1 or limit < 1 or chunk_size < 1:
        raise ValueError("days, limit, chunk_size는 1 이상이어야 합니다.")
    if "summary_tags" not in get_bill_table_columns(mode=mode):
        raise RuntimeError("Bill.summary_tags 컬럼이 없습니다. 마이그레이션(20260308_add_bill_summary_tags)을 먼저 적용하세요.")

    bills = fetch_untagged_bills(mode=mode, days=days, limit=limit)
    generated: dict[str, list[str]] = {}
    updated = 0
    error: str | None = None
    for start in range(0, len(bills), chunk_size):
        chunk = bills[start:start + chunk_size]
        try:
            tags_by_bill = generate_tags(chunk, agent=agent)
        except (OSError, RuntimeError, ValueError, subprocess.TimeoutExpired) as exc:
            # 인증·한도 문제는 다음 묶음에서도 반복되므로 진행분만 남기고 멈춘다.
            error = str(exc)[:500]
            break
        generated.update(tags_by_bill)
        if execute:
            updated += save_tags(tags_by_bill, mode=mode)

    return {
        "status": "failed" if error else "success",
        "execute": execute,
        "days": days,
        "target_count": len(bills),
        "generated_count": len(generated),
        "updated_count": updated,
        "error": error,
        "tags_by_bill": generated,
    }
