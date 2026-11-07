---
title: 법안 검색 문서 정기 갱신
slug: search-document-rebuild
stage: spec
status: accepted
intent: .intent/intent_search-document-rebuild.md
date: 2026-11-07
---

# 법안 검색 문서 정기 갱신 — 명세

## 요구사항

1. `fetch_bill_search_document_candidates`는 `COALESCE(modified_date, created_date) DESC, bill_id DESC`로 정렬한다.
2. `refresh_bill_search_documents`는 200건마다 커밋한다. 수집 트랜잭션이 쓰는 `_refresh_bill_search_documents_cursor`의 원자성은 유지한다.
3. 래퍼에 `bill-search-rebuild` 작업을 추가해 `--mode prod --limit 1000`으로 실행한다. timer는 09:00 KST다.

## 범위 밖

- 내용 해시 비교: 시각 기준은 내용이 같아도 다시 쓰지만 부작용이 없고, 일일 변경량이 작다.
- 운영 전체 재생성과 timer 등록: 별도 승인으로 실행한다.
