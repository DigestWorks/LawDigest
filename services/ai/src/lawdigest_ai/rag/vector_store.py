from __future__ import annotations

import logging
import os
from typing import Any, Dict, List, Optional
from qdrant_client import QdrantClient
from qdrant_client.http import models
from lawdigest_ai import config

logger = logging.getLogger(__name__)


class VectorStore:
    """Qdrant 벡터 DB와의 연결 및 상호작용을 관리합니다."""

    def __init__(self, *, client=None, url=None, api_key=None):
        try:
            if client is not None:
                self.client = client
            elif url or os.getenv("QDRANT_URL"):
                self.client = QdrantClient(
                    url=url or os.getenv("QDRANT_URL"),
                    api_key=api_key or config.QDRANT_API_KEY,
                    timeout=10,
                )
            else:
                self.client = QdrantClient(
                    host=config.QDRANT_HOST,
                    api_key=api_key or config.QDRANT_API_KEY,
                    port=6333,
                    https=config.QDRANT_USE_HTTPS,
                    timeout=10,
                )
        except Exception as e:
            logger.error("Qdrant 초기화 실패: %s", type(e).__name__)
            self.client = None

    def create_collection(
        self, collection_name: str, vector_size: int, recreate: bool = False
    ) -> None:
        if not self.client:
            return
        if recreate:
            self.client.recreate_collection(
                collection_name=collection_name,
                vectors_config=models.VectorParams(
                    size=vector_size, distance=models.Distance.COSINE
                ),
            )
            return
        existing = [c.name for c in self.client.get_collections().collections]
        if collection_name not in existing:
            self.client.recreate_collection(
                collection_name=collection_name,
                vectors_config=models.VectorParams(
                    size=vector_size, distance=models.Distance.COSINE
                ),
            )

    def upsert(self, collection_name: str, points: list) -> None:
        if not self.client or not points:
            return
        self.client.upsert(collection_name=collection_name, points=points, wait=True)

    def search(
        self,
        collection_name: str,
        query_vector: List[float],
        limit: int = 5,
        score_threshold: Optional[float] = None,
        query_filter=None,
    ) -> List[Any]:
        """벡터 유사도 검색을 수행하고 결과를 반환합니다."""
        if not self.client:
            return []
        kwargs: Dict[str, Any] = {
            "collection_name": collection_name,
            "query": query_vector,
            "limit": limit,
            "with_payload": True,
        }
        if query_filter is not None:
            kwargs["query_filter"] = query_filter
        if score_threshold is not None:
            kwargs["score_threshold"] = score_threshold
        return self.client.query_points(**kwargs).points
