from __future__ import annotations

import logging
import math
from typing import List, Optional
from openai import OpenAI
from lawdigest_ai import config

logger = logging.getLogger(__name__)


class EmbeddingGenerator:
    """OpenAI 또는 HuggingFace 임베딩 모델로 텍스트 벡터를 생성합니다."""

    def __init__(
        self,
        model_type: str = "openai",
        model_name: Optional[str] = None,
        *,
        client=None,
    ):
        self.model_type = model_type
        self.model_name = model_name or config.EMBEDDING_MODEL
        self.client = None
        self.huggingface_model = None

        if model_type == "openai":
            try:
                self.client = client or OpenAI(api_key=config.get_openai_api_key())
            except Exception as e:
                logger.error("OpenAI 초기화 실패: %s", type(e).__name__)
        elif model_type == "huggingface":
            if not model_name:
                raise ValueError(
                    "HuggingFace 모델을 사용하려면 model_name을 지정해야 합니다."
                )
            try:
                from sentence_transformers import SentenceTransformer

                self.huggingface_model = SentenceTransformer(model_name)
            except Exception as e:
                logger.error(f"HuggingFace 모델 로드 실패: {e}")

    def generate(self, text: str) -> Optional[List[float]]:
        """텍스트에 대한 임베딩 벡터를 반환합니다."""
        if not text or not isinstance(text, str):
            return None

        if self.model_type == "openai":
            if not self.client:
                return None
            try:
                response = self.client.embeddings.create(
                    input=[text.replace("\n", " ")],
                    model=self.model_name,
                )
                return response.data[0].embedding
            except Exception as e:
                logger.error("임베딩 생성 실패: %s", type(e).__name__)
                return None

        elif self.model_type == "huggingface":
            if not self.huggingface_model:
                return None
            try:
                return self.huggingface_model.encode(text).tolist()
            except Exception as e:
                logger.exception(f"HuggingFace 임베딩 생성 실패: {e}")
                return None
        return None

    def generate_many(self, texts: List[str]) -> List[List[float]]:
        """출시 경로에서는 실패·누락 벡터를 성공으로 숨기지 않는다."""
        if not texts or any(
            not isinstance(text, str) or not text.strip() for text in texts
        ):
            raise ValueError("임베딩할 원문이 비었습니다.")
        if self.model_type != "openai" or self.client is None:
            raise RuntimeError("출시용 임베딩 클라이언트를 사용할 수 없습니다.")
        response = self.client.embeddings.create(input=texts, model=self.model_name)
        entries = sorted(response.data, key=lambda entry: entry.index)
        if [entry.index for entry in entries] != list(range(len(texts))):
            raise RuntimeError("임베딩 결과 개수가 입력과 다릅니다.")
        vectors = [entry.embedding for entry in entries]
        if any(
            not vector
            or not all(math.isfinite(value) for value in vector)
            or not any(vector)
            for vector in vectors
        ):
            raise RuntimeError("유효하지 않은 임베딩 결과입니다.")
        return vectors
