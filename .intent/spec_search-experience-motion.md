---
title: 모달 없는 제자리 확장 검색과 결과 전환
slug: search-experience-motion
stage: spec
status: accepted
intent: .intent/intent_search-experience-motion.md
date: 2026-11-08
---

# 모달 없는 제자리 확장 검색과 결과 전환 — 명세

## 요구사항

- [ ] `SearchModal`과 그 마운트가 없어지고, 검색을 여는 모든 경로(헤더 아이콘, 무지개 버튼, `SearchBarButton`, `/`, ⌘K)가 제자리 확장을 연다.
- [ ] 모바일(<48rem): 무지개 버튼이 탭 바 전체 폭으로 펼쳐지고 탭 바는 현재 탭 아이콘 원으로 줄어든다. 말풍선은 법안에 질문하기(가능할 때), 최근 검색어 3개, 인기 키워드 4개를 차례로 띄운다. `visualViewport`로 키보드 높이만큼 바를 올린다.
- [ ] 데스크톱(≥48rem): 헤더 가운데에 검색창이 아이콘 쪽에서 펼쳐지고 탭은 사라진다. 포커스 중에는 바로 아래 추천 패널이 열린다. 바깥 클릭과 Esc는 패널을 닫고, 검색 경로가 아니면 검색창도 접는다.
- [ ] 제출하면 `pending` 상태가 되어 테두리가 빠르게 돌고, `SearchResultClient`가 그 검색어의 의원·정당과 법안 첫 페이지를 받으면 `pending`이 풀린다. 같은 주소를 다시 내면 `pending`을 켜지 않는다.
- [ ] `/search/[id]`에서는 검색창이 펼쳐진 채 검색어를 보여 주고, 사용자가 접으면 탭이 돌아온다. 결과 본문의 `SearchBarButton`과 보이는 `h1`은 없어지고 `h1`은 화면 낭독기용으로 남는다.
- [ ] `loading.tsx`는 결과와 같은 배치의 스켈레톤이다.
- [ ] 결과 줄은 처음 10건까지 40ms 간격(최대 320ms)으로 `fade-up`한다. 유형 탭은 framer-motion `layoutId`로 검은 선택 표시를 옮긴다.
- [ ] 법안 결과는 `SearchBillRow`로 그리고, 검색어 일치 글자를 `<mark>`로 표시한다.
- [ ] `prefers-reduced-motion`에서는 회전, 이동, 확대를 끄고 120ms 이하 페이드만 남긴다.
- [ ] 다크 모드에서 바, 패널, 결과 줄의 대비가 유지된다.

## 설계

**재사용**: 검색어 정규화·경로·최근 검색 저장(`lib/search.ts`), 검색 쿼리(`searchBillOptions`, `searchPeopleOptions`), 인기 키워드(`useGetTrendingKeywords`), `RagEntry`의 가용성 판단(`useRagStatus`), 의원·정당 결과(`SearchList`), 법안 표시 헬퍼(`billHeadline`, `billResultLabel`, `proposalDateLabel`, `getPartyColor`), 내비 CSS 토큰과 원래(`48c52a4`) 확장 규칙, framer-motion(이미 의존성).

**상태**: `store/SearchModalState.tsx`를 `store/SearchEntryState.tsx`(`searchEntryState`)로 바꾼다. 값은 `{ open: boolean | 'auto'; pending: string | null }`. `'auto'`는 검색 경로에서만 펼침을 뜻한다. 모든 판단은 `components/search/useSearchEntry.ts` 훅에 모은다: `expanded`, `routeKeyword`, `openEntry()`, `closeEntry()`, `submit(keyword)`, `pending`.

**전역 동기화**: `components/search/SearchEntrySync.tsx`를 `SearchModal` 자리에 마운트한다. 경로가 바뀌면 `open`을 `'auto'`로 되돌리고, 검색 경로를 떠나면 `pending`을 지운다. `/`, ⌘K 단축키를 처리한다.

**추천**: `components/search/useSearchSuggestions.ts`가 최근 검색어와 인기 키워드를 묶는다. 인기 키워드는 펼쳐졌을 때만 요청한다. 표시는 모바일 말풍선(`Nav.tsx`)과 데스크톱 패널(`HeaderSearch.tsx`)이 각자 한다.

**데스크톱**: `components/Layout/Header/HeaderSearch.tsx`가 아이콘 버튼과 펼친 검색창을 함께 가진다. 펼친 검색창은 헤더 가운데 영역에 절대 위치하고, `clip-path: inset()`을 오른쪽에서 왼쪽으로 풀어 아이콘에서 자라는 것처럼 보인다. 탭 목록은 `expanded`일 때 흐려진다. 헤더는 경로마다 다시 마운트되므로, 검색 경로의 헤더는 처음부터 펼친 상태로 그리고 진입 전환을 생략한다.

**모바일**: `Nav.tsx`에 원래의 `is-search-open`, `is-expanded`, 말풍선, 단독 아이콘 구조를 되살린다. 현재의 다크 모드 토큰과 포커스 표시를 유지한다. 테두리 회전은 포커스 중 느리게(6s), `pending` 중 빠르게(1.1s) 돈다.

**결과**: `SearchResultClient`에서 `SearchTypeTabs`, `SearchBillList`(`SearchBillRow` + 무한 스크롤·더 불러오기)를 쓴다. 결과가 하나도 없으면 인기 키워드 칩을 보여 준다.

## 버린 대안

- 대화상자 유지: 사용자가 명시적으로 원하지 않았다.
- 전용 `/search` 진입 화면: 사용자가 제자리 확장을 골랐다.
- 경로를 넘는 View Transitions API·`layoutId`: 헤더와 바를 같은 자리에 그리는 것만으로 연속성이 생기고, React의 `ViewTransition`은 안정 버전에 없다.
- `BillList`에 정렬 옵션 추가: 피드 카드 자체가 검색 결과에 비해 크다.

## 함정

- iOS는 사용자 동작 안에서 `focus()`해야 키보드가 열린다. 버튼 클릭 처리기에서 바로 포커스한다.
- 헤더와 내비는 둘 다 DOM에 있고 CSS로만 숨긴다. 단축키·`SearchBarButton`으로 열 때 보이는 쪽 입력만 포커스한다.
- 같은 검색어 재검색은 경로가 바뀌지 않아 `pending`이 풀리지 않는다.
- 내비가 펼쳐진 동안 스크롤 축소와 드래그를 막는 `isSearchOpenRef` 동작을 유지한다.

## 완료 기준

- `npm run lint`, `npm test`, `npx tsc --noEmit` 통과.
- 로컬 개발 서버에서 1280px과 375px, 밝은·어두운 테마로 진입→로딩→결과를 확인한 화면 기록.
