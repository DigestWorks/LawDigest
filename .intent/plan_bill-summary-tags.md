---
title: 법안 주제 태그 생성과 의원 사진 동기화
slug: bill-summary-tags
stage: plan
status: accepted
intent: .intent/intent_bill-summary-tags.md
spec: .intent/spec_bill-summary-tags.md
date: 2026-11-07
---

# 법안 주제 태그 생성과 의원 사진 동기화 — 구현 계획

## 바뀌는 파일

| 파일 | 무엇을 |
|---|---|
| `services/ai/src/lawdigest_ai/processor/bill_tags.py` | 태그 생성, 검증, 저장 |
| `services/ai/scripts/backfill_bill_summary_tags.py` | 수동 백필 명령 |
| `services/ai/tests/processor/test_bill_tags.py` | 검증, 파싱, dry-run, 저장 조건 테스트 |
| `services/data/src/lawdigest_data/runtime/pipeline.py` | 운영 요약 뒤 태그 단계 호출 |
| `services/data/scripts/db/sync_congressman_photos.py` | 사진 동기화 |
| `services/data/tests/test_sync_congressman_photos.py` | 누락 판별과 업로드 조건 테스트 |
| `docs/ai/bill-report-agent-pipeline.md`, `docs/ai/bill-report-agent-prompt-contract.md` | 태그 단계 설명 |
| `docs/data/법안 데이터 파이프라인/pipeline_restart_runbook.md` | 수동 실행 절차 |

## 작업 순서

1. 태그 모듈과 테스트 — pytest 통과
2. 백필 명령과 파이프라인 연결 — 기존 데이터 테스트 통과
3. 사진 스크립트와 테스트 — dry-run 누락 0건
4. PR 머지 — 필수 검사 통과
5. 운영에서 10건 dry-run 확인 후 14일 백필 실행 — API와 탐색 화면 확인

## 가장 위험한 단계

운영 백필의 태그 품질이다. 먼저 10건을 쓰기 없이 확인한다. 되돌리기는 저장 전 대상 `bill_id` 목록을 기록해 두고, 해당 법안의 `summary_tags`를 `NULL`로 되돌린다.

## 검증

- `services/ai`: `pytest tests/processor/test_bill_tags.py`
- `services/data`: `pytest tests/test_sync_congressman_photos.py`
- 운영: `curl https://api.lawdigest.kr/v1/bill/trending-keywords?size=12`
