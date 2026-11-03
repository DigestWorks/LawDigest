# 모두의입법

모두의입법은 국회에 발의된 법안의 요약, 처리 단계와 의원·정당의 입법 활동을 제공하는 서비스입니다. [운영 웹](https://lawdigest.kr/)

- 피드에서 법안의 AI 요약을 보고 상세에서 국회 원문과 발의자를 확인할 수 있습니다.
- 타임라인과 탐색에서 법안 처리 기록, 분야별 법안, 국회와 정당 통계를 볼 수 있습니다.
- 검색은 법안·의원·정당을 대상으로 합니다. 스크랩, 팔로우와 알림에는 로그인이 필요합니다.

## 운영 상태

2026년 11월 3일 기준 운영 DB의 최신 발의일은 11월 2일이고 공개 피드의 첫 법안은 7월 9일 발의입니다. 운영 피드는 AI 요약이 있는 법안을 표시합니다. 수집·스케줄 복구와 실제 계정 검증의 진행 상태는 운영 검증 체크리스트에서 확인할 수 있습니다. [운영 검증 체크리스트](docs/audit/2026-11-03-ux-polish-production-checklist.md)

리포트 전용 피드와 최근 7일 기준 인기 순위는 PR 검토 중입니다. 법안 질의응답도 출시 준비 중이며, 임베딩과 답변 생성을 별도로 검증합니다. [피드 변경 PR](https://github.com/DigestWorks/LawDigest/pull/159) · [법안 질의응답 PR](https://github.com/DigestWorks/LawDigest/pull/155)

## 서비스 구성

| 경로 | 역할 |
| --- | --- |
| `services/web` | Next.js 15와 TypeScript로 웹 화면을 제공합니다. |
| `services/backend` | Spring Boot 3.1과 Java 17로 법안·프로필·계정 API를 제공합니다. MySQL과 Redis를 사용합니다. |
| `services/data` | 국회 자료를 수집·정제하고 `lawdigest-pipeline`으로 적재와 상태 동기화를 실행합니다. |
| `services/ai` | 법안 요약·리포트 생성과 법안 질의응답 개발을 담당합니다. |

개발 환경 실행은 각 서비스 문서를 따릅니다. [웹 실행](services/web/README.md) · [백엔드 실행](services/backend/README.md)

## 데이터 파이프라인

| 명령 | 역할 |
| --- | --- |
| `bill-ingest` | 국회 법안 데이터를 수집하고 발의자 관계와 함께 적재합니다. |
| `bill-status-sync` | 의원 명부, 법안 처리 단계와 표결을 동기화합니다. |
| `ai-summary` | 기본 Codex 에이전트 경로에서 법안 요약과 리포트를 생성합니다. Gemini CLI는 별도 옵션으로 실행합니다. |

실행 이력은 `pipeline-runs.jsonl`에 기록합니다. 운영 DB 쓰기와 서버 timer 등록은 각 실행 전에 승인받습니다. [파이프라인 런북](docs/data/pipeline_restart_runbook.md)

## 배포

운영 웹은 `main` 기준의 프로덕션 빌드를 배포합니다. 테스트·개발 웹과 운영 API의 실행 절차는 배포 문서를 따릅니다. [웹 배포 환경](deploy/WEB_DEPLOY_ENVIRONMENTS.md) · [운영 API 배포](deploy/PROD_BACKEND_DEPLOY.md)

## 라이선스

이 프로젝트에는 MIT 라이선스가 적용됩니다.
