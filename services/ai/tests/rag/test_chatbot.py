"""실제 Qdrant local 검색과 원문 대조를 거쳐 답변의 출처를 검사한다."""

from dataclasses import replace
from datetime import date
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from qdrant_client import QdrantClient

from lawdigest_ai.rag.chatbot import InvalidGrounding, LawdigestionChatbot
from lawdigest_ai.rag.indexing import build_index
from lawdigest_ai.rag.schemas import GeneratedAnswer, QuestionRequest
from lawdigest_ai.rag.settings import RagSettings
from lawdigest_ai.rag.vector_store import VectorStore


def bill(bill_id="B001", assembly=22):
    return dict(
        bill_id=bill_id,
        bill_name="주거 지원법 일부개정법률안",
        title="청년 주거 지원",
        summary="청년의 주거 안정을 위해 임차료 지원 대상을 확대하려는 것임.",
        gpt_summary=None,
        assembly_number=assembly,
        propose_date=date(2026, 7, 10),
        stage="위원회 심사",
        bill_result=None,
    )


class Repository:
    def __init__(self, rows):
        self.rows = {row["bill_id"]: row for row in rows}

    def hydrate(self, ids, assembly):
        return {
            key: row
            for key, row in self.rows.items()
            if key in ids and (not assembly or row["assembly_number"] == assembly)
        }

    def stats(self, assembly):
        rows = self.hydrate(list(self.rows), assembly).values()
        return {
            "count": len(rows),
            "data_as_of": max((r["propose_date"] for r in rows), default=None),
        }


@pytest.fixture
def qa():
    settings = replace(RagSettings(), dimensions=3, min_score=0.1)
    client = QdrantClient(":memory:")
    embedder = MagicMock()
    embedder.generate_many.side_effect = lambda texts: [[1.0, 0.0, 0.0] for _ in texts]
    rows = [bill(), bill("B021", 21)]
    build_index(
        client, embedder, settings, rows, "lawdigest_rag_v1_test", activate=True
    )
    llm = MagicMock()
    llm.responses.parse.return_value = SimpleNamespace(
        status="completed",
        output_parsed=GeneratedAnswer(
            answerable=True,
            paragraphs=[
                {
                    "text": "임차료 지원 대상을 확대하는 법안입니다.",
                    "source_keys": ["S1"],
                }
            ],
            limitations=[],
        ),
    )
    service = LawdigestionChatbot(
        settings=settings,
        repository=Repository(rows),
        vector_store=VectorStore(client=client),
        embedder=embedder,
        llm=llm,
    )
    yield service
    client.close()


def test_real_local_query_returns_current_evidence_and_structured_answer(qa):
    result = qa.answer("청년 주거 지원은 무엇인가요?")
    assert result.status == "answered"
    assert [s.bill_id for s in result.sources] == ["B001"]
    assert result.sources[0].detail_url == "/bill/B001"
    assert result.sources[0].excerpt in qa.repository.rows["B001"]["summary"]
    kwargs = qa.llm.responses.parse.call_args.kwargs
    assert kwargs["store"] is False
    assert kwargs["text_format"] is GeneratedAnswer
    assert kwargs["model"] == "gpt-4o-mini"


def test_assembly_filter_includes_disposed_previous_assembly_only_when_selected(qa):
    result = qa.answer(QuestionRequest(question="주거 지원 법안은?", assembly=21))
    assert [s.bill_id for s in result.sources] == ["B021"]
    assert result.metadata.indexed_bills == 1


def test_changed_original_is_not_sent_to_generation(qa):
    qa.repository.rows["B001"]["summary"] = "현재 DB에서 내용이 바뀐 원문"
    result = qa.answer("청년 주거 지원 내용은?")
    assert result.status == "insufficient_evidence"
    assert result.sources == []
    assert result.metadata.lagging is True
    qa.llm.responses.parse.assert_not_called()


def test_status_changes_are_hydrated_without_invalidating_unchanged_original(qa):
    qa.repository.rows["B001"].update(
        stage="본회의 의결", bill_result="수정가결", gpt_summary="새 AI 요약"
    )
    result = qa.answer("주거 지원 내용은?")
    assert result.status == "answered"
    assert result.sources[0].stage == "본회의 의결"
    assert result.sources[0].result == "수정가결"


def test_deleted_evidence_skips_generation(qa):
    qa.repository.rows["B001"] = bill("B002")
    result = qa.answer("청년 주거 지원 내용은?")
    assert result.status == "insufficient_evidence"
    qa.llm.responses.parse.assert_not_called()


def test_follow_up_reads_current_original_instead_of_previous_answer(qa):
    qa.repository.rows["B001"]["summary"] = "현재 원문: 지원 연령을 늘리는 개정안임."
    result = qa.answer(
        QuestionRequest(
            question="그 법안의 지원 대상은?",
            history=[
                {
                    "question": "주거 지원 법안은?",
                    "source_ids": ["B001"],
                    "assembly": 22,
                }
            ],
        )
    )
    assert result.sources[0].excerpt == qa.repository.rows["B001"]["summary"]


@pytest.mark.parametrize(
    "parsed",
    [
        {"answerable": True, "paragraphs": [], "limitations": []},
        {
            "answerable": True,
            "paragraphs": [{"text": "주장", "source_keys": ["INVENTED"]}],
            "limitations": [],
        },
        {
            "answerable": True,
            "paragraphs": [{"text": "   ", "source_keys": ["S1"]}],
            "limitations": [],
        },
    ],
)
def test_answer_without_valid_citations_is_rejected(qa, parsed):
    qa.llm.responses.parse.return_value.output_parsed = GeneratedAnswer.model_validate(
        parsed
    )
    with pytest.raises(InvalidGrounding):
        qa.answer("주거 지원 내용은?")


@pytest.mark.parametrize("status,parsed", [("incomplete", None), ("completed", None)])
def test_incomplete_or_refused_model_output_is_not_a_success(qa, status, parsed):
    qa.llm.responses.parse.return_value = SimpleNamespace(
        status=status, output_parsed=parsed
    )
    with pytest.raises(InvalidGrounding):
        qa.answer("주거 지원 내용은?")


def test_model_insufficient_evidence_is_explicit(qa):
    qa.llm.responses.parse.return_value.output_parsed = GeneratedAnswer(
        answerable=False, paragraphs=[], limitations=["시행 여부는 자료에 없습니다."]
    )
    result = qa.answer("지금 시행 중인가요?")
    assert result.status == "insufficient_evidence"
    assert result.paragraphs == result.sources == []


def test_metadata_warns_when_database_has_newer_unindexed_bills(qa):
    qa.repository.rows["B003"] = {**bill("B003"), "propose_date": date(2026, 11, 2)}
    status = qa.status(22)
    assert status.available_bills == 2
    assert status.indexed_bills == 1
    assert status.lagging is True
