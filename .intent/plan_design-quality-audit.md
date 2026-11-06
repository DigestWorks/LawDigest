---
title: 운영 화면 디자인 품질 결함 수정
slug: design-quality-audit
stage: plan
status: accepted
date: 2026-11-06
---

# 작업 순서

```mermaid
flowchart TD
  A["1단계: 전역 줄바꿈과 요약 마스크, globals.css"]:::risk --> B["2단계: 내비와 헤더, Nav, mobile-floating-nav.css, Header, ThemeSwitchButton"]
  B --> C["3단계: 발의자 표시, Bill, ProposerList, proposerText"]
  C --> D["4단계: 상세 패널, ProgressStage, BillDetail, AnotherBill"]
  D --> E["5단계: 프로필, CongressmanDetail, PartyLogo, PartyCongressmanItem"]
  E --> F["6단계: 타임라인, TimelineEntries, ListContainer"]
  F --> G["7단계: 탐색, 분야, 소개, 로그인, 푸터"]
  G --> H["8단계: 린트, 테스트, 프로덕션 빌드, 390px과 1440px과 다크 화면 비교"]
  classDef risk stroke:#c00,stroke-width:2px
```

# 가장 위험한 단계

1단계는 모든 화면에 영향을 준다. 긴 영문·숫자 문자열과 좁은 열에서 넘침이 생길 수 있다. 전 경로의 `scrollWidth`를 측정해 확인하고, 문제가 있으면 전역 규칙을 제목과 본문 선택자로 좁힌다.

# 검증

- `npm run lint`, `npm test`, `npm run build`
- 로컬 프로덕션 서버를 운영 API에 연결하고 `view_count` PATCH를 차단한 뒤 전 경로를 1440px, 390px, 다크 모드로 캡처한다.
