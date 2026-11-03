# 법안 질의응답 운영

질의응답은 현재 법안 원문을 대조하는 Python API와 기존 Next 웹의 `/ask`로 제공하며, 전체 인덱스 검증 뒤에 검색 진입점을 노출한다.

- Python API: 루프백 `127.0.0.1:8110`, PM2 `lawdigest-rag`, worker 1개.
- 웹: `/api/qa`가 내부 인증·요청 제한 경계를 연결한다. 브라우저에는 모델·Qdrant 키와 내부 토큰을 보내지 않는다.
- 원문: MySQL의 21·22대 READY 법안 중 요약 원문이 있는 자료. 매 질문에서 읽기 전용 트랜잭션으로 다시 조회한다.
- 검색: 전용 `lawdigest_rag_v1_*` 새 컬렉션과 `lawdigest_rag_active` 별칭. 기존 실험·다른 프로젝트 컬렉션은 변경하지 않는다.
- 운영 DB·Qdrant 쓰기와 timer 등록은 실행 대상별 사용자 승인이 필요하다. PR 머지 승인은 인덱스 구축 승인을 포함하지 않는다.

## 설정과 의존성

`services/ai/rag.env.example`을 비공개 파일에 복사한다. 실행 사용자 소유·권한 600 또는 400으로 보관하고, `RAG_INTERNAL_TOKEN`은 32바이트 이상의 난수로 만든다. Python 3.12 이상의 전용 venv에 `requirements-rag.txt`를 설치한다. Qdrant 1.15 서버에 맞춰 client 1.15 계열을 사용하며 기존 공유 환경을 업그레이드하지 않는다.

기본 임베딩은 [multilingual-E5-small](https://huggingface.co/intfloat/multilingual-e5-small)의 384차원 int8 ONNX 모델이다. 아래 명령은 공개 가중치와 토크나이저만 내려받고 고정 revision·파일 크기·SHA-256을 확인한다. 모델 파일을 Git에 넣지 않는다. 조회·인덱스 구축에는 로컬 CPU를 사용한다.

```bash
python3.12 services/ai/tools/prepare_rag_embedding_model.py --output-dir /absolute/rag-models/e5-small
```

`RAG_EMBEDDING_DIR`에 위 절대 경로를 설정한다. 질문·원문은 같은 모델 revision으로 임베딩한다. 기존 `text-embedding-3-small` 경로를 쓸 때만 `RAG_EMBEDDING_BACKEND=openai`와 그 모델·1536차원을 명시한다. 모델이나 차원을 바꾸면 새 인덱스가 필요하다. 답변 생성은 별도 OpenAI `gpt-5.4-mini` 요청이며 실제 답변 성공을 확인해야 출시할 수 있다.

DB 접속은 필요한 SELECT 권한의 계정을 우선 사용한다. 애플리케이션은 `SET TRANSACTION READ ONLY` 뒤 조회하고 rollback·close한다. 질문·답변은 서비스 DB·앱 로그·브라우저 영구 저장소에 저장하지 않으며 OpenAI Responses 호출은 `store=False`다. 제공자의 API 데이터 취급 정책은 별도로 적용된다.

## 전체 인덱스 준비와 승인

저장소 루트에서 전용 venv와 `RAG_ENV_FILE`을 지정한다. 아래 첫 명령은 DB 읽기와 로컬 스냅샷 저장만 수행한다. 모델 호출과 Qdrant 쓰기는 없다.

```bash
RAG_ENV_FILE=/absolute/private/rag.env PYTHONPATH=services/ai/src \
  /absolute/rag-venv/bin/python services/ai/tools/index_rag_bills.py \
  --snapshot-out /absolute/private/rag-snapshot.json
```

dry_run의 대수별 법안 수·청크 수·모델·SHA-256·새 컬렉션명·별칭 전환 여부를 제시하고 해당 실행 승인을 받는다. 원문 변경이 있으면 다시 스냅샷을 만든다. 기본 E5 경로는 임베딩 원문을 외부 API에 보내지 않는다. 답변을 생성할 때는 질문과 선택된 공개 원문을 생성 모델에 전달한다.

```bash
RAG_ENV_FILE=/absolute/private/rag.env PYTHONPATH=services/ai/src \
  /absolute/rag-venv/bin/python services/ai/tools/index_rag_bills.py \
  --apply --snapshot /absolute/private/rag-snapshot.json \
  --expected-sha256 "$APPROVED_RAG_SHA" --expected-model "$APPROVED_RAG_MODEL" \
  --expected-chunks "$APPROVED_RAG_CHUNKS" --collection "$APPROVED_RAG_COLLECTION" --activate
```

명령은 현재 DB 전체와 스냅샷을 다시 대조한다. 새 컬렉션만 만들고 모든 청크 적재·개수·스키마·모델 검사가 끝난 뒤 별칭을 원자적으로 전환한다. 중간 실패 시 기존 별칭을 유지한다. 실패 컬렉션 삭제도 별도 운영 쓰기 범위로 다룬다. 약 112건만 있는 과거 실험 인덱스는 전체 출시 인덱스로 사용하지 않는다.

## API와 웹 배포

main에 포함된 깨끗한 워크트리에서 실행한다. 기존 서버 체크아웃의 다른 변경을 보존한다.

```bash
RAG_PYTHON_BIN=/absolute/python3.12 RAG_ENV_FILE=/absolute/private/rag.env \
  bash deploy/deploy-rag.sh /absolute/target-worktree
```

스크립트는 release별 소스·venv·resolved 의존성을 보관한다. 루프백에서 인증된 22대 인덱스 상태가 사용 가능한지 확인하고, 실패 시 이전 프로세스 복구를 시도한다. 웹·nginx·DB·인덱스는 변경하지 않는다. API 접근 로그는 끄며 실패 로그에는 예외 종류만 남긴다.

운영 웹 비공개 환경에는 `RAG_ENABLED=true`, `RAG_INTERNAL_URL`, 같은 `RAG_INTERNAL_TOKEN`, `RAG_PUBLIC_ORIGIN=https://lawdigest.kr`를 설정한다. `www` 접속은 정식 도메인으로 리다이렉트되는지 확인한다. nginx가 외부 `X-Real-IP`를 신뢰하지 않고 실제 연결 주소로 덮어쓰는 것을 확인한 뒤 `RAG_TRUST_PROXY_IP=true`를 설정한다. 확인 전에는 익명 요청 전체가 같은 요청 한도를 공유한다. 웹은 [배포 기준](./WEB_DEPLOY_ENVIRONMENTS.md)과 `deploy-prod-web.sh`로 반영한다.

운영에서 키워드 검색 → 질문 진입 → 실제 답변 → 문단 출처 → 상세 → 뒤로 가기 → 후속 질문을 확인한다. 자료 없음·모델 실패·요청 한도·중지·한글 조합 Enter를 각각 확인하고 375px/데스크톱·라이트/다크에서 재현한다. 과거 대수 폐기 상태와 법안·현행법의 구분을 확인한다. 운영 검증이 끝날 때까지 관련 결함은 미해결로 유지한다.

## 한도·갱신·복구

단일 worker 기본 한도는 동시 2건, 클라이언트별 5분 5건, 한국 시간 하루 500건이다. IP는 날짜와 내부 토큰으로 HMAC 처리해 Python에 전달한다. 실패한 생성도 예산에 포함한다. 한도는 프로세스 메모리 기준이며 재시작하면 초기화된다. 여러 worker·복제본을 켤 때는 공유 한도 저장소가 먼저 필요하다.

원문·대수·법안명·발의일이 달라진 검색 청크는 생성 근거에서 제외한다. 상태·결과는 DB에서 매번 읽는다. 새 수집 건수·최신 발의일과 인덱스를 비교해 지연을 표시한다. 이 기준일은 수집된 법안의 발의일이며 모든 처리 상태가 현재 시각과 일치한다는 뜻은 아니다. 원문 갱신 뒤 위 스냅샷·새 인덱스 절차를 반복하며 자동 timer는 별도 승인 전까지 등록하지 않는다.

문제 발생 시 웹 `RAG_ENABLED=false` 후 정식 웹 배포로 진입점을 내린다. 현재 release의 `commit-sha`와 이전 release 경로를 확인하고, 이전 main 포함 커밋의 전용 워크트리에서 같은 배포 스크립트로 복구한다. 인덱스 별칭 복구는 이전 ready manifest·모델·범위를 검증하고 별도 Qdrant 쓰기 승인을 받아 실행한다. release 디렉터리와 기존 컬렉션은 자동 삭제하지 않는다.

## 검증 근거

- [OpenAI 구조화 출력](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Qdrant 1.15 query points](https://api.qdrant.tech/v-1-15-x/api-reference/search/query-points)
- [shadcn MessageScroller](https://ui.shadcn.com/docs/components/radix/message-scroller)

기존 Tailwind 3의 new-york 레지스트리에는 대화 컴포넌트가 없어, CLI로 Radix nova 소스를 확인하고 import·선택자를 현재 테마에 맞췄다. `@shadcn/react`가 스크롤 동작을 맡으며 별도 스크롤 계산기를 만들지 않는다.
