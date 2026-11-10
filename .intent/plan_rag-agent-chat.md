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
