---
title: AI 답변에 정당 컬러 포인트와 발의자 카드
slug: party-accent-answer
stage: plan
status: accepted
intent: .intent/intent_party-accent-answer.md
spec: .intent/spec_party-accent-answer.md
date: 2026-11-11
---

# 정당 컬러 포인트 — 구현 계획

## 바뀌는 파일

| 파일 | 무엇을 |
|---|---|
| `services/ai/src/lawdigest_ai/rag/schemas.py` | `Representative`, `Source` 선택 필드 |
| `services/ai/src/lawdigest_ai/rag/repository.py` | `proposer_info` |
| `services/ai/src/lawdigest_ai/rag/agent.py` | 최종 근거에 발의자 정보 |
| `services/ai/tests/rag/test_chatbot.py`, `test_agent.py` | 가짜 저장소와 테스트 |
| `services/web/lib/rag.ts` | 타입과 검증 |
| `services/web/components/qa/answerAccent.ts` | 새 파일 |
| `services/web/components/qa/ProposerCard.tsx` | 새 파일 |
| `services/web/components/qa/AiMark.tsx` | 포인트 색 표식 |
| `services/web/components/qa/RagAnswer.tsx`, `AgentTurn.tsx`, `AgentSteps.tsx` | 정당색 적용 |
| `services/web/app/search/[id]/components/SearchAiOverview.tsx`, `app/ask/AskClient.tsx` | 표식·카드 배치 |
| `services/web/styles/globals.css` | 표식 회전, 점 목록 |
| 웹 테스트: `lib/rag` 검증, `answerAccent` | 새 동작 |
| `services/ai/src/lawdigest_ai/rag/agent.py`, `chatbot.py`, `README.md` | 구현 중 추가: 정당 답변이 45초를 넘겨 실패해 조회 발췌 1,500자, 정당 근거 6건, 정당 규칙 단순화, 최종 답변 호출 45초 |

## 작업 순서

1. 백엔드 스키마·저장소·에이전트 — 운영 DB로 대표발의자 조회 확인, pytest 통과
2. 웹 타입·검증·포인트 계산 — 단위 테스트
3. 화면 적용 — 실데이터로 세 검색 확인
4. 린트·테스트 후 커밋

## 가장 위험한 단계

2단계 검증. `isRagAnswer`가 새 필드를 잘못 거르면 모든 답변이 "출처를 확인할 수 없습니다"로 실패한다. 필드가 없을 때와 있을 때를 모두 테스트한다.

## 검증

```
cd services/ai && PYTHONPATH=../data/src:src:. <codex 워크트리>/.venv-rag/bin/python -m pytest tests/rag -q
cd services/web && npx tsc --noEmit && npm run lint && npm test
```
