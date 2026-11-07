---
title: 인기 키워드 검색 연결
slug: tag-search-documents
stage: plan
status: accepted
intent: .intent/intent_tag-search-documents.md
spec: .intent/spec_tag-search-documents.md
date: 2026-11-07
---

# 인기 키워드 검색 연결 — 구현 계획

| 파일 | 무엇을 |
|---|---|
| `services/data/src/lawdigest_data/bills/search_document.py` | 태그를 검색 문서에 추가 |
| `services/data/src/lawdigest_data/connectors/DatabaseManager.py` | 갱신 시 `summary_tags` 조회 |
| `services/data/src/lawdigest_data/core/WorkFlowManager.py` | ID 지정 갱신 메서드 |
| `services/data/src/lawdigest_data/runtime/pipeline.py`, `runtime/cli.py` | 태그 단계 갱신, ID 파일 옵션 |
| `docs/` | 런북과 파이프라인 문서 |

## 검증

- `test_bill_search_document.py`, `test_database_manager_logic.py`, `test_pipeline_runtime.py`의 새 테스트
- 운영에서 태그 법안 문서를 갱신한 뒤 인기 키워드 12개의 검색 결과를 확인한다.
