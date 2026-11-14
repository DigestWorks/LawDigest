# 작업 트리

- 갱신: 2026-11-14 17:27
- 진행률: 100%

- [x] T1 범위 확정(독립 라우트, 이전 명칭 합산, staging 검증)
- [x] T2 intent·spec·plan
- [x] T3 백엔드 위원회 API
  - [x] T3.1 `/v1/committee/list`·`detail`·`bill`
  - [x] T3.2 없는 위원회 404
  - [x] T3.3 통계 탭 위원회 집계 합산
- [x] T4 staging 백엔드(`deploy-staging-backend.sh`, `:8090`)
- [x] T5 웹 `/committee` 목록
- [x] T6 웹 `/committee/[name]` 상세(집계·위원 반원·소관 법안)
- [x] T7 진입 링크(법안·의원·통계·탐색)·사이트맵
- [x] T8 검증(린트·타입·테스트·빌드·화면) ← 현재

## 열린 결정

- D1 staging 컨테이너·서버 워크트리 유지 여부 — 권장: PR 머지 전까지 유지
