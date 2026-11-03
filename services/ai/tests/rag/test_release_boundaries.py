from dataclasses import replace
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import MagicMock
from zoneinfo import ZoneInfo

from fastapi.testclient import TestClient
import pytest
from qdrant_client import QdrantClient

from lawdigest_ai.rag.api import create_app
from lawdigest_ai.rag.embedding import EmbeddingGenerator
from lawdigest_ai.rag.indexing import (
    MANIFEST_ID,
    build_index,
    chunk_text,
    read_manifest,
)
from lawdigest_ai.rag.limits import RequestLimited, RequestLimits
from lawdigest_ai.rag.repository import BillRepository
from lawdigest_ai.rag.schemas import IndexStatus
from lawdigest_ai.rag.settings import RagSettings
from tests.rag.test_chatbot import bill


TOKEN = "test-private-proxy-token-123456789"
HEADERS = {"Authorization": f"Bearer {TOKEN}", "x-rag-client": "a" * 64}


@pytest.fixture
def api():
    service = MagicMock()
    service.status.return_value = IndexStatus(
        available=True, indexed_bills=1, available_bills=1
    )
    service.answer.return_value = dict(
        status="insufficient_evidence",
        paragraphs=[],
        sources=[],
        limitations=["근거 부족"],
        metadata=service.status.return_value,
    )
    settings = replace(RagSettings(), internal_token=TOKEN, requests_per_window=2)
    with TestClient(create_app(service=service, settings=settings)) as client:
        yield client, service


@pytest.mark.parametrize("auth", [None, "Bearer wrong", TOKEN])
def test_private_api_rejects_missing_or_wrong_proxy_token(api, auth):
    client, service = api
    headers = {} if auth is None else {"Authorization": auth}
    response = client.post(
        "/v1/answers", json={"question": "질문입니다"}, headers=headers
    )
    assert response.status_code == 401
    service.answer.assert_not_called()


@pytest.mark.parametrize(
    "payload",
    [
        {"question": " "},
        {"question": "x" * 1001},
        {"question": "질문", "assembly": 20},
        {"question": "질문", "extra": "not allowed"},
        {
            "question": "질문",
            "history": [{"question": "이전", "source_ids": ["../bad"]}],
        },
    ],
)
def test_invalid_request_never_calls_model(api, payload):
    client, service = api
    response = client.post("/v1/answers", json=payload, headers=HEADERS)
    assert response.status_code == 400
    assert "input" not in response.text
    service.answer.assert_not_called()


def test_api_distinguishes_insufficient_evidence_from_provider_failure(api):
    client, service = api
    first = client.post(
        "/v1/answers", json={"question": "근거가 있나요?"}, headers=HEADERS
    )
    assert first.status_code == 200
    assert first.json()["status"] == "insufficient_evidence"
    service.answer.side_effect = RuntimeError("secret upstream URL or question")
    failed = client.post("/v1/answers", json={"question": "다시 질문"}, headers=HEADERS)
    assert failed.status_code == 503
    assert "secret" not in failed.text


def test_request_limit_counts_failed_generations_and_sets_retry_after(api):
    client, service = api
    service.answer.side_effect = RuntimeError("provider failed")
    for _ in range(2):
        assert (
            client.post(
                "/v1/answers", json={"question": "질문입니다"}, headers=HEADERS
            ).status_code
            == 503
        )
    limited = client.post(
        "/v1/answers", json={"question": "질문입니다"}, headers=HEADERS
    )
    assert limited.status_code == 429
    assert limited.json()["code"] == "QA_RATE_LIMIT"
    assert int(limited.headers["retry-after"]) > 0
    assert service.answer.call_count == 2


def test_limits_release_concurrency_and_roll_over_at_korean_midnight():
    clock = [0.0]
    now = [datetime(2026, 11, 3, 23, 59, tzinfo=ZoneInfo("Asia/Seoul"))]
    limits = RequestLimits(
        replace(RagSettings(), concurrent_requests=1, daily_requests=1),
        monotonic=lambda: clock[0],
        now=lambda: now[0],
    )
    with limits.lease("one"):
        with pytest.raises(RequestLimited, match="QA_BUSY"):
            with limits.lease("two"):
                pass
    with pytest.raises(RequestLimited, match="QA_DAILY_LIMIT") as error:
        with limits.lease("two"):
            pass
    assert error.value.retry_after == 60
    now[0] = datetime(2026, 11, 4, tzinfo=ZoneInfo("Asia/Seoul"))
    with limits.lease("two"):
        pass


def test_repository_uses_read_only_bound_query_and_always_closes():
    connection = MagicMock()
    cursor = connection.cursor.return_value.__enter__.return_value
    cursor.fetchall.return_value = [bill()]
    repository = BillRepository(connection_factory=lambda: connection)
    assert "B001" in repository.hydrate(["B001"], 22)
    assert cursor.execute.call_args_list[0].args == ("SET TRANSACTION READ ONLY",)
    sql, params = cursor.execute.call_args.args
    assert "bill_id IN (%s)" in sql and "assembly_number = %s" in sql
    assert params == ["B001", 22]
    connection.commit.assert_not_called()
    connection.rollback.assert_called_once()
    connection.close.assert_called_once()


def test_failed_read_rolls_back_and_closes():
    connection = MagicMock()
    connection.cursor.return_value.__enter__.return_value.execute.side_effect = (
        RuntimeError("DB error")
    )
    with pytest.raises(RuntimeError):
        BillRepository(connection_factory=lambda: connection).stats()
    connection.rollback.assert_called_once()
    connection.close.assert_called_once()


def test_embedding_preserves_response_order_and_rejects_missing_or_nonfinite_vectors():
    client = MagicMock()
    embedder = EmbeddingGenerator(client=client)
    client.embeddings.create.return_value.data = [
        SimpleNamespace(index=1, embedding=[0.0, 1.0]),
        SimpleNamespace(index=0, embedding=[1.0, 0.0]),
    ]
    assert embedder.generate_many(["one", "two"]) == [[1.0, 0.0], [0.0, 1.0]]
    client.embeddings.create.return_value.data = [
        SimpleNamespace(index=0, embedding=[float("nan")])
    ]
    with pytest.raises(RuntimeError):
        embedder.generate_many(["one"])
    with pytest.raises(RuntimeError):
        embedder.generate_many(["one", "two"])


def test_index_failure_keeps_old_alias_and_never_recreates_collection():
    settings = replace(RagSettings(), dimensions=3)
    embedder = MagicMock()
    embedder.generate_many.side_effect = lambda texts, **kwargs: [
        [1.0, 0.0, 0.0] for _ in texts
    ]
    client = QdrantClient(":memory:")
    try:
        build_index(
            client, embedder, settings, [bill()], "lawdigest_rag_v1_old", activate=True
        )
        embedder.generate_many.side_effect = RuntimeError("embedding failed")
        with pytest.raises(RuntimeError):
            build_index(
                client,
                embedder,
                settings,
                [bill()],
                "lawdigest_rag_v1_failed",
                activate=True,
            )
        assert client.get_aliases().aliases[0].collection_name == "lawdigest_rag_v1_old"
        assert client.retrieve("lawdigest_rag_v1_failed", ids=[MANIFEST_ID]) == []
        with pytest.raises(ValueError, match="이미 있는"):
            build_index(client, embedder, settings, [bill()], "lawdigest_rag_v1_old")
        assert read_manifest(client, settings.collection, settings)["bill_count"] == 1
    finally:
        client.close()


def test_chunking_keeps_unicode_and_token_limit():
    import tiktoken

    encoding = tiktoken.encoding_for_model("text-embedding-3-small")
    text = "청년의 임차료 지원 범위를 확대한다.\n" * 500
    chunks = list(chunk_text(text, lambda value: len(encoding.encode(value))))
    assert len(chunks) > 1
    assert all(
        chunk in text and "�" not in chunk and len(encoding.encode(chunk)) <= 700
        for chunk in chunks
    )


def test_index_never_writes_when_chunk_count_differs_from_approval():
    settings = replace(RagSettings(), dimensions=3)
    embedder = MagicMock()
    client = QdrantClient(":memory:")
    try:
        with pytest.raises(ValueError, match="승인 범위"):
            build_index(
                client,
                embedder,
                settings,
                [bill()],
                "lawdigest_rag_v1_count_test",
                expected_chunks=99,
            )
        assert not client.collection_exists("lawdigest_rag_v1_count_test")
        embedder.generate_many.assert_not_called()
    finally:
        client.close()
