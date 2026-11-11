---
title: 정당 조회 도구와 질문 속 의원·정당 이름 대조
slug: party-member-matching
stage: spec
status: accepted
intent: .intent/intent_party-member-matching.md
date: 2026-11-11
---

# 정당·의원 이름 대조 — 명세

## 요구사항

- [ ] `entities.match_entities(question, member_names, party_names)`가 질문 속 의원 DB 이름(최대 2)과 정당 이름(최대 2)을 돌려준다.
- [ ] 어절마다 조사·호칭을 뗀 변형과 대조한다. 괄호 구분 이름(`이수진(李秀眞)`)은 괄호 앞 이름으로 대조한다.
- [ ] 두 글자 이름은 호칭(의원·국회의원·의원님)이 붙었거나 질문 전체가 이름일 때만 인정한다.
- [ ] `BillRepository.directory()`가 의원·정당 이름 목록을 10분 동안 캐시한다. `무소속`은 정당에서 뺀다.
- [ ] `find_parties(names)`, `party_bills(party_ids, assembly, limit)`가 정당 정보와 발의 당시 소속 기준 대표발의 법안(발의 의원 이름 포함)을 돌려준다.
- [ ] 첫 단계: 의원이 있으면 의원 조회, 없고 정당이 있으면 정당 조회, 둘 다 없으면 의미 검색. 조회 결과가 0건이면 의미 검색으로 넘어가고 도구 횟수를 하나 줄인다.
- [ ] `AgentDecision.action`에서 `member`를 뺀다.
- [ ] 정당 정보는 답변 문맥 `parties`로 넘긴다. `SYSTEM_PROMPT`에 정당 설명 규칙을 더한다.

## 설계

재사용: `lookup_member`, `merge`, `source_from_row`, `_read`.
- 새 모듈 `rag/entities.py`: 순수 함수로 매칭한다(테스트 쉬움).
- `agent.run` 시작부를 `match_entities` 결과로 분기한다. `lookup_party`는 `lookup_member`와 같은 모양이다.
- `answer_from_sources`/`_call_llm`에 `parties` 인자를 더한다.

## 버린 대안

- 질문 전체 부분 문자열 매칭: 두 글자 이름과 일반 단어가 겹친다.
- 모델 member 행동 유지: 사용자가 DB 대조로 바꾸라고 했다.

## 함정

- 동명이인과 괄호 이름은 하나의 표시 이름에 DB 이름이 여럿이다. 모두 `find_members`로 넘기고 2명으로 자른다.
- 단계 수는 여전히 5 이하여야 한다.

## 완료 기준

- `pytest services/ai/tests/rag`, `ruff check`·`ruff format --check` 통과.
- 실데이터에서 `/search/국민의힘`, `/search/김병기 의원` 확인.
