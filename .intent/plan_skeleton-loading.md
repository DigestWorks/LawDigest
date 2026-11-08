---
title: 화면 전환 스켈레톤 로딩
slug: skeleton-loading
stage: plan
status: accepted
intent: .intent/intent_skeleton-loading.md
spec: .intent/spec_skeleton-loading.md
date: 2026-11-08
---

# 화면 전환 스켈레톤 로딩 — 구현 계획

경로는 `services/web/` 기준이다.

## 바뀌는 파일

| 파일 | 무엇을 |
|---|---|
| `components/ui/skeleton.tsx` | `motion-reduce:animate-none` 기본 적용 |
| `components/common/Skeletons/*` (새로) | `LoadingRegion`, 법안·프로필·화면별 스켈레톤, `index.ts` |
| `components/common/ContentSkeleton.tsx`, `components/common/Loading/*` | 사용처 교체 후 삭제, `common/index.tsx`에서 export 제거 |
| `app/explore/components/StatsSkeleton.tsx` + Stats* 8개 | `SkeletonBar` 삭제, `Skeleton` 사용 |
| `app/{bill,congressman,party,report,search}/[id]/loading.tsx` | 라우트 스켈레톤 (bill·congressman·party·report 새로) |
| `app/{timeline,explore,notification,mypage,following}/loading.tsx`, `app/explore/category/[code]/loading.tsx` | 라우트 스켈레톤 (timeline 교체, 나머지 새로) |
| `components/Bill/BillList/BillList.tsx`, `Bill/Bill.tsx` | 스피너·문구 → 카드·줄 스켈레톤 |
| `components/Feed/Feed/Feed.tsx`, `ReportFeed.tsx`, `app/page.tsx` | 피드·리포트 스켈레톤 |
| `app/explore/components/{CategoryGrid,TrendingKeywords,SeatDistribution,MemberRanking,MemberList,PartyList,CategoryBills}.tsx` | 섹션 스켈레톤 |
| `app/congressman/[id]/.../CongressmanDetail.tsx`, `app/party/[id]/.../{PartyDetail,PartyCongressmanList}.tsx` | 프로필 스켈레톤 |
| `app/bill/[id]/components/AnotherBill/AnotherBillList.tsx` | 개정안 줄 스켈레톤 |
| `app/timeline/components/{ListContainer,TimelineBoard}.tsx` | 날짜 기록·숫자 스켈레톤 |
| `app/notification/page.tsx`, `components/{NotificationList,NotificationTopThree}.tsx` | 알림 스켈레톤 |
| `app/mypage/page.tsx` + `components/{UserInfo,Party,Congressman,BillContainer}/*` | 마이페이지 스켈레톤 |
| `app/following/page.tsx` + `components/{FollowingHeader/FollowingNav,BillContainer/*}` | 팔로잉 스켈레톤 |
| `hooks/useSearchParamsTransition.ts` (새로) | 쿼리 문자열만 바꾸는 이동의 대기 상태와 누른 값을 바로 반영 |
| `components/Feed/Feed/Feed.tsx`, `app/{congressman,party}/[id]/components/BillContainer/BillContainer.tsx` | 탭·정렬·필터 이동 대기 중 목록 자리 스켈레톤 |
| `app/notification/components/NotificationList.test.tsx` | 로딩 안내 문구 기대값 갱신 |

구현 중 추가(2026-11-08): 브라우저 확인에서 피드 탭(리포트·법안·팔로잉)과 대표/공동발의 탭 전환은 같은 라우트의 쿼리 문자열 이동이라 `loading.tsx`가 다시 뜨지 않고 이전 목록이 멈춰 있는 것을 확인했다. `useTransition`·`useOptimistic`으로 누른 탭은 바로 선택 표시하고, 서버 응답을 기다리는 동안 목록 자리에 스켈레톤을 보인다. 목록 데이터 쿼리는 현재 URL 기준으로 두어 클라이언트와 서버가 같은 자료를 두 번 요청하지 않게 한다.

## 작업 순서

1. `Skeleton` 수정, `Skeletons/` 공용 컴포넌트 작성 — `tsc` 통과.
2. `SkeletonBar` 제거, Stats* 교체 — `grep SkeletonBar` 결과 없음.
3. 라우트 `loading.tsx` 추가·교체 — 파일 11개 존재.
4. 섹션·무한 스크롤 교체, `ContentSkeleton` 삭제 — `grep "불러오는 중\|Spinner"`에 동작 피드백만 남음.
5. 린트·테스트, 개발 서버에서 전환 확인.

## 가장 위험한 단계

4단계 `BillList`·`PartyCongressmanList`의 로딩 조건 변경이다. 조건을 잘못 걸면 목록 위에 스켈레톤이 계속 남거나 빈 목록 문구와 겹친다. 기존 테스트(`*.test.tsx`)를 돌리고, 깨지면 해당 파일만 `git checkout`으로 되돌린다.

## 검증

```
cd services/web
npm run lint
npm test
```

UI: 개발 서버에서 브라우저 네트워크를 느리게 걸고 피드 → 법안 상세, 탐색 → 국회 탭 → 의원 카드, 정당 탭 → 정당, 타임라인, 검색으로 이동해 각 스켈레톤을 확인한다. 다크 모드와 375px 폭에서도 확인한다.
