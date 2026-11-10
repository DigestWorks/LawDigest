---
title: 검색 결과 위 AI 답변과 에이전트 채팅
slug: search-ai-answer
stage: spec
status: accepted
intent: .intent/intent_search-ai-answer.md
date: 2026-11-10
---

# 검색 결과 위 AI 답변과 에이전트 채팅 — 명세

## 요구사항

- [ ] 헤더·하단 바 검색은 모드 없이 항상 `buildSearchHref(keyword)`로 이동한다. 키워드 검색 대기 표시는 RAG 생성 중에도 막히지 않는다.
- [ ] `/search/[keyword]`의 전체 탭에서 검색어가 2자 이상이면 첫 턴(`mode: 'chat'`)을 자동으로 시작한다. 대화의 첫 턴이 같은 검색어(`entry`)이면 다시 요청하지 않는다.
- [ ] AI 답변 아래 `ChatBar`, 그 아래 기존 결과 순서다. 다른 탭에서는 AI 답변을 보여 주지 않는다(요청은 유지).
- [ ] `ChatBar` 제출은 후속 질문 `RagSubmission`을 남기고 `/ask`로 이동한다. 첫 답이 생성 중이면 제출 대신 중지 단추를 보여 준다.
- [ ] `/ask`는 턴마다 질문 제목, 확인 과정, 답변, 근거 법안을 보이고 하단에 `ChatBar`를 고정한다. 대화가 없으면 예시 질문 셋을 보여 준다.
- [ ] `/ask`에서 헤더 검색창은 접힌 기본 상태이고, 모바일 하단 내비는 숨긴다.
- [ ] 무지개는 `ChatBar` 테두리에만 쓰고, 생성 중에는 기존 `.search-spinner` 회전을 쓴다. 본문은 무채색이다.
- [ ] 자료 건수·최신 발의일·지연 배너·`data_as_of` 표식을 화면에서 지운다. 국외 이전 안내 링크는 `ChatBar` 아래 한 줄로 남긴다.

## 설계

재사용: `useRagConversation`(요청·스트림·취소), `RagTurn`/`RagSubmission` atom, `useSearchRingState`와 `.search-ring`·`.search-spinner` CSS, `SearchBillRow`의 줄 모양(제목·단계 칩·발의일), `MessageScroller`는 쓰지 않고 문서 흐름 스크롤을 쓴다.

- `useSearchEntry`·`SearchEntrySync`·`HeaderSearchField`·`Nav`에서 `searchModeState`, `SearchModePicker`, RAG 중지 분기를 지운다. `isSearchRoute`는 키워드 경로만 뜻한다. `Nav`는 `/ask`에서 렌더하지 않는다.
- `RagSubmission`에 `fresh?: boolean`, `entry?: string`을 더한다. `fresh`면 기존 요청을 멈추고 기록 없이 대화를 `[turn]`으로 바꾼다. `RagTurn.entry`는 첫 턴의 검색어로, `/ask`의 "검색 결과로" 링크와 중복 요청 방지에 쓴다.
- 새 컴포넌트(`components/qa/`): `ChatBar`(자동 높이 textarea, IME 안전 Enter, 대수 select, 보내기/중지), `AgentSteps`(진행 중엔 한 줄, 끝나면 접힌 단계 목록), `AgentTurn`(대기·답변·실패·취소), `RagAnswer` 재작성(문단 끝 번호 단추, 번호 매긴 근거 법안 줄, `collapsible` 접힘).
- `SearchAiOverview`(`app/search/[id]/components/`): 첫 턴 시작, 답변 패널(Soft Civic Wash, 16px 둥근 모서리), `ChatBar`.
- `AskClient` 재작성: 720px 왼쪽 정렬 단일 열, 턴 사이 경계선, 새 턴 제출 시 그 질문으로 스크롤.

## 버린 대안

- `/ask`를 검색 결과 화면 안의 확장 패널로 두기: 사용자가 별도 에이전트 채팅 화면으로 "진입"한다고 했다.
- 사용자 질문을 오른쪽 말풍선으로 두기: 답이 길고 근거가 붙는 해설 문서에 가까워, 질문을 제목으로 두는 편이 읽는 순서가 분명하다.

## 함정

- `useRagConversation`은 언마운트 시 진행 중 요청을 취소한다. 생성 중 `/ask`로 넘어가면 첫 답이 끊기므로 생성 중에는 제출을 막는다.
- 개발 모드 StrictMode에서 시작 효과가 두 번 돈다. 이미 같은 `entry`의 submission이 있으면 건너뛴다.
- 검색어가 1자면 RAG 요청 검증(2자 이상)을 통과하지 못하므로 시작하지 않는다.
- 하단 바와 고정 `ChatBar`가 겹치지 않게 `/ask`에서는 내비를 숨긴다.

## 완료 기준

- `npm run lint`, `npx tsc --noEmit`, `npm test` 통과.
- 내장 브라우저에서 `/search/전세사기` → 답변 생성 → 채팅 바 질문 → `/ask` 새 답 생성 → 뒤로 가기 시 재생성 없음을 데스크톱·모바일에서 확인.
