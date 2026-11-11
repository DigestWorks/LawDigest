"""실제 Qdrant local 검색과 원문 대조를 거쳐 답변의 출처를 검사한다."""

from dataclasses import replace
from datetime import date
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from qdrant_client import QdrantClient

from lawdigest_ai.rag.chatbot import InvalidGrounding, LawdigestionChatbot
from lawdigest_ai.rag.indexing import build_index, prepare_chunks
from lawdigest_ai.rag.schemas import GeneratedAnswer, QuestionRequest
from lawdigest_ai.rag.settings import RagSettings
from lawdigest_ai.rag.vector_store import VectorStore


def bill(bill_id="B001", assembly=22):
    return {
        "bill_id": bill_id,
        "bill_name": "주거 지원법 일부개정법률안",
        "title": "청년 주거 지원",
        "summary": "청년의 주거 안정을 위해 임차료 지원 대상을 확대하려는 것임.",
        "gpt_summary": None,
        "assembly_number": assembly,
        "propose_date": date(2026, 7, 10),
        "stage": "위원회 심사",
        "bill_result": None,
    }


class Repository:
    def __init__(self, rows, members=None, proposals=None, parties=None):
        self.rows = {row["bill_id"]: row for row in rows}
        # 의원 프로필, 의원·정당별 대표발의 법안 ID({id: [bill_id]}, 정당은 {party_id: [(bill_id, 발의 의원)]})
        self.members = members or []
        self.proposals = proposals or {}
        self.parties = parties or []
        self.party_proposals = {}
        # 법안별 대표발의자 행 {bill_id: [row]}
        self.representatives = {}

    def proposer_info(self, bill_ids):
        return {
            i: self.representatives[i] for i in bill_ids if i in self.representatives
        }

    def directory(self):
        return {
            "members": [member["name"] for member in self.members],
            "parties": [party["name"] for party in self.parties],
        }

    def find_parties(self, names):
        return [party for party in self.parties if party["name"] in names][:2]

    def party_bills(self, party_ids, assembly, limit=8):
        pairs = [p for pid in party_ids for p in self.party_proposals.get(pid, [])]
        rows = self.hydrate([bill_id for bill_id, _ in pairs], assembly)
        proposers = dict(pairs)
        found = [{**rows[i], "proposers": [proposers[i]]} for i in rows]
        return sorted(found, key=lambda row: row["propose_date"], reverse=True)[:limit]

    def find_members(self, name, assembly):
        return [
            member
            for member in self.members
            if member["name"] == name
            and (not assembly or member["assembly_number"] == assembly)
        ][:2]

    def member_bills(self, congressman_ids, assembly, limit=6):
        ids = [i for cid in congressman_ids for i in self.proposals.get(cid, [])]
        rows = self.hydrate(ids, assembly).values()
        return sorted(rows, key=lambda row: row["propose_date"], reverse=True)[:limit]

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
    embedder.generate_many.side_effect = lambda texts, **kwargs: [
        [1.0, 0.0, 0.0] for _ in texts
    ]
    rows = [bill(), bill("B021", 21)]
    build_index(
        client, embedder, settings, rows, "lawdigest_rag_v1_test", activate=True
    )
    generator = MagicMock(
        return_value=GeneratedAnswer(
            answerable=True,
            paragraphs=[
                {
                    "text": "임차료 지원 대상을 확대하는 법안입니다.",
                    "source_keys": ["S1"],
                }
            ],
            limitations=[],
        )
    )
    service = LawdigestionChatbot(
        settings=settings,
        repository=Repository(rows),
        vector_store=VectorStore(client=client),
        embedder=embedder,
        generator=generator,
    )
    yield service
    client.close()


def test_real_local_query_returns_current_evidence_and_structured_answer(qa):
    result = qa.answer("청년 주거 지원은 무엇인가요?")
    assert result.status == "answered"
    assert [s.bill_id for s in result.sources] == ["B001"]
    assert result.sources[0].detail_url == "/bill/B001"
    assert result.sources[0].excerpt in qa.repository.rows["B001"]["summary"]
    _, context = qa.generator.call_args.args
    assert context["evidence"][0]["bill_id"] == "B001"
    assert context["question"] == "청년 주거 지원은 무엇인가요?"


def test_assembly_filter_includes_disposed_previous_assembly_only_when_selected(qa):
    result = qa.answer(QuestionRequest(question="주거 지원 법안은?", assembly=21))
    assert [s.bill_id for s in result.sources] == ["B021"]
    assert result.metadata.indexed_bills == 1


@pytest.mark.parametrize(
    ("question", "expected"),
    [
        ("2026년 3월 6일 발의된 주거 지원법은?", ["B002", "B001"]),
        ("2026-03-06에 제출된 주거 지원법은?", ["B002", "B001"]),
        ("2026년 3월 6일 의결된 주거 지원법은?", ["B001", "B002"]),
        ("2026년 7월 10일과 2026년 3월 6일 발의된 법안은?", ["B001", "B002"]),
        ("2026-03-06 이후 발의된 주거 지원법은?", ["B001", "B002"]),
        ("2026-03-06에 발의되지 않은 주거 지원법은?", ["B001", "B002"]),
        ("2026년 2월 30일 발의된 주거 지원법은?", ["B001", "B002"]),
    ],
)
def test_only_an_explicit_single_proposal_date_reorders_sources(qa, question, expected):
    matching = {**bill("B002"), "propose_date": date(2026, 3, 6)}
    qa.repository.rows["B002"] = matching
    rows = [qa.repository.rows["B001"], matching]
    qa.vector_store.search = MagicMock(
        return_value=[
            SimpleNamespace(payload=chunk["payload"])
            for chunk in prepare_chunks(rows, qa.settings)
        ],
    )
    sources, stale = qa._retrieve(QuestionRequest(question=question))
    assert [source.bill_id for source in sources] == expected
    assert not stale


def test_changed_original_is_not_sent_to_generation(qa):
    qa.repository.rows["B001"]["summary"] = "현재 DB에서 내용이 바뀐 원문"
    result = qa.answer("청년 주거 지원 내용은?")
    assert result.status == "insufficient_evidence"
    assert result.sources == []
    assert result.metadata.lagging is True
    qa.generator.assert_not_called()


def test_status_changes_are_hydrated_without_invalidating_unchanged_original(qa):
    qa.repository.rows["B001"].update(
        stage="본회의 의결", bill_result="수정가결", gpt_summary="새 AI 요약"
    )
    result = qa.answer("주거 지원 내용은?")
    assert result.status == "answered"
    assert result.sources[0].stage == "본회의 의결"
    assert result.sources[0].result == "수정가결"


def test_combined_committee_results_do_not_imply_a_plenary_result(qa):
    qa.repository.rows["B001"].update(
        stage="체계자구 심사", bill_result="수정가결 원안가결"
    )
    result = qa.answer("이 법안은 국회를 통과했나요?")
    assert result.sources[0].stage == "체계자구 심사"
    assert result.sources[0].result is None


@pytest.mark.parametrize("previous_assembly", [22, 0])
def test_follow_up_does_not_mark_out_of_scope_sources_as_stale(qa, previous_assembly):
    result = qa.answer(
        QuestionRequest(
            question="그 법안은 국회를 통과했나요?",
            assembly=21,
            history=[
                {
                    "question": "주거 지원 법안은?",
                    "source_ids": ["B001"],
                    "assembly": previous_assembly,
                }
            ],
        )
    )
    assert [source.bill_id for source in result.sources] == ["B021"]
    assert result.metadata.lagging is False


def test_deleted_evidence_skips_generation(qa):
    qa.repository.rows["B001"] = bill("B002")
    result = qa.answer("청년 주거 지원 내용은?")
    assert result.status == "insufficient_evidence"
    qa.generator.assert_not_called()


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
    qa.generator.return_value = GeneratedAnswer.model_validate(parsed)
    with pytest.raises(InvalidGrounding):
        qa.answer("주거 지원 내용은?")


def test_model_insufficient_evidence_is_explicit(qa):
    qa.generator.return_value = GeneratedAnswer(
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


def test_answer_prompt_asks_for_friendly_formal_endings(qa):
    qa.answer("청년 주거 지원은 무엇인가요?")
    prompt, _ = qa.generator.call_args.args
    assert "'-입니다', '-습니다'로 끝내는 합니다체" in prompt
    assert "친절하고 쉬운 말" in prompt
    # 답변을 만드는 과정이 아니라 찾은 법안을 사용자에게 소개한다.
    assert "'제공된', '발췌문'" in prompt
    assert "그 검색어로 찾은 법안을 소개한다" in prompt
