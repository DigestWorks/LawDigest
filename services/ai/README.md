# lawdigest-ai

Lawdigest의 AI 가공 파이프라인 코드다. 법안 요약, provider batch 처리, RAG 챗봇, 에이전트 기반 법안 리포트 생성을 포함한다.

## 주요 구성

| 경로 | 역할 |
| --- | --- |
| `src/lawdigest_ai/processor/` | 법안 요약, provider 처리, 에이전트 리포트 생성 |
| `src/lawdigest_ai/processor/agentic_bill_report.py` | Codex MCP 에이전트 기반 법안 리포트 생성 |
| `src/lawdigest_ai/processor/law_open_api_terms.py` | 법제처 Open API 법령용어 정의 클라이언트 |
| `src/lawdigest_ai/processor/legal_term_glossary.py` | 법제처 API 조회 결과와 정적 보조 사전을 합치는 프롬프트 컨텍스트 |
| `src/lawdigest_ai/rag/` | RAG 챗봇과 벡터 검색 |
| `tests/` | AI 서비스 단위 테스트 |

## 법안 질의응답

`rag/api.py`의 내부 FastAPI와 웹 `/ask`를 연결한다. 답변 문단의 출처 ID를 검사하고, 검색된 원문을 현재 DB와 대조한다. 근거가 없으면 생성 호출을 건너뛰고 자료 부족 상태를 반환한다. 모델 오류와 불완전한 답변은 오류 상태로 전달한다.

Python 3.12 이상의 전용 HTTP 환경은 `requirements-rag.txt`, 패키지 추가 의존성은 `pip install '.[rag]'`를 사용한다. 기본 임베딩은 서버 CPU에서 실행하는 384차원 E5-small이며, 답변 생성은 별도 모델을 사용한다. [운영 배포·모델 준비·인덱스 승인·복구 절차](../../deploy/PROD_RAG_DEPLOY.md)를 따른다. API·화면 코드의 구현과 운영 출시 확인은 별도로 기록한다. 과거 `tools/update_vector_db.py`의 실험 기본값은 출시 인덱스에 사용하지 않는다.

```bash
PYTHONPATH=services/ai/src:services/ai pytest services/ai/tests/rag -q
```

## RAG 검색과 에이전틱 채팅

데스크톱 상단·모바일 하단의 검색바에서 **키워드·의미 검색·AI 채팅**을 선택한다. 의미 검색과 채팅 입력은 메모리 상태로 `/ask`에 전달되며 URL이나 최근 검색 기록에 저장하지 않는다. `/ask`는 결과·대화를 표시하고 검색바가 다음 입력과 중지를 맡는다. 의미 검색은 검증된 원문을 바로 반환한다. 채팅은 초기 검색 후 모델이 검색어 변경·원문 추가 조회·답변 중 다음 행동을 선택한다. 추가 도구는 최대 3회, 근거는 최대 8건이며 최종 답변의 출처 ID를 검증한다.

- `POST /v1/search` ↔ `/api/qa/search`: 기존 질문 계약으로 검색 결과를 반환한다. 생성 모델을 호출하지 않는다.
- `POST /v1/chat` ↔ `/api/qa/chat`: SSE `step` 이벤트로 실행 상태를 갱신하고 `answer` 이벤트로 검증 완료 답변을 전달한다. 실패는 `error` 이벤트이며 불완전한 답변을 표시하지 않는다.
- `POST /v1/answers`와 `/api/qa`: 기존 단일 검색 질의응답을 유지한다.

`rag/agent.py`는 Expresso의 `platform/agent/runtime.ts`, `modules/agent-chat/service.ts`, `routes.ts`에서 런타임과 도구 경계, 동일 ID 상태 갱신, 취소 전파 구조를 가져와 Python 서비스에 적용했다. 모델 연결은 기존 Codex 생성기를 사용한다. 셸·파일 도구를 모델에 제공하지 않으며 원문 조회는 현재 요청에서 확보한 법안으로 제한한다. Expresso 저장소는 변경하지 않는다.

다음 행동 선택 호출 25초, 최종 답변 호출 30초(시간 초과 시 남은 예산으로 한 번 재시도), 요청 전체 시간 예산 110초, 웹 프록시 120초를 사용한다. 중지·연결 종료는 모델 프로세스까지 전파된다. 이미 실행 중인 DB/벡터 조회는 해당 클라이언트의 타임아웃 안에 끝나며, 종료 전까지 동시 요청 슬롯을 유지한다. 대화는 브라우저 메모리에만 보존한다. Python API와 웹을 함께 배포해야 신규 경로가 동작한다. 운영 배포 절차는 위 RAG 운영 문서를 따른다.

질문 속 의원·정당은 서버가 DB 이름 목록(10분 캐시)과 대조해 찾는다(`rag/entities.py`). 어절마다 조사·호칭('의원', '이/가', '의' 등)을 뗀 형태로 대조하고, 두 글자 이름은 호칭이 붙었거나 질문 전체가 이름일 때만 인정한다. 정당 줄임말은 '민주당', '국힘'만 받는다. 의원이 있으면 첫 단계에서 `Congressman`·`Party` 프로필과 `RepresentativeProposer`의 최근 대표발의 법안을 최대 6건(두 사람이면 각 4건), 정당이 있으면 의석 수·지도부와 발의 당시 그 정당 소속 의원의 대표발의 법안을 최대 6건(두 정당이면 각 3건) 읽기 전용으로 가져와 근거로 삼는다. 프로필·정당 정보는 답변 생성 문맥 `members`·`parties`로만 넘기고 출처는 법안만 쓴다. 조회한 법안이 없으면 의미 검색으로 넘어간다. 웹 계약을 지키려고 이 단계의 SSE 이름은 `search`다.

추가 조회를 결정하는 모델 호출이 실패했을 때 이미 검증한 근거가 있으면 그 범위에서 최종 답변을 시도하고 제한된 조회임을 표시한다. 근거가 없거나 최종 답변 검증이 실패하면 오류로 종료한다. 서버 로그에는 예외 종류·실패 분류만 남긴다.

로컬 실제 데이터 미리보기는 `.runtime/rag-real/service.env`의 비공개 설정과 루프백 SSH 터널을 사용한다. DB·Qdrant는 서버의 기존 자료를 읽고, 고정 revision·해시를 검증한 E5 파일은 `.runtime/rag-real/e5`에서 실행한다. API는 `127.0.0.1:8118`, 웹은 `127.0.0.1:3017`이다. 이 설정·인증 정보·모델 파일은 Git에 포함하지 않는다. 운영 서비스와 인덱스는 변경하지 않으며 `lagging` 상태를 화면에 표시한다.

## 에이전트 기반 법안 리포트

자세한 운영 문서는 아래를 기준으로 본다.

- [에이전트 기반 법안 리포트 생성 파이프라인](../../docs/ai/bill-report-agent-pipeline.md)
- [법안 리포트 프롬프트·검증 계약](../../docs/ai/bill-report-agent-prompt-contract.md)
- [korean-law MCP와 법제처 용어 API 적용 현황](../../docs/ai/korean_law_mcp_integration.md)

기본 실행 예:

```bash
PYTHONPATH=services/data/src:services/ai/src python -m lawdigest_data.runtime.cli \
  ai-summary \
  --mode dry_run \
  --read-mode prod \
  --limit 3 \
  --target passed \
  --concurrency 3 \
  --output-dir /tmp/lawdigest-bill-agent-reports
```

## 주요 환경변수

| 환경변수 | 설명 |
| --- | --- |
| `ASSEMBLY_API_KEY` | 열린국회정보 계열 MCP 서버용 API 키 |
| `LAW_OC` | 법제처/국가법령정보센터 Open API 키 |
| `KOSIS_API_KEY` | KOSIS 통계 API 키 |
| `--codex-model` | 테스트 환경의 법안 리포트 생성 모델 지정. 운영은 `gpt-6.1-terra` |
| `BILL_AGENT_CODEX_TIMEOUT_SECONDS` | Codex 세션 timeout. 기본값은 900초 |

## 테스트

```bash
PYTHONPATH=services/ai/src pytest services/ai/tests -q
```

에이전트 리포트만 확인할 때:

```bash
PYTHONPATH=services/ai/src pytest services/ai/tests/processor/test_agentic_bill_report.py -q
```
