---
slug: rag-agent-chat
stage: plan
status: accepted
date: 2026-11-10
---

# RAG 검색과 에이전틱 채팅 구현 계획

## 구현 순서
1. schemas/chatbot에 검색 응답과 공통 출처 검증을 추가한다.
2. agent 모듈에 제한된 모델 결정 루프와 검색/조회 도구를 구현한다. Codex 생성기에 스키마 선택과 취소를 연결한다.
3. FastAPI 및 Next 프록시에 검색과 채팅 경로, SSE 상태 전송, 취소 전파를 추가한다.
4. 웹 계약·대화 hook·/ask에 검색 선택과 실행 상태를 연결한다.
5. 원문 변경·대수 범위·조회 권한·도구 횟수·취소·불완전 스트림을 검증하고 린트·타입검사·빌드를 수행한다.

```mermaid
flowchart LR
  Contract[계약과 검색] --> Runtime[에이전트 실행]
  Runtime --> API[API와 스트림]
  API --> UI[검색과 채팅 화면]
  UI --> Test[검증과 전달]
```

## 검증
Python RAG 회귀 및 실제 로컬 Qdrant 테스트, 웹 RAG 프록시/스트림/hook/화면 테스트, ESLint, TypeScript, Next 빌드. 모델·운영 서비스 연결은 별도 실행 여부와 결과를 기록한다.

## 근거
- Expresso services/backend/src/platform/agent/runtime.ts, modules/agent-chat/service.ts 및 routes.ts, 웹 useAgentConversation.ts.
- https://learn.chatgpt.com/docs/developer-commands#codex-exec
- https://fastapi.tiangolo.com/advanced/custom-response/#streamingresponse
- https://ui.shadcn.com/docs/components/radix/toggle-group

## 검증 결과 (2026-11-10)
- Python RAG: 66 passed, 1 skipped. 실제 E5 파일을 요구하는 테스트는 모델 파일 부재로 건너뛰었다. 실제 로컬 Qdrant 검색, 허용된 법안 조회, 원문 변경, 조회 예산, 출처 검증, 실제 프로세스 취소, 첫 프레임 전 연결 종료와 슬롯 해제를 포함한다.
- 웹: RAG 프록시·SSE 파서·대화 hook·IME 화면 테스트 31개 통과. ESLint(기본 경로와 hooks/store), TypeScript 검사, Next 프로덕션 빌드 통과.
- 실제 Codex 모델: 행동 선택 스키마 검증과 로컬 테스트 원문에 대한 검색 → 원문 추가 조회 → 출처가 있는 답변을 확인했다. DB와 임베딩은 테스트 fixture, 벡터 검색은 Qdrant local이다.
- 브라우저: 프로덕션 빌드와 로컬 API에서 검색 → 후속 채팅 → 중지 → 재시도 완료를 확인했다. 운영 자료로 검증한 결과가 아니다.
- 운영 서버·운영 인덱스는 변경하지 않았다. 운영 반영은 Python API와 웹을 함께 배포한 뒤 실제 인덱스로 확인해야 한다.

## 직접 확인
RAG가 연결된 환경에서 `/ask` → 법안 검색 → 관심 주제 입력 → AI 채팅으로 전환 → “그 법안의 제안 내용을 설명해 주세요” 입력. 단계별 실행 상태·답변 출처·원문을 확인한다. 다음 질문을 시작한 뒤 중지하고 다시 시도하여 동일 질문의 응답이 복구되는지 확인한다.

## 검색바 통합과 실제 데이터 연결
1. 운영 인덱스 상태를 확인하고 SSH 터널·로컬 E5로 실제 DB와 Qdrant의 읽기 전용 연결을 구성한다.
2. 검색바 공통 상태와 요청 전달을 구현하고 헤더·모바일 검색바에 검색 방식·전송·중지를 연결한다. /ask는 기존 중복 입력을 제거한다.
3. 질문의 URL·최근 기록 미저장, 한글 IME, 중복 전송 방지, 취소·재시도와 실제 검색·채팅을 검증한다.

## 실제 데이터 연결과 검색바 통합 검증
- 실제 22대 인덱스 20,453건, 원본 DB 20,667건을 읽기 전용으로 연결했다. DB 최신 발의일은 2026-11-09, 인덱스 최신 발의일은 2026-11-02이며 갱신 지연은 [이슈 #263](https://github.com/DigestWorks/LawDigest/issues/263)에 기록했다.
- 고정 E5 파일 해시를 확인하고 실제 CPU 임베딩 테스트까지 실행했다. Python RAG 테스트 69개 모두 통과, 건너뜀 없음.
- 웹 검색바 요청 전달·IME·StrictMode·중복 전송 방지·URL/최근 기록 미저장·SSE 등 43개 통과. ESLint, TypeScript, Next 프로덕션 빌드 통과.
- 실제 데이터 브라우저 검색에서 주거기본법·주거급여법 등 5건을 반환했다. 실제 생성 모델로 초기 검색 → 원문 조회 → 추가 검색 → 원문 조회 → 출처 5건이 연결된 답변을 확인했다. 법안 상세와 뒤로 가기 후 대화 보존도 확인했다.
- 실제 질의 중 간헐적 CodexGenerationError가 발생했다. 같은 질의의 재현 실행은 완료됐다. 조회 판단 호출이 실패했을 때 검증된 자료가 있으면 그 범위에서 답변하고 한계를 표시하도록 보완했으며, 오류 분류와 UI의 모델 오류 표시를 추가했다.
- 데스크톱 상단과 390px 모바일 하단 검색바를 확인했다. 뷰포트 재정의를 해제하고 사용자 미리보기 탭을 유지했다.
- 비공개 설정·SSH 터널·로컬 실행 프로세스만 구성했다. 운영 API·인덱스 변경과 운영 웹 배포는 수행하지 않았다.

현재 직접 확인: 미리보기 검색바를 누른 뒤 키워드/의미 검색/AI 채팅을 선택하고 입력한다. `/ask`에는 별도 입력 폼이 없으며 같은 검색바에서 후속 질문과 중지를 수행한다.
