---
title: 정당 조회 도구와 질문 속 의원·정당 이름 대조
slug: party-member-matching
stage: plan
status: accepted
intent: .intent/intent_party-member-matching.md
spec: .intent/spec_party-member-matching.md
date: 2026-11-11
---

# 정당·의원 이름 대조 — 구현 계획

## 바뀌는 파일

| 파일 | 무엇을 |
|---|---|
| `services/ai/src/lawdigest_ai/rag/entities.py` | 새 파일: 이름 매칭 |
| `services/ai/src/lawdigest_ai/rag/repository.py` | `directory`, `find_parties`, `party_bills` |
| `services/ai/src/lawdigest_ai/rag/agent.py` | 첫 단계 분기, `lookup_party`, member 행동 제거 |
| `services/ai/src/lawdigest_ai/rag/chatbot.py` | `parties` 문맥과 프롬프트 규칙 |
| `services/ai/src/lawdigest_ai/rag/schemas.py` | `member` 행동 제거 |
| `services/ai/tests/rag/test_entities.py` | 새 파일: 매칭 테스트 |
| `services/ai/tests/rag/test_chatbot.py`, `test_agent.py` | 테스트 저장소와 에이전트 테스트 |
| `services/ai/README.md` | 의원·정당 조회 단락 갱신 |

## 작업 순서

1. `entities.py`와 테스트 — 조사·호칭·두 글자·괄호 이름 경우 통과
2. 저장소 메서드 — 운영 DB 읽기 전용으로 국민의힘 조회 확인
3. agent·chatbot 분기와 정당 문맥 — 기존·새 테스트 통과
4. RAG API 재시작 후 `/search/국민의힘`, `/search/김병기 의원` 확인

## 가장 위험한 단계

1단계의 매칭 규칙. 일반 검색어를 의원으로 잘못 잡으면 답이 엉뚱해진다. 운영 DB 이름 전체로 일반 검색어 몇 개를 돌려 오탐이 없는지 확인한다. 문제가 생기면 두 글자 규칙을 세 글자 이름까지 넓힌다.

## 검증

```
cd services/ai && PYTHONPATH=../data/src:src:. <codex 워크트리>/.venv-rag/bin/python -m pytest tests/rag -q
<codex 워크트리>/.venv-rag/bin/ruff check src/lawdigest_ai/rag tests/rag
```
