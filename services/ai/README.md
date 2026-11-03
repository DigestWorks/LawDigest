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
