import asyncio
import json
import subprocess
import sys
from dataclasses import replace
from threading import Event, Timer
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from starlette.requests import ClientDisconnect

from lawdigest_ai.rag.agent import AgentCancelled, BillAgent
from lawdigest_ai.rag.api import AgentStream, create_app
from lawdigest_ai.rag.chatbot import InvalidGrounding
from lawdigest_ai.rag.codex_generation import CodexAnswerGenerator, CodexGenerationError
from lawdigest_ai.rag.schemas import QuestionRequest
from tests.rag.test_chatbot import qa as qa  # noqa: PLC0414 -- pytest fixture 재사용
from tests.rag.test_release_boundaries import HEADERS, TOKEN


def decision(action="answer", query="", bill_ids=None):
    return {"action": action, "query": query, "bill_ids": bill_ids or []}


def test_search_returns_verified_original_without_generation(qa):
    result = qa.search(QuestionRequest(question="청년 주거 지원"))
    assert result.status == "searched"
    assert result.sources[0].bill_id == "B001"
    qa.generator.assert_not_called()


def test_agent_reads_current_original_then_returns_validated_citations(qa):
    qa.generator.generate.side_effect = [
        decision("read", bill_ids=["B001"]),
        decision(),
        qa.generator.return_value,
    ]
    events = []
    result = BillAgent(qa).run(
        QuestionRequest(question="청년 주거 지원 내용은?"), events.append
    )
    assert result.sources[0].bill_id == "B001"
    assert [e["step"]["name"] for e in events if e["type"] == "step"] == [
        "search",
        "search",
        "read",
        "read",
        "answer",
        "answer",
    ]
    assert events[-1]["type"] == "answer"
    assert qa.generator.generate.call_count == 3


def test_agent_refines_query_when_initial_search_is_empty(qa):
    retrieve = qa._retrieve
    qa._retrieve = MagicMock(
        side_effect=[([], False), retrieve(QuestionRequest(question="임차료 지원"))]
    )
    qa.generator.generate.side_effect = [
        decision("search", "임차료 지원"),
        decision(),
        qa.generator.return_value,
    ]
    result = BillAgent(qa).run(
        QuestionRequest(question="청년 주거 정책"), lambda _: None
    )
    assert result.status == "answered"
    assert qa._retrieve.call_args.args[0].assembly == 22
    assert qa._retrieve.call_args.args[0].question == "임차료 지원"


@pytest.mark.parametrize("ids", [["B021"], ["../private"], []])
def test_agent_cannot_read_ids_outside_retrieved_sources(qa, ids):
    qa.generator.generate.return_value = decision("read", bill_ids=ids)
    with pytest.raises(InvalidGrounding):
        BillAgent(qa).run(QuestionRequest(question="청년 주거 지원"), lambda _: None)
    assert qa.generator.generate.call_count == 1


def test_agent_stops_at_tool_budget_and_rejects_invented_citation(qa):
    qa.generator.generate.side_effect = [
        decision("search", "임차료 지원"),
        decision("search", "월세 지원"),
        decision("search", "주택 지원"),
        {
            "answerable": True,
            "paragraphs": [{"text": "주장", "source_keys": ["S8"]}],
            "limitations": [],
        },
    ]
    with pytest.raises(InvalidGrounding):
        BillAgent(qa).run(QuestionRequest(question="청년 주거 지원"), lambda _: None)
    assert qa.generator.generate.call_count == 4


def test_changed_evidence_is_removed_before_final_generation(qa):
    def decide(*args, **kwargs):
        qa.repository.rows["B001"]["summary"] = "완전히 바뀐 원문"
        return decision()

    qa.generator.generate.side_effect = decide
    result = BillAgent(qa).run(
        QuestionRequest(question="청년 주거 지원"), lambda _: None
    )
    assert result.status == "insufficient_evidence"
    assert result.metadata.lagging
    assert qa.generator.generate.call_count == 1


def test_planner_failure_uses_only_validated_sources_and_reports_limited_lookup(qa):
    qa.generator.generate.side_effect = [
        CodexGenerationError("failed", reason="timeout"),
        qa.generator.return_value,
    ]
    result = BillAgent(qa).run(
        QuestionRequest(question="청년 주거 지원"), lambda _: None
    )
    assert result.status == "answered"
    assert [source.bill_id for source in result.sources] == ["B001"]
    assert any("추가 조회" in text for text in result.limitations)


def test_planner_failure_without_evidence_does_not_generate_an_answer(qa):
    qa._retrieve = MagicMock(return_value=([], False))
    qa.generator.generate.side_effect = CodexGenerationError("failed", reason="timeout")
    with pytest.raises(CodexGenerationError):
        BillAgent(qa).run(QuestionRequest(question="자료가 없는 질문"), lambda _: None)
    assert qa.generator.generate.call_count == 1


def test_agent_cancellation_prevents_subsequent_model_call(qa):
    cancel = Event()

    def emit(event):
        if event["step"]["status"] == "complete":
            cancel.set()

    with pytest.raises(AgentCancelled):
        BillAgent(qa).run(QuestionRequest(question="청년 주거 지원"), emit, cancel)
    qa.generator.generate.assert_not_called()


def test_agent_deadline_applies_before_search(qa, monkeypatch):
    monkeypatch.setattr(BillAgent, "TIMEOUT", 0)
    with pytest.raises(TimeoutError):
        BillAgent(qa).run(QuestionRequest(question="청년 주거 지원"), lambda _: None)
    qa.generator.generate.assert_not_called()


def test_cancellable_runner_terminates_real_process(monkeypatch):
    processes = []
    popen = subprocess.Popen

    def track(*args, **kwargs):
        process = popen(*args, **kwargs)
        processes.append(process)
        return process

    monkeypatch.setattr(subprocess, "Popen", track)
    cancel = Event()
    timer = Timer(0.2, cancel.set)
    timer.start()
    try:
        with pytest.raises(CodexGenerationError):
            CodexAnswerGenerator._run_cancellable(
                [sys.executable, "-c", "import time; time.sleep(20)"],
                input="{}",
                timeout=10,
                cancel=cancel,
                text=True,
            )
    finally:
        timer.cancel()
    assert len(processes) == 1
    assert processes[0].poll() is not None


def test_private_search_and_chat_share_limits_and_validated_answer(qa):
    qa.generator.generate.side_effect = [decision(), qa.generator.return_value]
    settings = replace(qa.settings, internal_token=TOKEN, requests_per_window=2)
    with TestClient(create_app(service=qa, settings=settings)) as client:
        for path in ["/v1/search", "/v1/chat"]:
            assert (
                client.post(path, json={"question": "청년 주거 지원"}).status_code
                == 401
            )
        response = client.post(
            "/v1/search", json={"question": "청년 주거 지원"}, headers=HEADERS
        )
        assert response.json()["status"] == "searched"
        response = client.post(
            "/v1/chat", json={"question": "청년 주거 지원"}, headers=HEADERS
        )
        assert response.status_code == 200
        events = [
            json.loads(line[6:])
            for line in response.text.splitlines()
            if line.startswith("data: ")
        ]
        assert events[-1]["answer"]["sources"][0]["bill_id"] == "B001"
        assert (
            client.post(
                "/v1/chat", json={"question": "다시 질문"}, headers=HEADERS
            ).status_code
            == 429
        )


def test_stream_failure_hides_provider_error_and_releases_lease(qa):
    qa.generator.generate.side_effect = RuntimeError("private provider secret")
    settings = replace(qa.settings, internal_token=TOKEN, concurrent_requests=1)
    app = create_app(service=qa, settings=settings)
    with TestClient(app) as client:
        response = client.post(
            "/v1/chat", json={"question": "청년 주거 지원"}, headers=HEADERS
        )
        assert '"type": "error"' in response.text
        assert "secret" not in response.text
        with app.state.limits.lease("next"):
            pass


def test_stream_disconnect_cancels_worker_and_releases_slot(qa, monkeypatch):
    stopped = Event()

    def run(_self, _payload, emit, cancel):
        emit(
            {
                "type": "step",
                "step": {
                    "id": "1",
                    "name": "search",
                    "status": "running",
                    "summary": "검색 중",
                },
            }
        )
        assert cancel.wait(3)
        stopped.set()

    monkeypatch.setattr(BillAgent, "run", run)
    app = create_app(
        service=qa,
        settings=replace(qa.settings, internal_token=TOKEN, concurrent_requests=1),
    )

    async def disconnect():
        delivered = False
        disconnect_now = False

        async def receive():
            nonlocal delivered
            if not delivered:
                delivered = True
                return {
                    "type": "http.request",
                    "body": json.dumps({"question": "청년 주거 지원"}).encode(),
                    "more_body": False,
                }
            while not disconnect_now:
                await asyncio.sleep(0.01)
            return {"type": "http.disconnect"}

        async def send(message):
            nonlocal disconnect_now
            if message["type"] == "http.response.body":
                disconnect_now = True

        await app(
            {
                "type": "http",
                "asgi": {"version": "3.0", "spec_version": "2.3"},
                "http_version": "1.1",
                "method": "POST",
                "scheme": "http",
                "path": "/v1/chat",
                "raw_path": b"/v1/chat",
                "query_string": b"",
                "root_path": "",
                "headers": [
                    (b"content-type", b"application/json"),
                    *[(k.lower().encode(), v.encode()) for k, v in HEADERS.items()],
                ],
                "server": ("localhost", 80),
                "client": ("localhost", 1234),
            },
            receive,
            send,
        )

    with TestClient(app):
        asyncio.run(disconnect())
        assert stopped.wait(1)
        assert app.state.limits.semaphore.acquire(timeout=1)
        app.state.limits.semaphore.release()


def test_connection_lost_before_first_frame_still_cancels_worker():
    cancel = Event()

    async def content():
        yield "unused"

    async def send(_message):
        raise OSError("closed connection")

    async def receive():
        return {"type": "http.disconnect"}

    response = AgentStream(content(), cancel=cancel)
    with pytest.raises(ClientDisconnect):
        asyncio.run(
            response({"type": "http", "asgi": {"spec_version": "2.4"}}, receive, send)
        )
    assert cancel.is_set()


def member(congressman_id="M1", name="김의원", district="서울 동작구갑"):
    return {
        "congressman_id": congressman_id,
        "name": name,
        "party": "무소속",
        "district": district,
        "elect_sort": "지역구",
        "elected": "3선",
        "commits": "국방위원회",
        "assembly_number": 22,
        "state": 1,
    }


def test_member_name_starts_from_profile_and_representative_bills(qa):
    qa.repository.members = [member()]
    qa.repository.proposals = {"M1": ["B001"]}
    qa._retrieve = MagicMock(side_effect=AssertionError("의미 검색을 하지 않는다"))
    qa.generator.generate.side_effect = [decision(), qa.generator.return_value]
    events = []
    result = BillAgent(qa).run(QuestionRequest(question="김의원"), events.append)
    assert result.status == "answered"
    assert [s.bill_id for s in result.sources] == ["B001"]
    steps = [e["step"] for e in events if e["type"] == "step"]
    assert (
        steps[1]["summary"]
        == "‘김의원’ 의원의 프로필과 대표발의 법안 1건을 확인했습니다."
    )
    assert {step["name"] for step in steps} <= {"search", "read", "answer"}
    _, context = qa.generator.generate.call_args_list[-1].args
    assert context["members"] == [
        {
            "name": "김의원",
            "party": "무소속",
            "district": "서울 동작구갑",
            "elect_sort": "지역구",
            "elected": "3선",
            "committees": "국방위원회",
            "assembly": 22,
            "current_member": True,
            "bill_ids": ["B001"],
        }
    ]


def test_member_without_bills_falls_back_within_five_steps(qa):
    qa.repository.members = [member()]
    qa.generator.generate.side_effect = [
        decision("search", "국방 법안"),
        decision("search", "예비군 법안"),
        qa.generator.return_value,
    ]
    events = []
    result = BillAgent(qa).run(QuestionRequest(question="김의원"), events.append)
    assert result.status == "answered"
    ids = {e["step"]["id"] for e in events if e["type"] == "step"}
    assert ids <= {"1", "2", "3", "4", "5"}


def test_member_named_inside_a_question_is_found_without_the_model(qa):
    qa.repository.members = [member()]
    qa.repository.proposals = {"M1": ["B001"]}
    qa._retrieve = MagicMock(side_effect=AssertionError("의미 검색을 하지 않는다"))
    qa.generator.generate.side_effect = [decision(), qa.generator.return_value]
    events = []
    result = BillAgent(qa).run(
        QuestionRequest(question="김의원 의원이 낸 주거 법안은?"), events.append
    )
    assert [s.bill_id for s in result.sources] == ["B001"]
    first = next(e["step"] for e in events if e["type"] == "step")
    assert first["summary"] == "‘김의원’ 의원의 프로필과 대표발의 법안을 찾고 있습니다."


def test_party_name_uses_party_profile_and_member_bills(qa):
    qa.repository.parties = [
        {
            "party_id": 2,
            "name": "국민의힘",
            "district_congressman_count": 90,
            "proportional_congressman_count": 18,
            "party_leader": "대표",
            "parliamentary_leader": "원내대표",
        }
    ]
    qa.repository.party_proposals = {2: [("B001", "김의원")]}
    qa._retrieve = MagicMock(side_effect=AssertionError("의미 검색을 하지 않는다"))
    qa.generator.generate.side_effect = [decision(), qa.generator.return_value]
    events = []
    result = BillAgent(qa).run(QuestionRequest(question="국민의힘"), events.append)
    assert [s.bill_id for s in result.sources] == ["B001"]
    steps = [e["step"] for e in events if e["type"] == "step"]
    assert (
        steps[1]["summary"]
        == "‘국민의힘’ 정보와 소속 의원 대표발의 법안 1건을 확인했습니다."
    )
    _, context = qa.generator.generate.call_args_list[-1].args
    assert context["parties"] == [
        {
            "name": "국민의힘",
            "district_seats": 90,
            "proportional_seats": 18,
            "party_leader": "대표",
            "parliamentary_leader": "원내대표",
            "bills": [{"bill_id": "B001", "proposers": ["김의원"]}],
        }
    ]


def test_sources_carry_representative_proposer_and_party(qa):
    qa.repository.representatives = {
        "B001": [
            {
                "congressman_id": "M1",
                "name": "김의원(국민)",
                "congressman_image_url": "/img/m1.jpg",
                "party_id": 2,
                "party": "국민의힘",
                "party_image_url": "/party/wide/2.png",
            }
        ]
    }
    qa.generator.generate.side_effect = [decision(), qa.generator.return_value]
    result = BillAgent(qa).run(
        QuestionRequest(question="청년 주거 지원"), lambda _: None
    )
    source = result.sources[0]
    assert source.proposer_label == "김의원 의원"
    assert source.representative.model_dump() == {
        "name": "김의원",
        "congressman_id": "M1",
        "image_url": "/img/m1.jpg",
        "party": "국민의힘",
        "party_id": 2,
        "party_image_url": "/party/wide/2.png",
    }


def test_joint_representatives_have_label_without_single_party(qa):
    row = {"congressman_id": "M1", "name": "김의원", "party_id": 2, "party": "국민의힘"}
    qa.repository.representatives = {
        "B001": [row, {**row, "congressman_id": "M2", "name": "박의원"}]
    }
    qa.generator.generate.side_effect = [decision(), qa.generator.return_value]
    result = BillAgent(qa).run(
        QuestionRequest(question="청년 주거 지원"), lambda _: None
    )
    assert result.sources[0].proposer_label == "김의원 의원 외 1인"
    assert result.sources[0].representative is None


def test_final_answer_gets_more_time_than_planning(qa):
    qa.generator.generate.side_effect = [decision(), qa.generator.return_value]
    BillAgent(qa).run(QuestionRequest(question="청년 주거 지원"), lambda _: None)
    plan, final = qa.generator.generate.call_args_list
    assert plan.kwargs["timeout"] <= 25
    assert 25 < final.kwargs["timeout"] <= 45
