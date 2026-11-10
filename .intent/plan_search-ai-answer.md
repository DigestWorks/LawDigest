---
title: 검색 결과 위 AI 답변과 에이전트 채팅
slug: search-ai-answer
stage: plan
status: accepted
intent: .intent/intent_search-ai-answer.md
spec: .intent/spec_search-ai-answer.md
date: 2026-11-10
---

# 검색 결과 위 AI 답변과 에이전트 채팅 — 구현 계획

## 바뀌는 파일

| 파일 | 무엇을 |
|---|---|
| `services/web/store/SearchEntryState.tsx` | `searchModeState` 제거 |
| `services/web/store/RagConversationState.tsx` | `RagTurn.entry`, `RagSubmission.fresh/entry` |
| `services/web/hooks/useRagConversation.ts` | `fresh` 제출 처리, 모드 고정 |
| `services/web/components/search/useSearchEntry.ts` | 키워드 전용 제출, RAG 대기 분리 |
| `services/web/components/search/SearchEntrySync.tsx` | 모드 동기화 제거 |
| `services/web/components/search/SearchModePicker.tsx` | 삭제 |
| `services/web/components/Layout/Header/HeaderSearch.tsx` | 모드 UI·중지 단추 제거 |
| `services/web/components/Layout/Nav/Nav.tsx` | 모드 UI 제거, `/ask`에서 숨김 |
| `services/web/components/qa/ChatBar.tsx` | 새 파일 |
| `services/web/components/qa/AgentSteps.tsx` | 새 파일 |
| `services/web/components/qa/AgentTurn.tsx` | 새 파일 |
| `services/web/components/qa/RagAnswer.tsx` | 재작성 |
| `services/web/app/search/[id]/components/SearchAiOverview.tsx` | 새 파일 |
| `services/web/app/search/[id]/SearchResultClient.tsx` | 전체 탭 맨 위에 AI 답변 |
| `services/web/app/ask/AskClient.tsx` | 재작성 |
| `services/web/styles/globals.css` | `ChatBar` 링, 근거 번호, 접힘 그라디언트 |
| 테스트: `AskClient.test.tsx`, `useSearchEntry.test.tsx`, `useRagConversation.test.tsx` | 새 동작에 맞춤 |

## 작업 순서

1. 상태와 검색 진입 정리(store, hook, sync, 헤더, 내비, picker 삭제) — `npx tsc --noEmit` 통과
2. qa 컴포넌트 작성(ChatBar, AgentSteps, AgentTurn, RagAnswer) — 타입 통과
3. `SearchAiOverview`와 검색 결과 배치 — `/search/전세사기`에서 답변 생성 확인
4. `AskClient` 재작성 — 채팅 바 질문 후 `/ask`에서 이어지는 답 확인
5. 테스트 갱신과 린트 — `npm test`, `npm run lint`
6. 데스크톱·모바일·다크 모드 스크린샷 검토 후 다듬기

## 가장 위험한 단계

3단계. 첫 턴 자동 시작이 경로 전환·StrictMode·뒤로 가기에서 중복 요청이나 취소를 만들 수 있다. 문제가 생기면 시작 조건을 `turns[0].entry === keyword || submission.entry === keyword`로 좁히고, 그래도 안 되면 이 단계 커밋만 되돌린다.

## 검증

```
cd services/web
npx tsc --noEmit
npm run lint
npm test
```

화면: 실데이터 RAG(8118)에 붙인 개발 서버에서 `/search/전세사기` → 더 보기 → 채팅 바 질문 → `/ask` → 뒤로 가기. 375px 모바일과 다크 모드에서 반복.
