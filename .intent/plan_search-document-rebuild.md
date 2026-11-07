---
title: 법안 검색 문서 정기 갱신
slug: search-document-rebuild
stage: plan
status: accepted
intent: .intent/intent_search-document-rebuild.md
spec: .intent/spec_search-document-rebuild.md
date: 2026-11-07
---

# 법안 검색 문서 정기 갱신 — 구현 계획

| 파일 | 무엇을 |
|---|---|
| `services/data/src/lawdigest_data/connectors/DatabaseManager.py` | 정렬 변경, 묶음별 커밋 |
| `deploy/pipeline/` | 래퍼 작업, timer, 설치 목록 |
| `services/data/tests/test_database_manager_logic.py` | 묶음 커밋과 정렬 테스트 |
| `docs/data/법안 데이터 파이프라인/pipeline_restart_runbook.md` | 일정과 운영 규칙 |

## 검증

- 관련 테스트와 `bash -n`으로 래퍼 문법을 확인한다.
- 운영 반영 후 내용이 다른 문서 수와 대기 건수를 다시 조회한다.
