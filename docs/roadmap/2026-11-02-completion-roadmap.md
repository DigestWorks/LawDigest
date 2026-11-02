# 모두의입법 최종 완성 로드맵

작성일: 2026-11-02
기준 커밋: `48c52a4` (main, 2026-07-15)

이 문서는 저장소, 운영 도메인, GitHub 이슈·PR, 로컬 테스트를 조사한 결과와 최종 완성까지의 단계를 정리한다. 조사 방법은 각 표의 "확인 방법" 열에 적는다.

---

## 1. 조사 범위와 방법

| 대상 | 방법 |
| --- | --- |
| 저장소 구조·문서 | `README.md`, `PRODUCT.md`, `.cluedoc/`, `almanac/`, `docs/`, `deploy/` 열람 |
| 운영 상태 | `lawdigest.kr`, `api.lawdigest.kr`, `test.lawdigest.kr`, `dev.lawdigest.kr` HTTP 응답과 공개 API 데이터 조회 |
| 작업 이력 | `git log`, 원격 브랜치 비교, GitHub 이슈 29건·PR 목록 |
| 코드 품질 | 네 서비스의 lint·테스트·타입검사 로컬 실행 |

---

## 2. 현재 상태

### 2.1 활동 이력

| 항목 | 값 |
| --- | --- |
| 마지막 main 커밋 | 2026-07-15 |
| 마지막 머지 PR | #135, 2026-07-16 |
| 오늘 | 2026-11-02 |
| 공백 | 약 3.5개월 |
| 월별 커밋 (3월~7월) | 118 / 140 / 39 / 116 / 111 |

### 2.2 운영 도메인

| 도메인 | 응답 | 비고 |
| --- | --- | --- |
| `lawdigest.kr` | 200 | 운영 웹, `main` 기준 |
| `api.lawdigest.kr` | 200 | 피드·검색·타임라인·통계 API 정상 응답 |
| `dev.lawdigest.kr` | 200 | 개발 모드 |
| `test.lawdigest.kr` | 502 | 업스트림 프로세스가 응답하지 않음. 원인은 서버에서 확인 필요 |

테스트 도메인은 `dev` 브랜치 기준으로 배포한다. `dev`는 `main`보다 314커밋 뒤에 있고 `main`에 없는 커밋은 0건이다. 프로세스를 복구해도 오래된 코드가 올라간다.

### 2.3 운영 데이터

| 항목 | 값 | 확인 방법 |
| --- | --- | --- |
| 전체 법안 수 | 17,982 | `/v1/statistics/overview` |
| 통과 법안 수 | 828 | 같은 API |
| 최신 법안 발의일 | 2026-07-09 | `/v1/bill/mainfeed` |
| 월별 적재 건수 2026-05 / 06 / 07 | 300 / 564 / 250 | `/v1/statistics/trend` |
| 2026-08 ~ 10 적재 건수 | 집계 없음 | 같은 API |
| 최신 20건 중 분야(category) 미분류 | 20 / 20 | `/v1/bill/mainfeed?size=20` |

법안 수집, 상태 동기화, AI 요약, 분야 분류가 2026-07-09 이후 실행되지 않았다. 저장소에는 파이프라인 스케줄 설정이 없다. 런북 4절은 "우선 수동 실행, 스케줄은 추후 systemd timer"로 적혀 있다. Airflow는 2026-07-15에 폐기했다.

### 2.4 서비스별 코드 상태

| 서비스 | 로컬 검증 결과 | 상태 |
| --- | --- | --- |
| `services/web` (Next.js 15, React 19) | ESLint 경고 0, vitest 46/46 통과, `tsc` 오류 0 | 정상. 테스트는 유틸·렌더러 단위만 있고 화면 흐름 테스트는 없음 |
| `services/backend` (Spring Boot 3.1, Java 17) | Gradle 테스트 40/40 통과 | 정상. 컨트롤러 12개, 테스트 클래스 13개 |
| `services/data` (Python) | pytest 306 통과, 2 실패, 15 건너뜀 | 실패 2건은 로컬에 없는 여론조사 PDF 파일 의존 (이슈 #109) |
| `services/ai` (Python) | pytest 256 통과, 10 실패 | 실패 10건 모두 `test_agentic_bill_report.py`. `/home/ubuntu` 경로가 코드에 고정되어 서버 밖에서 실패 |
| `services/pipeline-monitor` | 코드 없음 | `main`에는 기획서와 디자인 문서만 있음. 구현은 `feat/pipeline-monitor-ui/codex` 브랜치에 있음 |

CI는 `deploy-production.yml` 하나다. PR 검증은 웹 lint·test·build와 백엔드 test·bootJar만 실행한다. `services/data`, `services/ai`의 pytest는 CI에 없다.

### 2.5 README 기능표와 실제 구현 비교

| README 기능 | 실제 상태 |
| --- | --- |
| AI 법안 요약 | 구현됨. 표준 경로는 Codex 에이전트 `ai-summary`. README는 Gemini CLI 실시간 요약으로 적혀 있어 문서가 어긋남 |
| 태그 분류 | 구현됨 |
| 의원/정당 팔로우 | 구현됨 |
| 법안 타임라인 | 구현됨 |
| 좋아요·알림 | 구현됨 |
| RAG 챗봇 | `services/ai/rag`에 코드만 있음. 백엔드 API와 웹 화면 모두 호출 경로 없음 |

### 2.6 브랜치와 이슈

| 항목 | 수 |
| --- | --- |
| 원격 브랜치 중 `main`에 머지된 뒤 남은 브랜치 | 21 |
| `main`에 머지되지 않은 브랜치 | 17 |
| 열린 PR | 1 (#103, 충돌 상태) |
| 열린 이슈 | 29 |

머지되지 않은 브랜치 중 로드맵에 직접 연결되는 세 개:

| 브랜치 | 커밋 | 내용 | 연결 이슈 |
| --- | --- | --- | --- |
| `fix/title-only-regeneration/codex` | 4 | 카드 제목 전용 재생성 경로. 마지막 커밋 2026-07-17로 `main`보다 늦음 | #123 |
| `fix/agent-report-retry-qa/codex` | 13 | 리포트 재처리 방지, 툴팁 상태 테이블, 기본 모델 변경 | #134 |
| `feat/pipeline-monitor-ui/codex` | 14 | 모니터 서버 API와 UI 구현 | 런북 6절 |

`fix/ai-summary-format/codex`와 `feat/bill-visual-report-mockup/codex`는 `feat/pipeline-monitor-ui/codex`의 커밋을 포함한다. 머지 순서가 묶여 있다.

열린 이슈의 묶음:

| 묶음 | 이슈 | 비고 |
| --- | --- | --- |
| 여론조사 파서 | #42~#51, #71, #109 | 프론트 선거 탭은 PR #95에서 제거됨 |
| 선거 백엔드 정리 | #96 | 제거 여부 결정 대기 |
| AI 리포트 | #123, #134, #88, #89 | 두 브랜치가 미머지 |
| 파이프라인 | #60, #62, #63, #65 | 리팩터링·모니터링 |
| 검색 | #76, #77 | OpenSearch 전환 제안. 현재 `BillSearchDocument` 테이블로 동작 중 |
| 인프라 | #18, #125, #132 | SSH 시간 초과, 린트 환경, watchdog |
| 선거 지도 | #5, #9 | 선거 탭 제거로 대상이 없어짐 |

### 2.7 신뢰·보안·법적 요건

| 항목 | 상태 |
| --- | --- |
| 개인정보처리방침·이용약관 페이지 | 없음. Google·Kakao·Naver OAuth 로그인은 있음 |
| 커밋된 비밀값 | `docs/data/선거 데이터 파이프라인/중앙선거관리위원회 API/api_keys.env`에 API 키 1개. `docker-compose.yml`에 MySQL root 비밀번호 평문 |
| 웹 오류·사용 지표 수집 | 없음 (Sentry, GA 등 미연동) |
| 서비스 README | `services/web/README.md`는 NextUI 템플릿 원문. `services/backend/README.md`는 구 Lawbag 문서. `package.json` 이름은 `next-app-template` |

---

## 3. 완성 기준 제안

"최종 완성"의 정의가 저장소에 없다. `PRODUCT.md`의 설계 원칙과 README 기능표를 근거로 아래 여섯 항목을 완성 기준으로 제안한다.

| 번호 | 기준 | 측정 방법 |
| --- | --- | --- |
| A | 데이터 최신성. 수집·상태 동기화·요약·분류가 매일 자동 실행된다 | 최신 법안 발의일과 오늘의 차이가 2일 이내. 노출 법안 중 요약·분류 누락 0 |
| B | 운영 가시성. 실행 결과와 실패를 화면에서 확인한다 | 모니터 서비스 배포. 실패 시 알림 1회 이상 수신 |
| C | 기능 범위 일치. README 기능표와 실제 제품이 같다 | RAG 챗봇, 선거 서브시스템, OpenSearch 각각 출시 또는 제거로 결정 |
| D | 신뢰·법적 요건. 개인정보처리방침·이용약관이 있고 비밀값이 저장소에 없다 | 페이지 2개 배포. `git grep`으로 키·비밀번호 0건. 노출된 키 회전 |
| E | 품질 게이트. 네 서비스 테스트가 CI에서 통과한다 | PR 검증에 data·ai pytest 추가. 환경 의존 실패 0 |
| F | 문서·저장소 정합. README 3종과 운영 문서가 실제와 같고 브랜치·이슈가 정리된다 | 미머지 브랜치 0 또는 보류 목록 명시. 대상 없는 이슈 종료 |

---

## 4. 단계별 로드맵

가장 제약이 큰 순서로 배치했다. 각 단계는 종료 조건을 만족해야 다음 단계로 넘어간다.

### 0단계. 운영 복구 (1~2주) → 기준 A, D, E 일부

| 순서 | 작업 | 종료 조건 |
| --- | --- | --- |
| 0-1 | 운영 서버에서 `pipeline-runs.jsonl`과 마지막 실행 상태를 확인한다 | 마지막 실행 시각과 실패 원인 기록 |
| 0-2 | `bill-ingest` → `bill-status-sync` → `ai-summary`를 dry-run 뒤 prod로 실행해 7월~10월 공백을 채운다 | 최신 법안 발의일이 2일 이내 |
| 0-3 | `services/ai/scripts/backfill_bill_category.py`로 분야 분류를 백필한다. 표준 `ai-summary` 경로는 요약이 있는 최신 법안에도 category를 비워 두므로, 분류를 런타임에 넣거나 별도 timer로 등록한다 | 노출 법안의 category 누락 0 |
| 0-4 | `deploy/`에 systemd timer와 래퍼 스크립트를 추가하고 서버에 등록한다 (런북 4절). 대상은 `bill-ingest`, `bill-status-sync`, `ai-summary`, 그리고 0-3의 분류 | timer가 journald에 매일 기록 |
| 0-5 | `dev` 브랜치를 `main`으로 맞추거나 테스트 도메인을 폐기한다 | `test.lawdigest.kr` 200 또는 배포 문서에서 제거 |
| 0-6 | `api_keys.env`를 삭제하고 키를 회전한다. `docker-compose.yml` 비밀번호를 환경변수로 뺀다. 이력 제거 여부를 결정한다 | 저장소에 비밀값 0건 |
| 0-7 | `agentic_bill_report.py`의 `DEFAULT_CODEX_HOME` 기본값 `/home/ubuntu/.codex-report`를 환경 독립 경로로 바꾼다. PDF 파일 의존 테스트는 파일이 없으면 건너뛴다 (#109, #125) | 네 서비스 로컬 테스트 실패 0 |

0-1~0-3은 운영 DB에 쓰기를 수반하므로 사용자 승인 뒤 실행한다.

### 1단계. 미머지 브랜치 정리 (1~2주) → 기준 F

| 순서 | 작업 | 종료 조건 |
| --- | --- | --- |
| 1-1 | `fix/title-only-regeneration/codex`를 리뷰·머지하고 #123 재생성을 실행한다 | 원문 첫 문장형 제목이 피드에서 0건 |
| 1-2 | `fix/agent-report-retry-qa/codex`를 리뷰한다. 기본 모델 변경 커밋은 분리해서 판단한다 | #134 체크리스트 완료 또는 분할 |
| 1-3 | `feat/pipeline-monitor-ui/codex`를 `main`에 맞춰 리베이스하고 별도 도메인에 배포한다 | 모니터 화면에서 최근 run 조회 가능 |
| 1-4 | PR #103 충돌을 해결하거나 닫는다 | 열린 PR 0 또는 진행 중 |
| 1-5 | 머지된 원격 브랜치 21개를 삭제한다. 남은 미머지 브랜치는 머지·보류·폐기를 각각 적는다 | 보류 목록 문서화 |
| 1-6 | 이슈를 정리한다. #5, #9, #42~#51, #71은 선거 탭 제거에 따라 종료하거나 #96 결정과 묶는다 | 열린 이슈가 모두 로드맵 단계와 연결됨 |

### 2단계. 제품 범위 확정 (2~3주) → 기준 C, D

| 순서 | 작업 | 권고 |
| --- | --- | --- |
| 2-1 | RAG 챗봇 출시 또는 제거 결정 | 제거. 백엔드·웹 경로가 없고 Qdrant 운영 비용이 추가된다. README에서 제거하고 별도 로드맵으로 분리 |
| 2-2 | 선거·여론조사 백엔드 서브시스템 (#96) | 제거. 프론트 호출이 없다. DB 백업 뒤 테이블 삭제를 별도 PR로 진행 |
| 2-3 | OpenSearch 검색 전환 (#77) | 보류. 현재 검색이 동작한다. 검색 품질 지표를 먼저 정의한다 |
| 2-4 | 개인정보처리방침·이용약관 페이지와 로그인 화면 링크, 회원 탈퇴 흐름 확인 | 필수. OAuth 계정을 수집하는 서비스의 법적 요건 |
| 2-5 | 법안 카드·상세에 수집 시각과 요약 생성 시각을 표시한다 (`PRODUCT.md` 원칙 4) | 필수. 데이터 공백이 사용자에게 보이게 한다 |

### 3단계. 품질 (2~3주) → 기준 E

| 순서 | 작업 |
| --- | --- |
| 3-1 | PR 검증 워크플로에 `services/data`, `services/ai` pytest를 추가한다 |
| 3-2 | 백엔드 TODO 중 운영 위험 두 건을 처리한다. 조회수 갱신 동시성 (`BillService`), 알림 중복 삽입 (`NotificationCreator`) |
| 3-3 | 웹 핵심 경로 5개(피드, 상세, 검색, 로그인, 마이페이지)에 브라우저 smoke 테스트를 추가한다 |
| 3-4 | 접근성과 성능을 점검한다. `DESIGN.md` 대비 기준과 LCP를 측정하고 결과를 기록한다 |
| 3-5 | 웹 오류 수집 도구 도입 여부를 결정한다 |

### 4단계. 출시 정리 (1주) → 기준 F

| 순서 | 작업 |
| --- | --- |
| 4-1 | 루트 README의 요약 경로 설명을 실제(Codex 에이전트)로 고친다. Next.js 버전 표기(13)를 실제(15)로 고친다. 기능표를 2단계 결정에 맞춘다 |
| 4-2 | `services/web/README.md`, `services/backend/README.md`, `package.json` 이름을 교체한다 |
| 4-3 | 운영 런북에 timer 운영과 모니터 접속 절차를 추가한다 |
| 4-4 | 주간 리포트를 재개한다 |

### 일정 요약

| 단계 | 기간 | 완성 기준 |
| --- | --- | --- |
| 0 운영 복구 | 1~2주 | A, D 일부, E 일부 |
| 1 미머지 브랜치 정리 | 1~2주 | F |
| 2 제품 범위 확정 | 2~3주 | C, D |
| 3 품질 | 2~3주 | E |
| 4 출시 정리 | 1주 | F |
| 합계 | 7~11주 | A~F |

---

## 5. 첫 작업 제안

0-4 "systemd timer 배포 구성 추가"를 첫 PR로 제안한다. 서버 접속 없이 저장소에서 완결되고, 0-2의 수동 실행이 끝난 뒤 바로 등록할 수 있다.

범위:

- `deploy/pipeline/lawdigest-pipeline-wrapper.sh`: `PYTHONPATH`와 작업 디렉터리를 고정한 실행 래퍼
- `deploy/pipeline/*.service`, `*.timer`: `bill-ingest`, `bill-status-sync`, `ai-summary` 각 1쌍
- `deploy/pipeline/install-pipeline-timers.sh`: 유닛 복사와 `systemctl enable --now`
- `docs/data/법안 데이터 파이프라인/pipeline_restart_runbook.md` 4절 갱신

0-1과 0-2는 사용자가 운영 서버에서 실행하거나 접속 권한을 준 뒤 진행한다.
