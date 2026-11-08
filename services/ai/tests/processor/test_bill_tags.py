from __future__ import annotations

import json
from datetime import date
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from lawdigest_ai.processor import bill_tags


def test_normalize_tags_keeps_only_searchable_topic_words():
    raw = ["#병역", "전세 사기", "법", "일부개정", "병역", "병역법 일부개정법률안", "민생 지원을 강화합니다", "A", 3, "아동학대", "교통약자", "벤처기업", "청년"]
    assert bill_tags.normalize_tags(raw) == ["병역", "전세사기", "아동학대", "교통약자", "벤처기업"]


def test_normalize_tags_rejects_non_list():
    assert bill_tags.normalize_tags("병역") == []


def test_parse_tag_output_ignores_unknown_bills_and_empty_tags():
    text = json.dumps(
        {
            "items": [
                {"bill_id": "A", "tags": ["병역", "법안"]},
                {"bill_id": "B", "tags": ["법안"]},
                {"bill_id": "UNKNOWN", "tags": ["주거"]},
            ]
        },
        ensure_ascii=False,
    )
    assert bill_tags.parse_tag_output(text, ["A", "B"]) == {"A": ["병역"]}


def test_parse_tag_output_requires_items():
    with pytest.raises(ValueError):
        bill_tags.parse_tag_output('{"reports":[]}', ["A"])


def test_build_tag_prompt_limits_summary_length():
    prompt = bill_tags.build_tag_prompt([{"bill_id": "A", "bill_name": "병역법", "title": "t", "gpt_summary": "가" * 2000}])
    assert "가" * bill_tags.SUMMARY_INPUT_LIMIT in prompt
    assert "가" * (bill_tags.SUMMARY_INPUT_LIMIT + 1) not in prompt


def test_window_start_counts_back_from_today():
    assert bill_tags._window_start(14, date(2026, 11, 7)) == date(2026, 10, 24)


def _run(monkeypatch, *, execute, generate):
    bills = [{"bill_id": f"B{i}", "bill_name": "n", "title": "t", "gpt_summary": "s"} for i in range(3)]
    saved = []
    monkeypatch.setattr(bill_tags, "get_bill_table_columns", lambda mode: {"summary_tags"})
    monkeypatch.setattr(bill_tags, "fetch_untagged_bills", lambda **kwargs: bills)
    monkeypatch.setattr(bill_tags, "generate_tags", generate)
    monkeypatch.setattr(bill_tags, "save_tags", lambda tags, mode: saved.append(tags) or len(tags))
    return bill_tags.run_bill_tagging(mode="prod", chunk_size=2, execute=execute), saved


def test_run_bill_tagging_dry_run_does_not_save(monkeypatch):
    result, saved = _run(monkeypatch, execute=False, generate=lambda chunk, agent=None: {b["bill_id"]: ["병역"] for b in chunk})
    assert result["status"] == "success"
    assert (result["target_count"], result["generated_count"], result["updated_count"]) == (3, 3, 0)
    assert saved == []


def test_run_bill_tagging_execute_saves_each_chunk(monkeypatch):
    result, saved = _run(monkeypatch, execute=True, generate=lambda chunk, agent=None: {b["bill_id"]: ["병역"] for b in chunk})
    assert result["updated_count"] == 3
    assert len(saved) == 2


def test_run_bill_tagging_stops_after_failure_and_keeps_progress(monkeypatch):
    calls = []

    def generate(chunk, agent=None):
        calls.append(chunk)
        if len(calls) == 2:
            raise RuntimeError("usage limit")
        return {b["bill_id"]: ["병역"] for b in chunk}

    result, _ = _run(monkeypatch, execute=True, generate=generate)
    assert result["status"] == "failed"
    assert result["updated_count"] == 2
    assert "usage limit" in result["error"]


def test_run_bill_tagging_requires_column(monkeypatch):
    monkeypatch.setattr(bill_tags, "get_bill_table_columns", lambda mode: set())
    with pytest.raises(RuntimeError):
        bill_tags.run_bill_tagging(mode="prod")


def test_save_tags_only_updates_empty_ready_rows():
    calls = {}

    class Cursor:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def executemany(self, sql, params):
            calls["sql"], calls["params"] = sql, params
            return 1

    conn = SimpleNamespace(cursor=Cursor, commit=lambda: calls.setdefault("commit", True), close=lambda: None)
    with patch.object(bill_tags, "get_db_connection", return_value=conn):
        assert bill_tags.save_tags({"A": ["병역"]}, mode="prod") == 1
    assert "summary_tags IS NULL" in calls["sql"]
    assert calls["params"] == [('["병역"]', "A")]
    assert calls["commit"] is True


def test_generate_tags_reads_codex_output(tmp_path):
    class Agent:
        workdir = str(tmp_path)
        timeout_seconds = 5

        def build_environment(self):
            return {}

        def build_command(self, *, prompt, output_path):
            self.output_path = output_path
            return ["codex"], prompt

    agent = Agent()

    def fake_run(command, **kwargs):
        with open(agent.output_path, "w", encoding="utf-8") as handle:
            json.dump({"items": [{"bill_id": "A", "tags": ["병역"]}]}, handle, ensure_ascii=False)
        return SimpleNamespace(returncode=0, stdout="", stderr="")

    with patch.object(bill_tags.subprocess, "run", side_effect=fake_run):
        assert bill_tags.generate_tags([{"bill_id": "A"}], agent=agent) == {"A": ["병역"]}


def test_generate_tags_raises_on_codex_failure(tmp_path):
    agent = SimpleNamespace(
        workdir=str(tmp_path),
        timeout_seconds=5,
        build_environment=dict,
        build_command=lambda *, prompt, output_path: (["codex"], prompt),
    )
    failed = SimpleNamespace(returncode=1, stdout="", stderr="auth")
    with patch.object(bill_tags.subprocess, "run", return_value=failed), pytest.raises(RuntimeError, match="auth"):
        bill_tags.generate_tags([{"bill_id": "A"}], agent=agent)
