---
title: 화면 전환 스켈레톤 로딩
slug: skeleton-loading
stage: spec
status: accepted
intent: .intent/intent_skeleton-loading.md
date: 2026-11-08
---

# 화면 전환 스켈레톤 로딩 — 명세

## 요구사항

- [ ] 서버에서 자료를 기다리거나 서버 렌더가 필요한 라우트(`bill/[id]`, `congressman/[id]`, `party/[id]`, `report/[id]`, `search/[id]`, `timeline`, `explore`, `explore/category/[code]`)와 세션 확인이 있는 라우트(`notification`, `mypage`, `following`)에 그 화면 모양의 `loading.tsx`가 있다.
- [ ] `loading.tsx`는 각 라우트 `layout.tsx` 안에서 렌더되므로 머리글을 다시 그리지 않는다. 페이지가 `Layout`을 직접 그리는 `report/[id]`만 `Layout`을 포함한다.
- [ ] 모든 스켈레톤은 `components/ui/skeleton.tsx`의 `Skeleton` 하나로 그린다. `Skeleton`은 `motion-reduce:animate-none`을 기본으로 가진다.
- [ ] 스켈레톤 묶음은 `role="status"`, `aria-busy="true"`, 화면에 보이지 않는 안내 문구 하나를 가지고, 블록들은 `aria-hidden`이다.
- [ ] 섹션 첫 로딩은 `isPending`(또는 데이터 없음)에만 스켈레톤을 보이고, 백그라운드 재요청(`isFetching`)에는 보이지 않는다.
- [ ] 무한 스크롤은 `isFetchingNextPage`일 때 목록 끝에 카드 스켈레톤을 붙인다. 첫 로딩에는 카드 스켈레톤 3장을 보인다.
- [ ] 스켈레톤 너비는 고정 값 배열로 정한다. 서버 렌더와 하이드레이션 결과가 같아야 한다.
- [ ] `SkeletonBar`(통계 전용)를 지우고 통계 컴포넌트가 `Skeleton`을 쓴다.
- [ ] `ContentSkeleton`(범용 카드 3장)의 사용처를 모양별 스켈레톤으로 바꾸고 파일을 지운다.

## 설계

재사용: `Skeleton`(`components/ui/skeleton.tsx`), 각 화면의 기존 래퍼 클래스(폭, 여백, 카드 테두리)를 그대로 복사해 크기를 맞춘다.

새로 만드는 것: `components/common/Skeletons/`
- `LoadingRegion` — `role="status"` 래퍼와 `sr-only` 안내.
- `BillSkeletons.tsx` — `BillCardSkeleton`(`Bill.tsx` 목록 카드: 제목, 날짜·단계 칩, 요약 3줄, 하단 버튼, 78px 발의자 카드, 10px 구분선), `BillListSkeleton`, `BillDetailSkeleton`(상세 카드 + 오른쪽 섹션 + 다른 개정안), `FeedSkeleton`(제목, 탭 3개, 정렬 줄, 카드), `ReportListSkeleton`, `ReportDetailSkeleton`, `LineSkeleton`(문단 줄).
- `ProfileSkeletons.tsx` — `CongressmanProfileSkeleton`, `PartyProfileSkeleton`, `AvatarGridSkeleton`(정당 소속 의원·팔로우 목록), `MemberCardGridSkeleton`(탐색 의원 카드), `PartyCardGridSkeleton`, `ProfilePageSkeleton`(의원·정당 라우트 전체).
- `PageSkeletons.tsx` — `TimelineSkeleton`, `TimelineEntriesSkeleton`, `ExploreSkeleton`, `FieldPanelSkeleton`, `CategoryGridSkeleton`, `KeywordChipsSkeleton`, `SeatDistributionSkeleton`, `MemberRankingSkeleton`, `NotificationListSkeleton`, `NotificationPreviewSkeleton`, `MyPageSkeleton`, `FollowingSkeleton`, `SearchSkeleton`.

교체 지점: `BillList`(스피너 → 카드), 탐색 섹션 6곳, 의원·정당 프로필, `PartyCongressmanList`(`isFetching` → `isPending`), `AnotherBillList`, `Bill.tsx`의 제안이유·발의자 로딩 문구, 알림 2곳, 마이페이지·팔로잉 섹션과 세션 확인, 북마크·팔로잉 목록 스피너, `TimelineBoard`·`FollowingNav`의 `—` 숫자, 홈 `Suspense` fallback.

`SectionLoading`은 소셜 로그인 콜백 전용으로 남긴다.

## 버린 대안

- 루트 `app/loading.tsx` 하나로 처리: 홈·리포트는 페이지 안에서 `Layout`을 그리므로 머리글이 사라지고, 모든 화면이 같은 모양이 되어 밀림을 막지 못한다.
- shimmer(빛이 흐르는 그라데이션) 애니메이션: `DESIGN.md`에 기준이 없고 기존 코드가 `animate-pulse`를 쓴다. 새 모션을 들이지 않는다.
- framer-motion으로 콘텐츠 페이드인: 요청 범위 밖이고 화면 전환마다 지연이 생긴다.

## 함정

- `isFetching`에 스켈레톤을 걸면 창 포커스 재요청마다 내용 위로 스켈레톤이 깜박인다.
- `bill/[id]`는 `generateMetadata`와 페이지가 모두 서버에서 기다린다. Next 15.5는 일반 브라우저에 메타데이터를 스트리밍하므로 `loading.tsx`가 먼저 나와야 한다. 나오지 않으면 페이지 본문을 하위 `Suspense`로 옮긴다.
- 무작위 너비는 하이드레이션 불일치를 만든다.
- 홈 피드는 쿼리 문자열로 탭을 바꾸므로 같은 라우트 안의 전환이다. `Feed` 안의 `isPending` 분기가 담당한다.

## 완료 기준

- `npm run lint`가 경고 0으로 끝난다.
- `npm test`가 통과한다.
- 개발 서버에서 피드 → 법안 상세, 탐색 → 의원·정당, 탐색 국회 탭, 타임라인, 검색 이동 직후 화면에 해당 스켈레톤이 보인다(네트워크 지연을 걸어 확인).
