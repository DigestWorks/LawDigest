from dataclasses import replace
import os
from unittest.mock import MagicMock

import pytest
from qdrant_client import QdrantClient

from lawdigest_ai.rag.chatbot import LawdigestionChatbot
from lawdigest_ai.rag.indexing import build_index, prepare_chunks
from lawdigest_ai.rag.local_embedding import (
    E5_DIMENSIONS,
    E5_MODEL_ID,
    LocalE5Embedder,
    verify_model_file,
)
from lawdigest_ai.rag.schemas import QuestionRequest
from lawdigest_ai.rag.settings import RagSettings
from lawdigest_ai.rag.vector_store import VectorStore
from tests.rag.test_chatbot import Repository, bill


def test_e5_can_prepare_settings_without_openai_credentials(monkeypatch):
    for key in (
        "RAG_ENV_FILE",
        "RAG_EMBEDDING_BACKEND",
        "RAG_EMBEDDING_MODEL",
        "RAG_VECTOR_SIZE",
        "RAG_OPENAI_API_KEY",
        "OPENAI_API_KEY",
        "APIKEY_OPENAI",
    ):
        monkeypatch.delenv(key, raising=False)
    settings = RagSettings.from_env()
    assert settings.embedding_backend == "e5"
    assert settings.dimensions == E5_DIMENSIONS
    assert settings.embedding_model == E5_MODEL_ID
    assert settings.openai_key == ""


def test_rejects_corrupted_embedding_artifact_before_loading(tmp_path):
    path = tmp_path / "tokenizer.json"
    path.write_text("corrupted")
    with pytest.raises(ValueError, match="크기"):
        verify_model_file(path, path.name)


def test_real_cpu_embedding_and_local_qdrant_retrieve_current_korean_source():
    directory = os.getenv("LAWDIGEST_TEST_E5_DIR")
    if not directory:
        pytest.skip(
            "검증한 E5 모델 디렉터리를 LAWDIGEST_TEST_E5_DIR에 지정해야 합니다."
        )
    settings = replace(
        RagSettings(),
        embedding_backend="e5",
        embedding_dir=directory,
        embedding_model=E5_MODEL_ID,
        dimensions=E5_DIMENSIONS,
        min_score=0.84,
    )
    rows = [
        {
            **bill(),
            "bill_name": "공공주택 특별법 일부개정법률안",
            "summary": "지방개발공사의 공공주택 신규투자사업 타당성 평가를 면제하여 주거복지를 강화한다.\n"
            * 35,
        },
        {
            **bill("B002"),
            "bill_name": "도로교통법 일부개정법률안",
            "summary": "긴급자동차의 통행을 방해하는 행위를 금지하고 운전자의 안전 의무를 강화한다.",
        },
    ]
    chunks = prepare_chunks(rows, settings)
    assert len(chunks) > len(rows)
    embedder = LocalE5Embedder(directory)
    client = QdrantClient(":memory:")
    try:
        manifest = build_index(
            client,
            embedder,
            settings,
            rows,
            "lawdigest_rag_v1_e5_test",
            activate=True,
            expected_chunks=len(chunks),
        )
        assert manifest["dimensions"] == 384
        service = LawdigestionChatbot(
            settings=settings,
            repository=Repository(rows),
            vector_store=VectorStore(client=client),
            embedder=embedder,
            llm=MagicMock(),
        )
        sources, stale = service._retrieve(
            QuestionRequest(
                question="지방개발공사 주택사업 타당성 평가를 면제하는 법안은?"
            )
        )
        assert sources[0].bill_id == "B001"
        assert sources[0].excerpt.split("\n\n")[0] in rows[0]["summary"]
        assert stale is False
    finally:
        client.close()
