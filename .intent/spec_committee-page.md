---
title: 위원회 페이지
slug: committee-page
stage: spec
status: accepted
intent: .intent/intent_committee-page.md
date: 2026-11-14
---

# 위원회 페이지 — 명세

## 요구사항

- [ ] `GET /v1/committee/list`가 위원회마다 `name`, `type`(`standing`|`special`), `bill_count`, `passed_count`, `pending_count`, `member_count`를 돌려준다.
- [ ] 위원회 목록은 법안 위원회(`Bill.committee`)와 현직 의원 소속 위원회(`Congressman.commits`, `state = true`)의 합집합이다. `-`, `본회의`, 빈 값은 뺀다.
- [ ] 이전 명칭 3개의 법안은 현재 명칭에 합산된다. 이전 명칭은 목록에 따로 나오지 않는다.
- [ ] `GET /v1/committee/detail?name=`이 위 필드와 `former_names`, `members[]`(의원 id·이름·사진·정당 id·이름·로고)를 돌려준다. 이전 명칭으로 요청해도 현재 명칭 결과를 준다. 법안도 위원도 없는 이름이면 404다.
- [ ] `GET /v1/committee/bill?name=&page=&size=&compact=`이 현재·이전 명칭의 법안을 `proposeDate desc, id desc`로 기존 `BillListResponse` 형식(`compact`면 `BillCardDto.page`)으로 준다.
- [ ] 위원 판별은 `commits`를 `,`로 나눠 trim한 값과 정확히 일치할 때만이다(`환경노동위원회` ⊄ `기후에너지환경노동위원회`).
- [ ] 웹 `/committee`, `/committee/[name]`이 라이트·다크, 375px 폭에서 가로 스크롤 없이 보인다.
- [ ] 위원회 이름에 공백·마침표가 있어도(`기후위기 특별위원회`, `12.29여객기…`) 링크와 상세 조회가 된다.
- [ ] `deploy/deploy-staging-backend.sh <worktree>`가 운영 컨테이너(`lawdigest-backend-test`, `:808`)를 건드리지 않고 `lawdigest-backend-staging`을 `:8090`에 띄운다.

## 설계

**재사용**
- 법안 페이지 조회: `BillRepositoryImpl.buildBillListResponse`(대표·공동발의자, 북마크 여부 채움)와 `limitToRequestedSize`, `BillCardDto.page`.
- 집계 조건: `StatisticsRepository.PASSED_RESULTS`, 계류 = `billResult`가 비어 있음(`findOverview`와 같은 정의), `ingestStatus = READY`, `BillInfoConstant.getCurrentAssemblyNumber()`.
- 웹: `fetchPublicDetail`(서버 조회·404 처리), `BillList`·`useIntersect`·`nextBillPage`(무한 스크롤), `SectionError`/`SectionEmpty`, `getPartyColor()`, `getMetadata`, `Layout`·`SubHeader`.
- 배포: `deploy-test-backend.sh`의 `PORT`·`CONTAINER_NAME`·`IMAGE_NAME`·`ACTIVE` 변수.

**새로 만드는 것 (백엔드)**
- `global/constant/CommitteeNames`: 이전→현재 명칭 맵(출처: 2025-09 국회법 개정), `canonical(name)`, `aliasesOf(current)`, `typeOf(name)`(이름이 `특별위원회`로 끝나면 `special`).
- `StatisticsRepository.findCommitteeBillStats(assembly)`: committee별 count·passed·pending. 통계 탭의 `/statistics/by-committee`도 `StatisticsService`에서 같은 기준으로 합산해 위원회 화면과 수치를 맞춘다.
- `BillRepositoryCustom.findBillByCommitteeAndPage(pageable, userId, names, assembly)`: `bill.committee.in(names)`.
- `CongressmanRepository.findActiveWithParty()`: `state = true`, party fetch join.
- `CommitteeService`·`CommitteeController`(`/v1/committee`), DTO `CommitteeSummaryDto`, `CommitteeDetailResponse`, `CommitteeMemberDto`, 예외 `CommitteeException.CommitteeNotFound`(`ErrorCode` 404 추가).

**새로 만드는 것 (웹)**
- `app/committee/`: `layout.tsx`, `page.tsx`(목록), `[name]/page.tsx`(상세, `generateMetadata`), `apis/`, `components/`.
- `lib/committee.ts`: `committeeHref(name)`(encodeURIComponent), `decodeCommitteeParam`.
- `lib/publicDetail.ts`: `getPublicCommitteeList`, `getPublicCommittee(name)`.
- 진입 링크: `BillDetail` 소관 위원회, `CongressmanDetail` 소속 위원회, `StatsCommitteeBars` 제목, `AssemblyPanel`. 사이트맵 정적 경로에 `/committee` 추가.

**화면**
- 목록: 상임/특별 두 묶음. 행마다 이름, 위원 수, 접수 수. 행 아래 막대 하나가 접수 수를 최대값 대비 길이로, 가결 몫을 진한 잉크로 채운다. 카드 대신 줄 목록이다.
- 상세: 이름(headline) → 이전 명칭 한 줄 → 접수·가결·계류 세 수치 → 위원 구성 막대(정당색 비율) → 정당별 위원 아바타 묶음 → 소관 법안 무한 목록.
- 모션은 위원 구성 막대가 처음 나타날 때 한 번 채워지는 것만 둔다(`prefers-reduced-motion`이면 생략).

**테스트 백엔드**
- `deploy/deploy-staging-backend.sh`: `PORT=8090 CONTAINER_NAME=lawdigest-backend-staging IMAGE_NAME=lawdigest-backend-staging LOG_DIR=.runtime/staging-backend/logs`로 `deploy-test-backend.sh`에 위임. `ACTIVE`는 `prod`(운영과 같은 DB·설정).
- `deploy-test-backend.sh`에 `LOG_DIR` 변수 추가(기본값은 지금 경로 그대로).
- 문서 `deploy/STAGING_BACKEND_DEPLOY.md`.

## 버린 대안

- 탐색 > 국회 안의 탭으로만 넣기: 사용자가 독립 라우트를 골랐다.
- `commits LIKE '%이름%'` 조회: 부분 문자열 오탐이 생긴다. 현직 의원은 300명 안팎이라 메모리에서 나눠 비교한다.
- 위원회 영문 slug: 공식 코드가 DB에 없고 특별위원회는 수시로 생긴다. 이름을 그대로 키로 쓴다.
- test.lawdigest.kr을 staging 백엔드에 연결: test 웹은 `dev` 기준 원칙이 있어 이번에는 로컬 웹 + SSH 터널로 검증한다.

## 함정

- Next 동적 세그먼트의 한글 값은 인코딩된 채 올 수 있다. 한 번만 디코드하고, 잘못된 퍼센트 인코딩은 404로 처리한다.
- `fetchPublicDetail`은 `data`가 객체여야 통과한다. 배열 응답도 `typeof === 'object'`라 통과한다.
- 이전 명칭의 법안은 위원 명단이 없다(위원은 현재 명칭만 가진다).
- staging 컨테이너도 운영 DB에 쓴다. 검증 중에는 조회만 한다.

## 완료 기준

- `cd services/backend && ./gradlew test` 통과.
- `cd services/web && npm run lint && npx tsc --noEmit && npx vitest run` 통과.
- staging 백엔드에서 `curl :8090/v1/committee/list`가 재정경제기획위원회 `bill_count` ≥ 899 + 735 = 1634를 돌려준다.
- 로컬 웹(staging 연결)에서 `/committee`, `/committee/보건복지위원회`, `/committee/예산결산특별위원회`, `/committee/기후위기%20특별위원회`가 라이트·다크·375px에서 정상 표시된다.
