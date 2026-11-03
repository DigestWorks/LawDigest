---
title: 역대 의원 보완 조회 구현과 확인
slug: ingest-historical-proposers
stage: plan
status: accepted
date: 2026-11-03
---

공식 발의자 파서의 매칭 실패에 한해 열린국회정보 역대 의원 API를 호출한다. 완전한 결과만 검증하고 수집 실행 안에서 확인된 코드 조회를 재사용한다. 일치·잘림·오류·모호한 응답의 회귀를 확인한 다음 운영 DB 연결을 차단하고 실제 7건을 다시 처리한다.
