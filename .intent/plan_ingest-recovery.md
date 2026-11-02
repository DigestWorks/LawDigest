---
title: 법안 재수집과 최신 발의자 정보 복구
slug: ingest-recovery
stage: plan
status: accepted
intent: .intent/intent_ingest-recovery.md
spec: .intent/spec_ingest-recovery.md
date: 2026-11-03
---

# 법안 재수집과 최신 발의자 정보 복구 — 구현 계획

| 파일 | 변경 |
| --- | --- |
| `services/data/src/lawdigest_data/bills/DataFetcher.py`, 새 `bills/likms_proposers.py` | 공식 상세·팝업 파싱과 전체 명단 확인, API 빈 응답 보완 및 유일한 ID 매칭, 수집 전체 건수와 완료 여부 메타데이터 |
| `services/data/src/lawdigest_data/bills/DataProcessor.py` | 확인된 대표발의자 ID 사용, 발의자 설명 추출 제한 |
| `services/data/src/lawdigest_data/connectors/DatabaseManager.py`, `core/WorkFlowManager.py` | AI 필드·제목 보존을 포함한 반복 upsert, 부분 의원 추가와 검증된 전체 명부 동기화 분리 |
| `services/data/tests/test_{likms_proposers,ingest_mysql,open_assembly_bill_fetcher,data_processor}.py`, `tests/fixtures/likms_{detail,proposers}.html` | 역할·완전성·실패 회귀와 격리 MySQL 반복 적재. 공개 HTML의 필요한 구조만 보존하고 세션·이미지·스크립트를 제거한다. |
| `docs/data/법안 데이터 파이프라인/pipeline_restart_runbook.md` | 검증 결과와 백필 선행 조건 기록 |
| `docs/audit/2026-11-03-w1-ingest-recovery.md` | 수정 전후 시험 결과, 운영 적재 선행 조건과 승인 범위 기록 |
| `services/data/tests/test_{database_manager_lawmaker,workflow_manager}.py` | 부분 명부의 비활성화 방지와 전체 명부 완전성 검사 |

1. 세 아티팩트를 각각 커밋한다. 기존 명세와 실제 공식 HTML을 기준으로 실패 사례를 확보한다.
2. 공식 팝업의 구조·페이지 계약을 확인하고 파서와 보완 수집을 구현한다. 알려진 역할을 끝까지 보존한다.
3. 실제 MySQL에서 재수집 시 AI 필드가 소실되는 사례를 재현한 뒤 upsert를 수정한다. 새 AI 값의 명시적 갱신도 확인한다.
4. 변경 Python 파일 정적 검사, 관련 pytest와 data 회귀 검사를 실행한다. 실제 표본 dry_run을 실행하고 결과를 기록한다.
5. 커밋·푸시·한국어 PR을 작성한다. 백필·timer는 구체적인 명령과 범위를 준비한 후 각각 별도 승인을 받는다.

```mermaid
flowchart TD
  A[공식 응답과 기존 테스트 확인] --> B[명단 파서와 역할 보존]
  B --> C[반복 upsert의 AI 보존]
  C --> D[격리 DB와 fixture 회귀]
  D --> E[실제 표본 dry_run]
  E --> F[PR 검토 후 승인된 운영 복구]
```

가장 위험한 단계는 역할을 잘못 매칭한 명단을 적재하는 것이다. 전체 인물과 대표 역할을 증명하지 못하면 해당 법안을 거절한다. 구조 변경 시에도 기존 API와 거절 동작으로 돌아가야 한다. 전용 data 가상환경에서 PYTHONPATH와 conftest로 이 워크트리 소스를 먼저 가져온다. 실제 쓰기 DB 검사는 127.0.0.1 전용 임시 DB만 허용한다. 운영 DB는 별도 읽기 전용 트랜잭션에서 적재 선행 조건만 점검한다.

구현 시 전용 data 가상환경을 이 워크트리에 만들었다. root의 기존 Python 3.12 인터프리터와 같은 버전을 사용하고 필요한 테스트 의존성을 분리했다. 원격 시험은 `/tmp`의 격리된 소스 복사본을 사용하며 DB 연결 함수를 차단한다. 임시 소스의 디렉터리 깊이가 달라 artifact 저장 경로만 임시 경로로 지정한다. 공식 명단에는 프로필 연결이 없는 의원도 있으며, 이 경우 명시된 이름·한자명과 유일한 의원 코드로 확인한다. API의 한자명이 한글 혼합 등 불완전하면 이름·정당으로 함께 확인하고, 온전한 한자명이 충돌하는 경우는 거절한다.
