from dataclasses import dataclass, field
import os

from dotenv import load_dotenv
from lawdigest_ai.rag.local_embedding import E5_DIMENSIONS, E5_MODEL_ID


@dataclass(frozen=True)
class RagSettings:
    collection: str = "lawdigest_rag_active"
    embedding_model: str = "text-embedding-3-small"
    embedding_backend: str = "openai"
    embedding_dir: str | None = None
    embedding_threads: int = 2
    dimensions: int = 1536
    model: str = "gpt-5.4-mini"
    top_k: int = 5
    min_score: float = 0.35
    qdrant_url: str | None = None
    qdrant_key: str | None = field(default=None, repr=False)
    openai_key: str = field(default="", repr=False)
    openai_base_url: str = "https://api.openai.com/v1"
    internal_token: str = field(default="", repr=False)
    db_mode: str = "prod"
    concurrent_requests: int = 2
    requests_per_window: int = 5
    window_seconds: int = 300
    daily_requests: int = 500

    @classmethod
    def from_env(cls):
        if os.getenv("RAG_ENV_FILE"):
            load_dotenv(os.environ["RAG_ENV_FILE"])
        from lawdigest_ai import config

        backend = os.getenv("RAG_EMBEDDING_BACKEND", "e5")
        local = backend == "e5"

        settings = cls(
            collection=os.getenv("RAG_COLLECTION", "lawdigest_rag_active"),
            embedding_backend=backend,
            embedding_model=os.getenv(
                "RAG_EMBEDDING_MODEL", E5_MODEL_ID if local else config.EMBEDDING_MODEL
            ),
            embedding_dir=os.getenv("RAG_EMBEDDING_DIR"),
            embedding_threads=int(os.getenv("RAG_EMBEDDING_THREADS", "2")),
            dimensions=int(
                os.getenv("RAG_VECTOR_SIZE", str(E5_DIMENSIONS) if local else "1536")
            ),
            model=os.getenv("RAG_MODEL", "gpt-5.4-mini"),
            top_k=int(os.getenv("RAG_TOP_K", "5")),
            min_score=float(os.getenv("RAG_MIN_SCORE", "0.84" if local else "0.35")),
            qdrant_url=os.getenv("RAG_QDRANT_URL") or os.getenv("QDRANT_URL"),
            qdrant_key=os.getenv("QDRANT_API_KEY"),
            openai_key=os.getenv("RAG_OPENAI_API_KEY")
            or os.getenv("OPENAI_API_KEY")
            or os.getenv("APIKEY_OPENAI")
            or "",
            openai_base_url=config.OPENAI_BASE_URL,
            internal_token=os.getenv("RAG_INTERNAL_TOKEN", ""),
            db_mode=os.getenv("RAG_DB_MODE", "prod"),
            concurrent_requests=int(os.getenv("RAG_CONCURRENT_REQUESTS", "2")),
            requests_per_window=int(os.getenv("RAG_REQUESTS_PER_WINDOW", "5")),
            window_seconds=int(os.getenv("RAG_WINDOW_SECONDS", "300")),
            daily_requests=int(os.getenv("RAG_DAILY_REQUESTS", "500")),
        )
        if backend not in {"e5", "openai"} or not 1 <= settings.embedding_threads <= 4:
            raise ValueError("임베딩 실행 방식 또는 CPU 스레드 수가 올바르지 않습니다.")
        if local and (
            settings.embedding_model != E5_MODEL_ID
            or settings.dimensions != E5_DIMENSIONS
        ):
            raise ValueError("로컬 E5 모델 revision과 벡터 차원을 확인해 주세요.")
        if not 1 <= settings.top_k <= 8 or not 0 <= settings.min_score <= 1:
            raise ValueError("질의응답 검색 설정 범위가 올바르지 않습니다.")
        if settings.db_mode not in {"prod", "test"} or settings.dimensions < 1:
            raise ValueError("질의응답 저장소 설정이 올바르지 않습니다.")
        if not all(
            value > 0
            for value in [
                settings.concurrent_requests,
                settings.requests_per_window,
                settings.window_seconds,
                settings.daily_requests,
            ]
        ):
            raise ValueError("질의응답 요청 한도는 양수여야 합니다.")
        return settings
