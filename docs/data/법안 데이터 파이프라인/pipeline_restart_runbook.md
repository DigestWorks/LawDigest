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

이 경로는 기본적으로 Codex MCP 에이전트 기반 리포트 생성기를 실행합니다. 에이전트가 국회·법령·통계 MCP를 사용해 Markdown 리포트를 만들고, `prod` 실행에서는 기존 컬럼인 `title`, `gpt_summary`, `summary_tags`로 반영합니다. 기본 모델은 `gpt-6.1-terra`입니다.

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
- `--codex-model`: 테스트 환경의 Codex 모델을 지정합니다. 운영은 `gpt-6.1-terra`를 사용합니다. 운영은 원문이 있는 공개 법안 중 기존 AI 요약과 리포트가 모두 비어 있는 경우에만 생성하고, 저장 직전 다시 확인합니다. 자동 요약에는 `CODEX_CLI_BIN`의 검증된 절대 경로를 사용합니다.
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

2026-11-03 KST에 운영 서버에 `lawdigest-*` timer 4개를 설치했다. 전용 운영 런타임은 `/home/ubuntu/project/Lawdigest/.worktrees/pipeline-runtime-016de5f`의 `016de5f`이고, 저장소 루트 아래 `services/data/.venv/bin/python`을 사용한다. 수집·상태 동기화를 활성화해 11월 4일 01:10과 03:10 KST 첫 실행을 예약하고 11월 4일부터 10일까지 각 날짜의 일회용 승인을 등록했다. 승인 래퍼는 #166 머지 커밋 `80f8acb`에서 설치했다. AI 요약은 사용자 승인 뒤 전용 런타임 `0b03e79`에서 Codex CLI `gpt-6.1-terra`로 활성화했다. 11월 4~10일 05:10 KST에 미작성 공개 법안을 회당 최대 40건 처리한다. 분야 분류는 11월 4일 KST에 전용 런타임 `142b75b`와 서비스 설정을 설치했다. 11월 4~10일 08:30 KST에 실행하도록 활성화했다. 등록 시 운영 모의 실행은 대상 0건이었다. 실행 이력은 분야 분류 서비스의 journald에서 확인한다. 상태 동기화는 11월 4일 첫 실행 전에 전용 런타임 `f77cb8d`로 전환하고 기존 11월 4~10일의 날짜별 승인을 연결했다. 11월 2~4일 운영 모의 실행은 법안 상태 후보 67건과 의원 299명을 확인했고, 공식 표결 대상은 0건이었다. 11월 4일 03:10 KST 첫 실행은 의안 2222454의 국회 상세가 비어 있어 실패했다. 전용 런타임을 8509c23으로 전환해 11월 4~10일의 날짜별 승인을 연결했다. 03:15~03:16 수동 복구에서는 상세가 늦는 법안 65건의 접수 이력만 반영했고, 공개 타임라인에서 11월 3일 접수 65건을 확인했다. 예약, 모의 실행, 수동 복구는 7일 연속 예약 성공 기록에 포함하지 않는다. [상태 동기화 수정](https://github.com/DigestWorks/LawDigest/pull/202)

11월 4일 05:10~05:26 KST 첫 정기 AI 요약은 Codex CLI `gpt-6.1-terra`로 40건을 생성·저장했고 실패는 0건이었다. 08:30 첫 분야 분류는 종료 코드 0을 기록했다. 대상 65건은 검토된 규칙과 일치하지 않아 미분류로 유지했다. 11월 4일 예약 실패에 따라 상태 동기화의 날짜별 승인에만 11월 11일을 추가했다. 상태 동기화는 11월 5~11일 예약 결과를 기준으로 연속 성공을 확인한다.

11월 4일 03:16:35 KST에 저장된 현역 의원 299명의 전체 명부에 대해 `congressman_roster` 체크포인트를 등록했다. 11월 5~11일 상태 동기화는 `7deeeea` 런타임에서 전체 명부와 기준일을 한 트랜잭션으로 저장한다. 부분 갱신은 이 기준일을 변경하지 않는다. 의원·정당 프로필의 동기화일과 최신 발의일은 별도 표시한다. [명부 기준일 변경](https://github.com/DigestWorks/LawDigest/pull/209)

11월 4일 운영 `VoteRecord`와 `VoteParty`에 nullable `decision_date`를 추가하고 공식 원자료가 일치하는 합계 4건과 정당별 찬성 25행에 날짜를 기록했다. 11월 5~11일 상태 동기화의 고정 런타임을 `eb72291`로 바꿨다. 공식 의결일을 함께 저장하며, 공개 타임라인은 확인된 날짜에서만 표결을 연결한다. [표결 의결일 변경](https://github.com/DigestWorks/LawDigest/pull/215)

승인된 수동 백필로 제22대 READY 법안 2,260건을 추가했다. 운영 DB의 제22대 READY는 총 20,242건, 최신 발의일은 2026-10-30, 수집 기준점은 2026-05-06이다. 백필분은 AI 요약과 분야 값이 비어 있다. [백필 검증 기록](https://github.com/DigestWorks/LawDigest/pull/157)

| 작업 | KST 예정 시간 | 1회 실행 범위 |
| --- | --- | --- |
| 수집 | 01:10 | 제22대, 실행일 포함 최근 3일 |
| 상태 동기화 | 03:10 | 공식 의원 명부와 제22대 최근 3일의 단계·표결 |
| AI 요약 | 05:10 | 미작성 요약 최대 40건, Codex 동시 실행 1개 |
| 분야 분류 | 08:30 | 제22대 공개 법안의 빈 분야 값에 소관위원회와 검토된 법률명 규칙을 적용 |

1. 승인된 수집·상태 동기화 런타임을 먼저 검증한다. 과거 백필은 각 기간과 쓰기 범위를 따로 승인한다. AI 요약의 Codex CLI와 인증, 분야 분류의 DB 컬럼은 각각 실행 전에 확인한다.
2. 등록 승인을 받은 뒤 체크아웃에서 `sudo ./deploy/pipeline/install-pipeline-timers.sh --install`로 유닛과 래퍼를 복사한다. 서버 관리자가 `/etc/lawdigest-pipeline/runtime.env`를 소유자 root, 모드 0600으로 준비한다. `LAWDIGEST_PIPELINE_ROOT`에는 배포한 체크아웃, `LAWDIGEST_PIPELINE_PYTHON`에는 해당 실행 환경의 Python 절대 경로를 지정한다. 기존 API·DB 환경은 필요한 항목을 비공개 파일로 옮긴다. Codex 경로가 기본 PATH 밖에 있으면 이 파일에서 PATH를 지정한다.
3. 승인된 timer만 `sudo systemctl daemon-reload` 뒤 `sudo systemctl enable --now lawdigest-bill-ingest.timer`처럼 이름을 지정해 활성화한다.
4. 실행별 승인 후 작업명, 실행일(KST), 고유 실행 ID, 배포 커밋 SHA를 공백으로 구분한 한 줄을 `/etc/lawdigest-pipeline/approvals/<작업명>`에 root 소유, 모드 0600으로 설치한다. 예시 형식은 `bill-ingest 2026-11-04 approval-12345678 <commit-sha>`다. 승인 ID는 영문·숫자·밑줄·하이픈 8~80자다. 여러 날을 승인받으면 같은 파일에 날짜별로 한 줄씩 등록한다. 실행일에 해당하는 줄은 정확히 하나여야 한다. 동일한 작업·날짜·ID는 한 번만 사용할 수 있다. 실패 뒤 다시 실행하려면 해당 날짜의 줄을 새 승인으로 교체한다.
5. `systemctl list-timers 'lawdigest-*'`와 `journalctl -u lawdigest-pipeline@bill-ingest.service`에서 예정 시각과 실행 결과를 확인한다. 수집·상태·요약은 `/var/log/lawdigest-pipeline/pipeline-runs.jsonl`도 대조한다. 분야 분류 건수는 journald에서 확인한다. 승인 누락, 부분 실패, 공식 데이터 응답 검증 실패는 7일 성공 기록에 포함하지 않는다.

네 작업은 하나의 잠금을 사용한다. 예정 실행이 겹치면 최대 15분 기다리고, 잠금을 얻지 못하면 실패로 남긴다. 중단 기간의 수집은 승인된 기간을 지정해 별도로 실행한다. timer를 정지할 때는 대상 이름을 지정해 `sudo systemctl disable --now lawdigest-bill-ingest.timer`처럼 실행한다.

---

## 4.1 중단 기간 분야 분류 백필

2026-11-03 KST에 운영 DB의 제22대 미분류 4,751건을 읽기 전용으로 확인했다. 모두 공개 상태(READY)였으며 분야 값은 NULL이었다.

| 판정 근거 | 법안 수 | 처리 |
| --- | ---: | --- |
| 소관위원회 규칙 | 4,114 | 아래 명세의 일회성 백필 후보 |
| 법안명 또는 제목 키워드 | 296 | 분야를 검토한 뒤 별도 승인 범위에 넣는다 |
| 적용 가능한 규칙 없음 | 341 | 소관위원회 근거 또는 별도 분야 판정 필요 |

내용 규칙의 '의원'이 제주특별법 개정안을 보건·의료로 분류한 사례가 있었다. 아래 일회성 백필에는 대조한 판정만 사용했다. 신규 timer 런타임은 `--verified-only`로 공개 상태가 READY인 법안에 소관위원회 규칙과 검토된 법률명 예외를 적용한다. 근거가 부족한 건은 NULL로 남겨 검토하고, 조회와 저장 사이에 원천이 바뀐 건은 다음 실행에서 다시 판정한다.

- 서버의 검증 산출물은 `/tmp/lawdigest-category-audit.owgotyCy/`에 있다. `committee-4114.json`의 SHA-256은 `b393c6bdf5c8424829611b8553b37ae1998e74cae78776a55a6e597cc062f876`이다. `apply-committee-categories.py`의 SHA-256은 `f0d9d31d5759ee0c92539f5923384c89f7f8eede1977b66c63e9047ae5bdff99`이다.
- 읽기 전용 실행에서 후보 4,114건의 입력 및 NULL 상태를 검증했다. 격리 MySQL에서 1,001건을 대상으로 원천 변경 및 부분 반영 시 중단, 여러 묶음 쓰기, 재실행, 범위 밖 데이터 보존을 확인했다.
- 실행 승인을 받은 경우 동일한 해시의 산출물로 먼저 읽기 전용 검증을 반복한다. 일치하면 해당 스크립트의 `--execute`를 한 번 실행한 뒤 읽기 전용으로 반영 건수를 확인한다. 소관위원회·법안명·제목, 공개 상태나 대상 수가 달라졌으면 명세를 갱신하고 다시 승인받는다.
- 첫 실행 뒤 예상 잔여는 637건이다. 두 번째 실행까지 반영한 뒤 제22대 미분류 잔여 건수와 분야별 집계를 운영에서 확인한다.

### 2026-11-03 1회 실행 기록

사용자가 승인한 소관위원회 기반 4,114건을 운영 DB에 한 트랜잭션으로 반영했다. 같은 명세를 읽기 전용으로 다시 실행해 4,114건의 반영을 확인했다. 반영 직후 제22대 공개 법안 17,982건 중 분류 17,345건, 미분류 637건이다. 운영 공개 분야별 통계 API의 17개 분야 합계도 17,345건이다. 아래 616건과 21건은 잔여 명세로 묶어 1회 실행 승인을 받는다.

### 공식 소관위원회로 보완한 두 번째 실행

잔여 637건 모두 열린국회정보 의안 상세(BILLINFODETAIL)의 의안 ID와 번호가 일치했다. 소관위원회(JRCMIT_NM)와 분류 규칙을 적용해 616건을 추가 후보로 고정했다. 같은 법률명의 기존 위원회·분류가 일치한 후보 206건은 공식 위원회 분류와도 일치했다. 기존 법률명 대조 결과는 검증에 사용했다. 후보 616건의 분야는 각 의안의 공식 위원회를 기준으로 정했다.

- 같은 서버 경로의 `official-committee-637.jsonl` SHA-256은 `664f4a15d06278525dec4cd5c948350b8d3e519becf95bbbf13a6d6756925f84`이다.
- `official-category-candidates.json` SHA-256은 `067e24ebeb9ef13d606c025ba56ce46c8950ce4a76e6111d16a5bc72f28e8553`이다. 첫 후보 4,114건과 중복이 없다.
- `apply-official-categories.py` SHA-256은 `94b129aee5619a7be16e4b8d4da15f01077aaed1d8b5823fd691c20eb977024f`이다. 운영 읽기 전용 검증이 통과했다. 별도 승인을 받은 뒤 두 번째 실행으로 616건의 분야 값만 채운다.
- 두 후보를 합치면 21건이 남는다. 아래에서 국회 제안이유를 근거로 개별 판정했다.

### 국회 제안이유로 판정한 21건과 통합 실행

열린국회정보 의안 제안이유(BPMBILLSUMMARY)에서 의안 번호와 법안명을 대조했다. `official-summary-21.json` SHA-256은 `9d4bea5371688d3f0ed5c55f24ff79d5659df572f27a65edc1b5d88e573e6367`이다.

| 의안 번호 | 분야 | 판정 근거 |
| --- | --- | --- |
| 2214555, 2214959, 2215180, 2215497, 2215548, 2216352, 2216594, 2216596, 2216681 | 경제·세금 | 한미 전략적 투자 사업의 선정·집행과 공적 투자금의 조달·감독 |
| 2209615, 2209855, 2209957, 2209998, 2210670, 2213229 | 안전·재난·치안 | 대형산불 피해구제, 지역 복구 및 재난 대응 |
| 2215147 | 안전·재난·치안 | 여객기 참사 피해구제 제도에서 피해 공무원의 치유휴직을 보장 |
| 2219338 | 교육 | 학교폭력 상담·조사와 심의에 참여하는 피해학생의 권리 |
| 2201926 | 환경·기후·에너지 | 가뭄 시 수돗물 공급과 상수도 관리 |
| 2215116 | 과학·디지털·AI | 정보통신공사의 배상보험·공제 가입 기준 |
| 2216850 | 일자리·노동 | 일터 괴롭힘 예방, 사용자의 의무와 노무제공자 보호 |
| 2209410 | 정치·행정 | 대통령 궐위에 따른 취임 후 국정 인수 절차 |

세 후보를 합친 통합 실행은 제22대 공개 법안 4,751건의 NULL 분야 값만 채운다. 4,114건을 먼저 반영했으므로 기존 통합 명세는 보존용이다. 남은 637건을 통합해서 실행할 경우 미반영 대상만 다시 고정하고 승인받는다.

- 서버의 `category-4751.json` SHA-256은 `e04c90d399456a8e71ed7e8a678a420259d903cec890170b216711d3dc958cf9`이다. `apply-category-4751.py` SHA-256은 `12ad6f4b16073cf72c27028128a99c6b02f5a4debe9aa3ec8e2ca1907d81af35`이다.
- 운영 읽기 전용 검증으로 4,751건을 확인했다. 격리 MySQL에서 동일 규모의 쓰기, 중간 오류 시 전체 롤백, 재실행과 범위 밖 데이터 보존을 검증했다.
- 남은 대상의 반영 후 승인 목록과 분야별 집계를 읽기 전용으로 대조한다. 기존 후보 4,751건의 미분류 잔여 예상은 0건이다. 이후 들어온 미분류 법안은 집계에서 분리한다.

### 미분류 잔여 637건의 실행 범위

앞서 반영한 4,114건을 제외했다. 공식 소관위원회 기반 616건과 제안이유 검토 21건의 합집합이 운영 DB의 제22대 공개 미분류 목록과 정확히 일치했다. 전체 637건의 분류 값이 NULL이며, 각 법안의 원천 해시도 읽기 전용으로 재검증했다.

- 서버 `remaining-category-637.json` SHA-256은 `4e0c4d587f7e42ded725bd8acc6eddecb8c84d5f2b4d90013d2cc134ee871687`이다.
- 서버 `apply-remaining-category-637.py` SHA-256은 `bf808180c221de844ae04b470aebdb7cacc8e56a041c4049e52676b1bfcf4b36`이다. 4,114건에 사용한 실행기와 동일한 검증·트랜잭션 코드를 사용한다.
- 사용자가 이 637건의 1회 실행을 승인하면 두 파일의 해시와 읽기 전용 검증을 반복하고 `--execute`를 적용한다. 실행 뒤 승인된 ID 전부의 분류 값, 제22대 미분류 집계, 공개 통계의 분류 합계를 대조한다.


### 7월 18일~10월 31일 백필분 2,260건의 분야 분류

승인된 법안 백필 명세와 운영의 제22대 READY 법안 2,260건을 ID·번호·위원회·법안명·제목·제안이유로 대조했다. 2,254건은 소관위원회 규칙으로 분류했다. 나머지 6건은 열린국회정보 의안 상세를 다시 조회해 위원회가 비어 있음을 확인하고 국회 제안이유를 기준으로 판정했다.

| 의안 번호 | 분야 | 판정 근거 |
| --- | --- | --- |
| 2222133 | 과학·디지털·AI | 국제 통신 인프라인 해저통신케이블의 설치·보급과 긴급 복구 |
| 2221973, 2221990, 2222355 | 산업·중소기업 | 초광역권 전략산업 특구 지정과 기업 투자 유치 |
| 2221955 | 경제·세금 | 코로케이션 방식 AI 데이터센터 투자에 대한 통합투자세액공제 |
| 2220134 | 사법·범죄 | 검찰청 폐지에 따른 형사 수사·송치 권한 조정 |

- 서버 산출물은 `/tmp/lawdigest-category-audit.owgotyCy/july-october-2260/`에 있다. `category-2260.json`의 SHA-256은 `46794e356effd6f73d80564fc05032a94dcf8c2dded7cac1c3dd611dc252f5a5`이며, `apply-category-2260.py`는 `ba2b2fea4da97cf29bab727534e87a6112d2eb9274cb2b733f60484bfb2f8ae9`다. 재조회 근거 `official-committee-missing-6.json`은 법안 백필 검증 디렉터리에 있으며 SHA-256은 `15d362ef8841f9cc41dc321f20fe780228d8d6fdb04d6c611122ad6cc73badee`다.
- 기존 분류 적용 4,114건과 기존 잔여 637건의 명세에 ID 중복이 없다. 운영 읽기 전용 점검에서 대상 2,260건의 `category`가 모두 NULL이고 원천 해시가 일치했다.
- 격리 MySQL에서 명세 전체의 반영, 범위 밖 행 보존, 재실행, 부분 반영 및 원천 변경 시 중단, 마지막 UPDATE 실패 시 전체 롤백을 확인했다.
- 사용자 승인 뒤 동시 작업 여부와 해시, 읽기 전용 검증을 다시 확인한다. `--execute`를 한 번 실행해 해당 ID들의 `Bill.category`만 채운다. 실행 뒤 대상별 결과와 운영 분야별 통계를 대조한다.

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
- 먼저 dry_run에서 처리 건수·거절 사유를 확인하고, 필요한 의원 코드가 DB에 있는지 읽기 전용으로 대조한다. 11월 2일 표본 29건의 모의 처리에서 의원 코드 1개가 누락됐다. 별도 승인으로 김형연 의원과 11월 2일 법안 29건을 운영에 반영했다. 공개 통계 API는 20,271건을 반환했고 운영 DB의 최신 발의일은 11월 2일이다. [적재 검증](https://github.com/DigestWorks/LawDigest/pull/157)
- 운영 artifact 해시와 대상 개수·날짜·테이블 범위를 준비한 뒤 쓰기 실행마다 사용자 승인을 받는다. timer 등록도 별도 승인 대상이다.
- 매시간 호출되던 기존 cron은 존재하지 않는 저장소 경로를 가리킨다. timer 활성화 직전에 이 경로가 비어 있음을 다시 확인했다. cron 항목 정리는 별도로 추적한다.
- 원문 적재 뒤 AI 요약·분야·상태/표결·검색 문서 갱신, 운영 화면을 차례로 검증한다. 원문 적재 성공으로 전체 백필 완료를 판정하지 않는다.

상세 증거와 남은 작업은 [W1 수집 선행 복구 검증](../../audit/2026-11-03-w1-ingest-recovery.md)에 기록했다.

## 8. 국회 상태 조회 복구 검증

운영 런타임의 대수만 전달하는 `ALLBILL` 목록 요청은 필수값 누락으로 실패했다. 수정 후보는 접수·계류·처리·표결 목록을 선언 건수까지 읽고 기간 내 날짜가 하나라도 있는 법안의 `ALLBILL` 상세를 의안번호로 요청한다. 상세의 ID·번호·대수를 대조한다. 본회의는 의결일이 있으면 그 날짜를 사용하고 같은 날의 단계는 진행 순서대로 정리한다. [국회 의안정보 통합 API](https://www.data.go.kr/data/15126134/openapi.do)

- 운영과 격리한 소스 복사본으로 국회 API를 읽었다. 11월 2~3일 구간은 후보 67건에서 접수 29건과 위원회 심사 38건을 확인했다.
- 10월 27~28일 구간은 후보 181건에서 접수 112건, 위원회 심사 87건, 본회의 1건, 공포 22건을 확인했다. 본회의·공포 건수는 국회 본회의 표결 목록의 의결일과 공포일 집계와 일치했다.
- 관련 Python 회귀 검사 15건, Ruff 및 sdist·wheel 빌드를 통과했다. 기존 누락 이벤트의 백필과 운영 런타임 반영, timer 등록, 7일 연속 실행 검증은 별도 단계다.

## 9. 제22대 검색 문서 누락 복구

운영 읽기 전용 조회에서 제22대 READY 법안 20,271건 중 검색 문서가 없는 5,365건을 확인했다. 7월 18일 이후 백필 2,289건을 포함하며, 대상 전부에 원문이 있다. 11월 2일 법안 세 건의 정식 제목을 공개 API에서 검색했을 때 첫 페이지에 해당 의안 ID가 없었다.

- 서버 `/tmp/lawdigest-search-index-recovery/`의 `ready-search-missing-5365.json` SHA-256은 `b3b799c7d61047465040ac26161329d76216c717f58e29d7140c75580f5b36b8`이다. `insert-search-documents-5365.py`는 `878dc8b5898a41495b46be4bd1035bad9f97e17191e2618a730902ac11a5e0ae`다.
- 읽기 전용 실행에서 대상의 기존 검색 문서가 없고 원문·제목·AI 요약·수정 시각 해시가 일치함을 확인했다. 기존 검색 문서 생성기를 그대로 사용한다.
- 격리 MySQL에서 운영과 같은 기본 FULLTEXT 인덱스를 사용했다. 문서 5,365건의 정확한 삽입, 원천 변경 시 중단, 마지막 삽입 실패 시 전체 롤백, 기존 문서 보존과 재실행 차단을 확인했다.
- 운영 승인을 받은 뒤 해시, 동시 작업, 읽기 전용 조건을 다시 확인하고 `--execute`를 한 번 실행한다. 쓰기 범위는 신규 검색 문서 5,365행이다. 기존 법안과 검색 문서는 보존한다.
- 별도 검색 결함도 확인했다. 격리 DB에 문서를 넣은 뒤 운영 검색식의 표본 세 건 점수는 양수였으나, 1차 후보의 필수 토큰식은 모두 0이었다. 운영 인덱스는 기본 파서를 사용하고 기존 1차 회귀 환경은 ngram을 사용했다. 정확한 법안명 검색은 운영과 같은 파서에서 별도 검증한다.

### 정상 수집에서 검색 문서 갱신

수정 후보의 `bill-ingest`는 이번 실행에서 저장한 READY 법안의 검색 문서를 같은 트랜잭션에서 갱신한다. 원문과 기존 AI 제목·요약을 보존한 최종 DB 행으로 문서를 만들고, 문서 쓰기가 성공한 뒤 수집 기준점을 저장한다. 별도 재빌드가 후보를 읽은 뒤 수집이 데이터를 변경해도, 재빌드는 저장 직전의 법안 행을 잠금 조회해 문서를 만든다.

격리 MySQL에서 최초 적재, 재수집, 미공개 법안 제외, 별도 재빌드, 검색 문서 및 기준점 쓰기 실패의 전체 롤백을 검증했다. 관련 검사 70건, Ruff 및 패키지 빌드를 통과했다. 기존 5,365건의 백필과 운영 런타임 교체는 별도 승인 범위다.

## 10. timer 등록 전 실행 경로 검증

후보 `23ce415`의 소스와 유닛을 운영 서버의 임시 경로 `/tmp/lawdigest-timer-candidate-23ce415/`에 풀었다. 검사용 서비스 파일의 실행 경로만 임시 래퍼로 바꿔 `systemd-analyze verify`와 달력 계산을 통과했다. 11월 4일 다음 예정 시각은 수집 01:10, 상태 동기화 03:10, AI 요약 05:10, 분야 분류 08:30 KST였다.

- 모의 Python을 호출하는 격리 래퍼에서 승인 파일 누락, 승인 커밋 불일치, 소스 변경, 승인 ID 재사용을 차단했다. 유효한 테스트 승인으로는 정확히 한 번만 호출됐다.
- 후보 CLI에서 DB 연결을 차단한 채 국회 API로 11월 2~3일 `dry_run`을 실행했다. 수집은 29건 처리, 거절 0건, 저장 0건으로 `success`였다. 상태 동기화는 의원 299명과 상태 후보 67건을 확인했고 쓰기는 0건이었다.
- 상태 동기화는 표결 0건을 `skip_upsert_vote_step=empty`로 기록하면서 전체 상태도 `empty`가 됐다. 이 기간에 공식 본회의 표결 기록은 없었다. 표결 조회 실패와 검증된 무표결일을 구분하고 정상 완료가 로그에 남도록 고친 뒤 7일 성공 조건에 적용한다.
- 이 확인 시점의 운영 서버에는 `lawdigest-*` timer가 등록되어 있지 않았다. 검증은 임시 경로와 모의 호출만 사용했다.

### 공식 무표결일과 조회 실패의 구분

상태 동기화는 국회 상태·표결 목록을 검증한 뒤 운영 쓰기 단계로 넘어간다. 실제 표결은 의원별 행과 공식 합계를 대조한다. 합계가 없는 철회·폐기는 표결로 세지 않는다. 공식 목록을 끝까지 확인해 표결이 없으면 `verified_no_changes`를 정상 단계로 기록한다. API 오류와 불일치는 실패로 남긴다.

- 운영 DB 연결을 차단한 CLI에서 11월 1~3일은 상태 후보 67건, 의원 299명, 표결 없음으로 `success`를 기록했다.
- 9월 3일의 같은 CLI는 국회 표결 17건과 정당별 찬성 113행을 대조하고 `success`를 기록했다. 두 실행 모두 운영 쓰기는 0건이었다.
- 관련 회귀 검사 38건, Ruff, sdist·wheel 빌드를 통과했다. 운영 timer의 7일 연속 성공은 등록 후 실행 기록으로 검증한다.

## 수동 보조 작업

아래 작업의 운영 실행과 정기 작업 등록에는 실행별 사용자 승인이 필요하다.

### 법안 주제 태그

`ai-summary`는 운영 실행 뒤 요약이 있고 태그가 없는 최근 14일 법안에 태그를 붙인다. 태그를 저장한 법안의 검색 문서는 같은 단계에서 갱신한다. 태그나 검색 문서 갱신이 실패해도 요약 실행은 실패로 처리하지 않고, `tagging_status`와 `search_status`에 결과를 남긴다.

수동 백필은 저장 없이 결과를 먼저 확인한 뒤 실행한다.

```bash
cd services/ai
python -m scripts.backfill_bill_summary_tags --mode prod --limit 10
python -m scripts.backfill_bill_summary_tags --mode prod --execute
```

수동 백필은 검색 문서를 갱신하지 않는다. 저장 전에 대상 ID를 파일로 남기고, 백필 뒤 그 법안만 갱신한다.

```bash
python -m lawdigest_data.runtime.cli bill-search-rebuild --mode prod --bill-ids-file <ID 파일>
```

### 의원 사진

사진은 수집 파이프라인에 포함되지 않는다. 새 의원이 등록되면 버킷의 `congressman/{대수}/{의원코드}.jpg`와 대조해 누락분을 올린다. 업로드는 덮어쓰지 않는다.

```bash
python services/data/scripts/db/sync_congressman_photos.py
python services/data/scripts/db/sync_congressman_photos.py --execute
```
