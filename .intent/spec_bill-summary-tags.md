---
title: 법안 주제 태그 생성과 의원 사진 동기화
slug: bill-summary-tags
stage: spec
status: accepted
intent: .intent/intent_bill-summary-tags.md
date: 2026-11-07
---

# 법안 주제 태그 생성과 의원 사진 동기화 — 명세

## 요구사항

- [ ] 대상은 `READY`, 요약 있음, `summary_tags IS NULL`, 최근 N일(기본 14) 법안이다.
- [ ] 저장은 `summary_tags IS NULL`일 때만 하며 다른 컬럼을 바꾸지 않는다.
- [ ] 검증을 통과한 태그가 없으면 저장하지 않는다.
- [ ] 기본 실행은 쓰기를 하지 않는다.
- [ ] 운영 요약 실행의 태그 단계 실패는 요약 결과를 실패로 만들지 않는다.
- [ ] 사진 동기화는 기존 객체를 덮어쓰지 않고, JPEG가 아니면 올리지 않는다.

## 설계

`lawdigest_ai/processor/bill_tags.py`를 새로 만든다. `CodexBillReportAgent.build_command`와 `build_environment`, `_extract_json_object`, `get_db_connection`을 재사용한다. 입력은 `bill_name`, `title`, `gpt_summary` 앞부분이고, 10건씩 한 번에 생성한다.

`services/ai/scripts/backfill_bill_summary_tags.py`는 `backfill_bill_category`와 같은 형식의 수동 실행 명령이다. `_run_agentic_bill_report`는 `mode == "prod"`일 때 같은 함수를 호출하고, 결과를 별도 단계로 기록한다.

`services/data/scripts/db/sync_congressman_photos.py`는 표준 라이브러리와 `oci` CLI만 쓴다. 공개 의원 목록을 읽고, 공개 URL로 존재를 확인하고, `ALLNAMEMBER`의 `NAAS_PIC`에서 받아 `--no-overwrite`로 올린다.

## 버린 대안

- 리포트 JSON에 `tags` 추가: 이미 요약된 법안은 그 경로를 타지 않아 프롬프트가 둘이 된다. 표현이 갈라지면 `GROUP BY tag` 집계가 약해진다.
- 사진 동기화 타이머 등록: 버킷 쓰기 자격 증명과 실행별 승인 경로가 늘어난다.

## 함정

- `TrendingKeywords`는 `/search/{keyword}`로 연결하고, 검색은 2자 미만을 거부한다.
- `update_bill_summary(preserve_existing=True)`는 요약이 있는 법안을 거부하므로 재사용할 수 없다.
- 정기 타이머는 고정 체크아웃(`pipeline-summary-0b03e79`)과 revision에 묶인 승인으로 돈다. 머지만으로 반영되지 않는다.
- 공개 API 키 없이 `ALLNAMEMBER`를 부르면 5건만 반환한다. 이름으로 좁혀 조회한다.
