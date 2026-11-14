---
title: 위원회 페이지
slug: committee-page
stage: plan
status: accepted
intent: .intent/intent_committee-page.md
spec: .intent/spec_committee-page.md
date: 2026-11-14
---

# 위원회 페이지 — 구현 계획

## 바뀌는 파일

| 파일 | 무엇을 |
|---|---|
| `services/backend/.../global/constant/CommitteeNames.java` (새) | 이전 명칭 맵, 유형 판별 |
| `services/backend/.../repository/StatisticsRepository.java` | `findCommitteeBillStats` 추가 |
| `services/backend/.../repository/BillRepositoryCustom.java`, `BillRepositoryImpl.java` | `findBillByCommitteeAndPage` 추가 |
| `services/backend/.../repository/CongressmanRepository.java` | `findActiveWithParty` 추가 |
| `services/backend/.../common/dto/committee/*` (새) | `CommitteeSummaryDto`, `CommitteeDetailResponse`, `CommitteeMemberDto`, `CommitteeBillStatsDto` |
| `services/backend/.../global/error/CommitteeException.java` (새), `ErrorCode.java` | 404 예외 |
| `services/backend/.../service/CommitteeService.java` (새) | 합산·위원 판별 |
| `services/backend/.../controller/CommitteeController.java` (새) | `/v1/committee` 3개 엔드포인트 |
| `services/backend/src/test/.../CommitteeServiceTest.java`, `CommitteeNamesTest.java` (새) | 합산·정확 일치 테스트 |
| `services/web/types/type/committee/*` (새), `types` index | 응답 타입 |
| `services/web/lib/committee.ts` (새), `lib/publicDetail.ts` | 링크·디코드, 서버 조회 |
| `services/web/app/committee/**` (새) | 목록·상세 화면 |
| `services/web/app/bill/[id]/components/BillDetail/BillDetail.tsx` | 소관 위원회 링크 |
| `services/web/app/congressman/[id]/components/Congressman/CongressmanDetail.tsx` | 소속 위원회 링크 |
| `services/web/app/explore/components/StatsCommitteeBars.tsx`, `AssemblyPanel.tsx` | 진입 링크 |
| `services/web/lib/sitemap.ts` | `/committee` 정적 경로 |
| `deploy/deploy-test-backend.sh` | `LOG_DIR` 변수 |
| `deploy/deploy-staging-backend.sh` (새), `deploy/STAGING_BACKEND_DEPLOY.md` (새) | 테스트 백엔드 |

## 작업 순서

1. 백엔드 상수·저장소·서비스·컨트롤러 — `./gradlew test` 통과, `compileJava` 통과.
2. 테스트 백엔드 스크립트·문서 — `bash -n deploy/deploy-staging-backend.sh`.
3. 커밋·푸시 후 서버에 브랜치 워크트리를 만들고 staging 배포 — `curl 127.0.0.1:8090/v1/committee/list`가 200.
4. 웹 타입·API·목록 화면 — SSH 터널(`localhost:8090`)에 붙인 로컬 dev 서버에서 `/committee` 확인.
5. 웹 상세 화면 — 한글·공백·마침표 이름 4곳 확인.
6. 진입 링크·사이트맵 — 법안·의원·통계·탐색에서 클릭 이동 확인.
7. 린트·타입·테스트, 라이트·다크·375px 스크린샷 — 완료 기준 명령 전부 통과.

## 가장 위험한 단계

3단계. 운영 서버에서 스크립트를 실행한다. 변수 하나가 빠지면 기본값(`lawdigest-backend-test`, `:808`)으로 운영 API를 교체한다. 래퍼가 `CONTAINER_NAME`이 `lawdigest-backend-test`이거나 `PORT`가 `808`이면 즉시 종료하도록 막는다. 실행 전 `docker ps`로 운영 컨테이너 생성 시각을 기록하고, 실행 뒤 같은지 확인한다. 되돌리기는 `docker rm -f lawdigest-backend-staging`이다.

## 검증

```
cd services/backend && ./gradlew test
cd services/web && npm run lint && npx tsc --noEmit && npx vitest run
ssh Oracle-Server 'curl -s 127.0.0.1:8090/v1/committee/list | head -c 600'
ssh -N -L 8090:127.0.0.1:8090 Oracle-Server   # 로컬 dev 서버 INTERNAL_API_ORIGIN=http://127.0.0.1:8090
```

화면: `/committee` → 재정경제기획위원회 → 위원 아바타 → 법안 스크롤. 법안 상세 → 소관 위원회 링크. 의원 상세 → 소속 위원회 링크.
