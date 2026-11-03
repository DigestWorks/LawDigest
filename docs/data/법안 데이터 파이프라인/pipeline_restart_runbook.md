# 데이터 파이프라인 런타임 런북

> 작성일: 2026-05-19
> 현재 방향: **Airflow 폐기, 자체 `lawdigest-pipeline` 런타임으로 전환**

---

## 1. 운영 원칙

Lawdigest 데이터 파이프라인은 더 이상 Airflow DAG를 표준 실행 경로로 보지 않습니다.

기존 Airflow DAG는 구현 참고용 legacy artifact로만 남기고, 실제 실행은 `lawdigest_data.runtime`의 `lawdigest-pipeline` CLI를 기준으로 합니다. AI 요약 표준 경로는 배치 제출/회수가 아니라 Codex CLI 기반 실시간 처리입니다. 실행 결과는 append-only JSONL 로그로 남기며, 이후 직접 구현할 파이프라인 모니터링 사이트는 이 실행 이력을 읽는 구조로 확장합니다.

기본 실행 로그:

```bash
/tmp/lawdigest-pipeline/pipeline-runs.jsonl
```

운영 로그 위치를 고정하려면:

```bash
export LAWDIGEST_PIPELINE_LOG_DIR=/var/log/lawdigest-pipeline
```

---

## 2. 실행 환경

로컬/서버 체크아웃에서 아래처럼 실행합니다.

```bash
cd /home/ubuntu/project/Lawdigest
PYTHONPATH=services/data/src:services/ai/src python -m lawdigest_data.runtime.cli --help
```

패키지 설치 환경에서는 console script도 사용할 수 있습니다.

```bash
lawdigest-pipeline --help
```

---

## 3. 핵심 명령

### 3.1 법안 수집

```bash
PYTHONPATH=services/data/src:services/ai/src python -m lawdigest_data.runtime.cli \
  bill-ingest \
  --mode dry_run \
  --start-date 2026-05-19 \
  --end-date 2026-05-19 \
  --age 22
```

운영 반영:

```bash
PYTHONPATH=services/data/src:services/ai/src python -m lawdigest_data.runtime.cli \
  bill-ingest \
  --mode prod \
  --start-date 2026-05-19 \
  --end-date 2026-05-19 \
  --age 22
```

### 3.2 법안 상태 동기화

```bash
PYTHONPATH=services/data/src:services/ai/src python -m lawdigest_data.runtime.cli \
  bill-status-sync \
  --mode dry_run \
  --start-date 2026-05-19 \
  --end-date 2026-05-19 \
  --age 22
```

### 3.3 AI 요약/리포트 (표준)

```bash
PYTHONPATH=services/data/src:services/ai/src python -m lawdigest_data.runtime.cli \
  ai-summary \
  --mode dry_run \
  --read-mode prod \
  --limit 1 \
  --target passed \
  --concurrency 1 \
  --output-dir /tmp/lawdigest-bill-agent-reports
```

이 경로는 기본적으로 Codex MCP 에이전트 기반 리포트 생성기를 실행합니다. 에이전트가 국회·법령·통계 MCP를 사용해 Markdown 리포트를 만들고, `prod` 실행에서는 기존 컬럼인 `title`, `gpt_summary`, `summary_tags`로 반영합니다. 기본 모델은 `gpt-5.4-mini`입니다.

Gemini 보조 경로 smoke 예시:

```bash
PYTHONPATH=services/data/src:services/ai/src python -m lawdigest_data.runtime.cli \
  ai-summary \
  --engine cli \
  --mode dry_run \
  --read-mode prod \
  --target-mode latest \
  --cli-provider gemini \
  --limit 1 \
  --batch-size 1 \
  --output-path /tmp/lawdigest-gemini-smoke.json
```

이 smoke는 Gemini 보조 경로가 실제로 동작하는지 확인합니다. `dry_run`이므로 DB에는 반영하지 않습니다.

### 3.4 통과 법안 Codex MCP 리포트

```bash
PYTHONPATH=services/data/src:services/ai/src python -m lawdigest_data.runtime.cli \
  bill-agent-report \
  --mode dry_run \
  --read-mode prod \
  --limit 1 \
  --target passed \
  --concurrency 1 \
  --output-dir /tmp/lawdigest-bill-agent-reports
```

이 경로는 일반 결측 요약 백필이 아니라 통과된 법안의 심화 리포트 작성용입니다. Codex 에이전트가 `open-assembly`, `assembly-api`, `korean-law`, `korean-stats` MCP 서버를 능동적으로 사용해 법안 통과 경로, 법령 맥락, 정책 배경 통계, 이해관계자 영향, 후속 모니터링 포인트를 Markdown으로 작성합니다.

전체 법안을 대상으로 병렬 실행하려면 아래처럼 실행합니다.

```bash
PYTHONPATH=services/data/src:services/ai/src python -m lawdigest_data.runtime.cli \
  bill-agent-report \
  --mode dry_run \
  --read-mode prod \
  --limit 9 \
  --target all \
  --concurrency 3 \
  --output-dir /tmp/lawdigest-bill-agent-reports
```

실행 전 환경변수:

- `ASSEMBLY_API_KEY`: 열린국회정보 API 키. 없으면 `sample` 키로 시도하지만 실운영 리포트에는 정식 키를 사용합니다.
- `LAW_OC`: 국가법령정보센터 Open API 인증키.
- `KOSIS_API_KEY`: 통계청 KOSIS OpenAPI 키. 원격 `korean-stats` MCP는 별도 키 없이 동작할 수 있지만 로컬/정식 조회 품질을 위해 설정을 권장합니다.
- `BILL_AGENT_CODEX_MODEL`: Codex 모델 override. 기본값은 `gpt-5.4-mini`입니다.
- `BILL_AGENT_CODEX_TIMEOUT_SECONDS`: Codex 세션 timeout. 기본값은 900초입니다.

결과 확인:

```bash
jq '.stats, .usage_meter, .items[] | {bill_id, status, duration_seconds, usage, error}' \
  /tmp/lawdigest-bill-agent-reports/manifest.json
```

자세한 계약은 [에이전트 기반 법안 리포트 생성 파이프라인](/home/ubuntu/project/Lawdigest/docs/ai/bill-report-agent-pipeline.md)을 기준으로 봅니다.

### 3.5 AI Batch 제출 (legacy fallback)

```bash
PYTHONPATH=services/data/src:services/ai/src python -m lawdigest_data.runtime.cli \
  ai-batch-submit \
  --mode dry_run \
  --provider gemini \
  --limit 5
```

### 3.6 AI Batch 결과 회수 (legacy fallback)

```bash
PYTHONPATH=services/data/src:services/ai/src python -m lawdigest_data.runtime.cli \
  ai-batch-ingest \
  --mode dry_run \
  --provider all \
  --max-jobs 5
```

### 3.7 Native API 기반 결측 요약 복구

```bash
PYTHONPATH=services/data/src:services/ai/src python -m lawdigest_data.runtime.cli \
  ai-repair-native \
  --mode dry_run \
  --provider gemini \
  --limit 5 \
  --batch-size 1 \
  --output-path /tmp/lawdigest-native-repair.json
```

### 3.8 CLI 기반 결측 요약 복구 (compatibility alias)

```bash
PYTHONPATH=services/data/src:services/ai/src python -m lawdigest_data.runtime.cli \
  ai-repair-cli \
  --mode dry_run \
  --cli-provider codex \
  --limit 1 \
  --batch-size 1 \
  --output-path /tmp/lawdigest-cli-repair.json
```

`ai-repair-cli`는 기존 명령 호환용입니다. 신규 운영에서는 기본 `ai-summary` 에이전트 경로를 우선 사용합니다.

사용 가능한 CLI provider:

- `gemini`
- `codex`
- `claude`

---

## 4. 스케줄 운영

서버 timer 구성은 `deploy/pipeline/`에 있다. 작업별 등록과 개별 운영 실행에는 사용자 승인이 필요하다.

| 작업 | KST 예정 시간 | 1회 실행 범위 |
| --- | --- | --- |
| 수집 | 01:10 | 제22대, 실행일 포함 최근 3일 |
| 상태 동기화 | 03:10 | 공식 의원 명부와 제22대 최근 3일의 단계·표결 |
| AI 요약 | 05:10 | 미작성 요약 최대 40건, Codex 동시 실행 1개 |
| 분야 분류 | 08:30 | 제22대의 분류 값이 NULL인 법안, 로컬 규칙 기반 |

1. 승인된 수집·상태 동기화 런타임을 먼저 검증한다. 과거 백필은 각 기간과 쓰기 범위를 따로 승인한다. AI 요약의 Codex CLI와 인증, 분야 분류의 DB 컬럼은 각각 실행 전에 확인한다.
2. 등록 승인을 받은 뒤 체크아웃에서 `sudo ./deploy/pipeline/install-pipeline-timers.sh --install`로 유닛과 래퍼를 복사한다. 서버 관리자가 `/etc/lawdigest-pipeline/runtime.env`를 소유자 root, 모드 0600으로 준비한다. `LAWDIGEST_PIPELINE_ROOT`에는 배포한 체크아웃, `LAWDIGEST_PIPELINE_PYTHON`에는 해당 실행 환경의 Python 절대 경로를 지정한다. 기존 API·DB 환경은 필요한 항목을 비공개 파일로 옮긴다. Codex 경로가 기본 PATH 밖에 있으면 이 파일에서 PATH를 지정한다.
3. 승인된 timer만 `sudo systemctl daemon-reload` 뒤 `sudo systemctl enable --now lawdigest-bill-ingest.timer`처럼 이름을 지정해 활성화한다.
4. 실행별 승인 후 작업명, 실행일(KST), 고유 실행 ID, 배포 커밋 SHA를 공백으로 구분한 한 줄을 `/etc/lawdigest-pipeline/approvals/<작업명>`에 root 소유, 모드 0600으로 설치한다. 예시 형식은 `bill-ingest 2026-11-04 approval-12345678 <commit-sha>`다. 승인 ID는 영문·숫자·밑줄·하이픈 8~80자다. 동일한 작업·날짜·ID는 한 번만 사용할 수 있다. 실패 뒤 다시 실행하려면 새 승인을 받는다.
5. `systemctl list-timers 'lawdigest-*'`와 `journalctl -u lawdigest-pipeline@bill-ingest.service`에서 예정 시각과 실행 결과를 확인한다. 수집·상태·요약은 `/var/log/lawdigest-pipeline/pipeline-runs.jsonl`도 대조한다. 분야 분류 건수는 journald에서 확인한다. 승인 누락, 부분 실패, 공식 데이터 응답 검증 실패는 7일 성공 기록에 포함하지 않는다.

네 작업은 하나의 잠금을 사용한다. 예정 실행이 겹치면 최대 15분 기다리고, 잠금을 얻지 못하면 실패로 남긴다. 중단 기간의 수집은 승인된 기간을 지정해 별도로 실행한다. timer를 정지할 때는 대상 이름을 지정해 `sudo systemctl disable --now lawdigest-bill-ingest.timer`처럼 실행한다.

---

## 5. Airflow 폐기 상태

Airflow는 신규 운영 경로에서 제외합니다.

- `infra/airflow/dags/*`: legacy reference
- `infra/airflow/docker-compose.yaml`: legacy reference
- Airflow 컨테이너 재기동/재배포: 중단
- 신규 파이프라인 기능: `lawdigest_data.runtime`에만 추가

Airflow 파일을 완전히 삭제하기 전까지는 과거 DAG의 파라미터와 실행 순서를 참고할 수 있지만, 운영 판단은 `lawdigest-pipeline` 결과와 JSONL 실행 로그를 기준으로 합니다.

---

## 6. 다음 모니터링 사이트 설계 기준

직접 구현할 데이터 파이프라인 모니터링 사이트는 우선 아래 데이터를 읽으면 됩니다.

- 최근 run 목록
- command별 성공/실패 횟수
- step별 처리 결과
- 실패 traceback
- 산출물 JSON 경로
- provider별 AI 요약 성공률

초기 데이터 소스는 `pipeline-runs.jsonl`이고, 운영 필요성이 커지면 같은 이벤트를 DB 테이블(`pipeline_runs`, `pipeline_run_steps`, `pipeline_artifacts`)에도 기록합니다.

## 7. 2026-11-03 수집 복구 확인 사항

최신 법안의 Open API 상세·발의자 응답이 비어 있을 때 공식 의안정보시스템의 전체 제안자 명단으로 보완한다. 전체 개수·페이지와 대표 역할을 확인하지 못하거나 의원 코드가 모호하면 재시도 가능한 미해결로 남긴다. 원문 재수집은 기존 AI 요약·제목·태그를 보존한다.

- 의원 부분 추가는 `update_lawmaker_info(rows)`로 수행하며 다른 의원을 비활성화하지 않는다. 전체 동기화는 선언된 전체 건수와 모든 페이지·코드 유일성을 확인한 `WorkFlowManager.update_lawmakers_data()`에서 `full_snapshot=True`를 명시한다.
- 먼저 dry_run에서 처리 건수·거절 사유를 확인하고, 필요한 의원 코드가 DB에 있는지 읽기 전용으로 대조한다. 11월 2일 표본 29건의 모의 처리에서 의원 코드 1개가 누락됐다. 별도 승인으로 김형연 의원을 등록했고 공개 프로필에서 조회된다. 법안 적재는 별도 승인 대기다.
- 운영 artifact 해시와 대상 개수·날짜·테이블 범위를 준비한 뒤 쓰기 실행마다 사용자 승인을 받는다. timer 등록도 별도 승인 대상이다.
- 매시간 호출되던 기존 cron은 존재하지 않는 저장소 경로를 가리킨다. 승인된 timer를 등록할 때 중복 실행과 기존 cron 정리를 함께 확인한다. 현재 timer를 등록하거나 cron을 변경하지 않았다.
- 원문 적재 뒤 AI 요약·분야·상태/표결·검색 문서 갱신, 운영 화면을 차례로 검증한다. 원문 적재 성공으로 전체 백필 완료를 판정하지 않는다.

상세 증거와 남은 작업은 [W1 수집 선행 복구 검증](../../audit/2026-11-03-w1-ingest-recovery.md)에 기록했다.
