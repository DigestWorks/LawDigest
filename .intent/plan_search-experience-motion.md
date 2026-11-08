---
title: 모달 없는 제자리 확장 검색과 결과 전환
slug: search-experience-motion
stage: plan
status: accepted
intent: .intent/intent_search-experience-motion.md
spec: .intent/spec_search-experience-motion.md
date: 2026-11-08
---

# 모달 없는 제자리 확장 검색과 결과 전환 — 구현 계획

## 바뀌는 파일

| 파일 | 무엇을 |
|---|---|
| `services/web/store/SearchEntryState.tsx` (새, 기존 `SearchModalState.tsx` 대체) | `open`, `pending` 상태 |
| `services/web/store/index.tsx` | 내보내기 이름 변경 |
| `services/web/components/search/useSearchEntry.ts` (새) | 펼침·제출·pending 판단 |
| `services/web/components/search/useSearchSuggestions.ts` (새) | 최근 검색어·인기 키워드 |
| `services/web/components/search/SearchEntrySync.tsx` (새) | 경로 동기화, 단축키 |
| `services/web/components/Layout/Header/HeaderSearch.tsx` (새) | 데스크톱 확장 검색창과 추천 패널 |
| `services/web/components/Layout/Header/Header.tsx` | `HeaderSearch` 배치, 펼침 중 탭 흐림, 헤더를 본문 위 쌓임 순서(`z-30`)로 올림 |
| `services/web/components/Layout/Header/HeaderNavTabs.tsx` (새) | 탭 목록과 미끄러지는 단일 인디케이터 |
| `services/web/components/Layout/Nav/Nav.tsx` | 하단 내비 확장 검색 복원 |
| `services/web/styles/mobile-floating-nav.css` | 확장·말풍선·회전·키보드 규칙 |
| `services/web/styles/globals.css` | 데스크톱 검색창 테두리·결과 강조 규칙 |
| `services/web/components/common/Button/SearchButton.tsx` | 삭제(`HeaderSearch`가 대체) |
| `services/web/components/common/SearchBar/*` | `SearchModal.tsx`, `SearchBar.tsx` 삭제, `SearchBarButton`은 `openEntry` 호출 |
| `services/web/components/qa/RagEntry.tsx` | 삭제(추천 패널·말풍선이 질의응답 입구를 맡음) |
| `services/web/app/search/[id]/components/SearchHighlight.tsx` (새) | 일치 글자 표시 |
| `services/web/app/layout.tsx` | `SearchModal` → `SearchEntrySync` |
| `services/web/app/search/[id]/SearchResultClient.tsx` | 탭·결과 줄·빈 결과·pending 해제 |
| `services/web/app/search/[id]/components/SearchTypeTabs.tsx` (새) | 미끄러지는 선택 표시 |
| `services/web/app/search/[id]/components/SearchBillList.tsx`, `SearchBillRow.tsx` (새) | 법안 결과 줄과 페이지 넘김 |
| `services/web/app/search/[id]/loading.tsx` | 결과 모양 스켈레톤 |
| `services/web/lib/search.ts`, `lib/search.test.ts` | `highlightParts`와 테스트 |
| `DESIGN.md` | 검색 진입·결과 줄 규칙 갱신 |

## 작업 순서

1. 상태·훅·동기화 컴포넌트와 `highlightParts`를 만든다 — `npm test -- search` 통과.
2. `SearchModal`을 걷어내고 `SearchEntrySync`를 마운트한다 — 타입 검사 통과.
3. 데스크톱 `HeaderSearch`를 붙인다 — 1280px에서 아이콘·`/`·⌘K로 펼침, 바깥 클릭·Esc로 접힘.
4. 모바일 `Nav` 확장과 CSS를 되살린다 — 375px에서 펼침, 말풍선, 단독 아이콘으로 닫기.
5. 결과 화면(탭, 결과 줄, 빈 결과, 로딩, pending 해제)을 만든다 — '주택' 첫 화면 5건 이상.
6. 동작 줄이기·다크 모드를 점검하고 `DESIGN.md`를 고친다.
7. 린트·테스트·타입 검사와 두 화면 폭의 브라우저 확인을 한다.

## 가장 위험한 단계

4단계. 내비는 드래그, 스크롤 축소, 키보드 접근성 수정(`882fc50`)이 얽혀 있다. 확장 규칙을 되살리다 탭 바 폭이나 포커스 표시가 깨질 수 있다. 깨지면 `Nav.tsx`와 `mobile-floating-nav.css`만 `origin/main` 판으로 되돌리고, 모바일은 무지개 버튼이 `openEntry`만 호출하도록 줄인다.

## 검증

```
cd services/web && npm run lint && npm test && npx tsc --noEmit
```

화면: 로컬 `next dev`에서 1280×820, 375×812 각각 밝은·어두운 테마로 피드→검색 열기→'주택' 제출→결과→유형 탭 전환→검색창 접기. 동작 줄이기 상태도 한 번 본다.
