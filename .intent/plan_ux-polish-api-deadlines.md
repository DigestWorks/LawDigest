---
stage: plan
status: accepted
date: 2026-11-03
---

격리 HTTP 응답으로 6초 지연 및 4xx 자동 재시도를 재현한다. 공통 Axios와 공개 상세 조회에 제한을 적용하고 QueryClient 재시도 규칙을 설정한다. 요청 수, 오류 안내, 수동 재시도와 정상 복구를 확인한다.
