---
title: 의원명 검색에 의원 프로필과 대표발의 법안 조회 도구
slug: member-agent-tools
stage: spec
status: accepted
intent: .intent/intent_member-agent-tools.md
date: 2026-11-11
---

# 의원 조회 도구 — 명세

## 요구사항

- [ ] `BillRepository.find_members(name, assembly)`가 이름이 정확히 같은 의원을 최대 2명 돌려준다(현직 우선, 대수 필터).
- [ ] `BillRepository.member_bills(ids, assembly, limit=6)`가 READY 상태 대표발의 법안을 발의일 내림차순으로 돌려준다.
- [ ] `AgentDecision.action`에 `member`를 더한다. query는 의원 이름이다.
- [ ] 질문이 의원 이름과 정확히 같으면 첫 단계가 의원 조회다. 법안이 0건이면 기존 의미 검색으로 대체한다.
- [ ] 의원 조회 단계의 SSE 단계 이름은 `search`다(웹 `isRagStep` 계약).
- [ ] 의원 프로필은 답변 생성 문맥 `members`로 전달하고, 근거(source)는 법안만이다.
- [ ] 의원 조회 근거의 excerpt는 `summary[:3000]`이며 최종 대조를 통과한다.

## 설계

재사용: `BillRepository._read`(읽기 전용 트랜잭션), `agent.step/merge`, `answer_from_sources`.
- `chatbot.source_from_row(row, key, excerpt)`로 Source 생성을 묶고 `_retrieve`와 함께 쓴다.
- `BillAgent.run`에 `members` 목록과 `lookup_members(name)` 단계를 둔다. 첫 단계 분기와 planner의 `member` 행동이 같은 함수를 쓴다.
- `answer_from_sources(..., members=None)` → `_call_llm` 문맥에 `members`를 넣고, `SYSTEM_PROMPT`에 의원 정보 사용 규칙을 더한다.
- `AGENT_PROMPT`에 `member` 행동 설명을 더한다.

## 버린 대안

- planner가 매번 의원 여부를 판단: 모델 호출 한 번이 늘고, 이름 검색에서 놓칠 수 있다.
- 새 SSE 단계 이름 `member`: 웹 검증이 실패한다.

## 함정

- 동명이인(박지원, 이용우)은 같은 대수 안에서 둘 다 조회될 수 있다. 프로필 둘을 함께 넘긴다.
- 단계 id는 1~5만 허용된다. 의원 조회가 첫 단계를 대신하므로 늘지 않는다.

## 완료 기준

- `pytest services/ai/tests/rag` 통과.
- 실데이터에서 `/search/김병기` 근거가 대표발의 법안이고, `/search/전세사기`는 기존과 같다.
