---
title: 의원명 검색에 의원 프로필과 대표발의 법안 조회 도구
slug: member-agent-tools
stage: plan
status: accepted
intent: .intent/intent_member-agent-tools.md
spec: .intent/spec_member-agent-tools.md
date: 2026-11-11
---

# 의원 조회 도구 — 구현 계획

## 바뀌는 파일

| 파일 | 무엇을 |
|---|---|
| `services/ai/src/lawdigest_ai/rag/repository.py` | `find_members`, `member_bills` |
| `services/ai/src/lawdigest_ai/rag/schemas.py` | `AgentDecision.action`에 `member` |
| `services/ai/src/lawdigest_ai/rag/chatbot.py` | `source_from_row`, `members` 문맥, 프롬프트 규칙 |
| `services/ai/src/lawdigest_ai/rag/agent.py` | 의원 조회 단계와 planner 행동 |
| `services/ai/tests/rag/test_chatbot.py` | 테스트 저장소에 의원 데이터 |
| `services/ai/tests/rag/test_agent.py` | 의원 이름 검색, planner 의원 조회, 0건 대체 테스트 |
| `services/ai/README.md` | 의원 조회 도구 한 단락 |

## 작업 순서

1. 저장소 메서드와 스키마 — 운영 DB 읽기 전용으로 김병기 조회 확인
2. chatbot의 Source 생성 공통화와 `members` 문맥 — 기존 테스트 통과
3. agent 의원 조회 단계 — 새 테스트 통과
4. 실데이터 RAG API 재시작 후 `/search/김병기`, `/search/전세사기` 확인

## 가장 위험한 단계

3단계. 첫 단계 분기가 기존 의미 검색 흐름의 단계 수·근거 키를 바꿀 수 있다. 기존 에이전트 테스트가 단계 순서를 검사하므로 깨지면 분기를 의원 이름 정확 일치로만 좁힌다.

## 검증

```
cd services/ai && PYTHONPATH=../data/src:src <codex 워크트리>/.venv-rag/bin/python -m pytest tests/rag -q
```

가상환경은 codex 워크트리(`worktree/rag-agent-chat`)의 `.venv-rag`를 쓴다. 화면: `/search/김병기`, `/search/전세사기`.
