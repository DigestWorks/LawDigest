"""공개 질의응답과 내부 생성 결과의 경계를 정의한다."""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class PriorQuestion(StrictModel):
    question: str = Field(min_length=2, max_length=1000)
    source_ids: list[str] = Field(default_factory=list, max_length=8)
    assembly: Literal[0, 21, 22] = 22

    @field_validator("source_ids")
    @classmethod
    def valid_ids(cls, values):
        import re

        if any(not re.fullmatch(r"[A-Za-z0-9_-]{1,100}", value) for value in values):
            raise ValueError("법안 식별자가 올바르지 않습니다.")
        return list(dict.fromkeys(values))


class QuestionRequest(StrictModel):
    question: str = Field(min_length=2, max_length=1000)
    assembly: Literal[0, 21, 22] = 22
    history: list[PriorQuestion] = Field(default_factory=list, max_length=4)

    @field_validator("question", mode="before")
    @classmethod
    def normalize_question(cls, value):
        return value.strip() if isinstance(value, str) else value


class IndexStatus(StrictModel):
    available: bool
    indexed_bills: int = 0
    available_bills: int = 0
    data_as_of: date | None = None
    index_as_of: datetime | None = None
    index_latest_proposal: date | None = None
    lagging: bool = False


class Source(StrictModel):
    key: str
    bill_id: str
    bill_name: str
    assembly: int
    propose_date: date
    stage: str
    result: str | None
    excerpt: str
    detail_url: str
    official_url: str


class AnswerParagraph(StrictModel):
    text: str = Field(min_length=1, max_length=2000)
    source_keys: list[str] = Field(min_length=1, max_length=5)


class GeneratedAnswer(StrictModel):
    answerable: bool
    paragraphs: list[AnswerParagraph] = Field(max_length=8)
    limitations: list[str] = Field(max_length=3)


class AnswerResponse(StrictModel):
    status: Literal["answered", "insufficient_evidence", "searched"]
    paragraphs: list[AnswerParagraph]
    sources: list[Source]
    limitations: list[str]
    metadata: IndexStatus


class AgentDecision(StrictModel):
    action: Literal["search", "read", "member", "answer"]
    query: str = Field(max_length=1000)
    bill_ids: list[str] = Field(max_length=3)


class AgentStep(StrictModel):
    id: str
    name: Literal["search", "read", "answer"]
    status: Literal["running", "complete"]
    summary: str


class ErrorResponse(StrictModel):
    code: str
    message: str
    retry_after: int | None = None
