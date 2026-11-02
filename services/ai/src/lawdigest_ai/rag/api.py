"""루프백에서 Next 서버 프록시에만 제공하는 질의응답 API."""

from contextlib import asynccontextmanager
import logging
import re
import secrets

from fastapi import Depends, FastAPI, Header, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from lawdigest_ai.rag.chatbot import LawdigestionChatbot
from lawdigest_ai.rag.limits import RequestLimited, RequestLimits
from lawdigest_ai.rag.schemas import (
    AnswerResponse,
    ErrorResponse,
    IndexStatus,
    QuestionRequest,
)
from lawdigest_ai.rag.settings import RagSettings

logger = logging.getLogger(__name__)


def create_app(*, service=None, settings=None):
    @asynccontextmanager
    async def lifespan(app):
        if app.state.service is None:
            try:
                app.state.settings = app.state.settings or RagSettings.from_env()
                app.state.service = LawdigestionChatbot(settings=app.state.settings)
            except Exception as exc:
                # 키·질문·답변·예외의 원문을 로그에 남기지 않는다.
                logger.error("QA startup unavailable: %s", type(exc).__name__)
        app.state.limits = RequestLimits(app.state.settings or RagSettings())
        yield

    app = FastAPI(
        title="LawDigest internal question API",
        lifespan=lifespan,
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
    )
    app.state.service = service
    app.state.settings = settings

    @app.exception_handler(RequestValidationError)
    async def invalid_request(_request, _error):
        return JSONResponse(
            status_code=400,
            content=ErrorResponse(
                code="QA_INVALID_REQUEST", message="질문과 자료 범위를 확인해 주세요."
            ).model_dump(),
        )

    def internal(authorization: str = Header(default="")):
        token = (app.state.settings or RagSettings()).internal_token
        if len(token) < 24:
            return JSONResponse(
                status_code=503,
                content=ErrorResponse(
                    code="QA_UNAVAILABLE", message="질의응답을 잠시 사용할 수 없습니다."
                ).model_dump(),
            )
        provided = authorization.removeprefix("Bearer ")
        if (
            not authorization.startswith("Bearer ")
            or len(provided) > 256
            or not secrets.compare_digest(provided.encode(), token.encode())
        ):
            return JSONResponse(
                status_code=401,
                content=ErrorResponse(
                    code="QA_UNAUTHORIZED", message="허용되지 않은 요청입니다."
                ).model_dump(),
            )
        return None

    @app.get("/health")
    def health():
        return {"status": "ok", "configured": app.state.service is not None}

    @app.get("/v1/status", response_model=IndexStatus)
    def status(assembly: int = 22, denied=Depends(internal)):
        if denied is not None:
            return denied
        if assembly not in (0, 21, 22):
            return JSONResponse(
                status_code=400,
                content=ErrorResponse(
                    code="QA_INVALID_REQUEST", message="자료 범위를 확인해 주세요."
                ).model_dump(),
            )
        try:
            if app.state.service is None:
                return IndexStatus(available=False)
            return app.state.service.status(assembly)
        except Exception as exc:
            logger.warning("QA status unavailable: %s", type(exc).__name__)
            return IndexStatus(available=False)

    @app.post("/v1/answers", response_model=AnswerResponse)
    def answer(payload: QuestionRequest, request: Request, denied=Depends(internal)):
        if denied is not None:
            return denied
        client = request.headers.get("x-rag-client", "")
        if not re.fullmatch(r"[a-f0-9]{32,64}", client):
            return JSONResponse(
                status_code=400,
                content=ErrorResponse(
                    code="QA_INVALID_REQUEST", message="요청을 확인할 수 없습니다."
                ).model_dump(),
            )
        if app.state.service is None:
            return JSONResponse(
                status_code=503,
                content=ErrorResponse(
                    code="QA_UNAVAILABLE", message="질의응답을 잠시 사용할 수 없습니다."
                ).model_dump(),
            )
        try:
            with app.state.limits.lease(client):
                return app.state.service.answer(payload)
        except RequestLimited as exc:
            message = "질문 요청이 많습니다. 잠시 후 다시 시도해 주세요."
            if exc.code == "QA_DAILY_LIMIT":
                message = (
                    "오늘의 질문 요청 한도에 도달했습니다. 내일 다시 이용해 주세요."
                )
            return JSONResponse(
                status_code=429,
                headers={"Retry-After": str(exc.retry_after)},
                content=ErrorResponse(
                    code=exc.code, message=message, retry_after=exc.retry_after
                ).model_dump(),
            )
        except Exception as exc:
            logger.warning("QA answer failed: %s", type(exc).__name__)
            return JSONResponse(
                status_code=503,
                content=ErrorResponse(
                    code="QA_UNAVAILABLE",
                    message="답변을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.",
                ).model_dump(),
            )

    return app


app = create_app()
