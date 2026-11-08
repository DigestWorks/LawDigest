---
title: 인기 키워드 검색 연결
slug: tag-search-documents
stage: spec
status: accepted
intent: .intent/intent_tag-search-documents.md
date: 2026-11-07
---

# 인기 키워드 검색 연결 — 명세

## 요구사항

1. `build_bill_search_document`는 `summary_tags`(JSON 문자열 또는 목록)를 `search_text`에 제목과 같은 가중치인 2회 넣는다. 형식이 잘못된 값은 무시한다.
2. `_refresh_bill_search_documents_cursor`는 컬럼이 있을 때 `summary_tags`를 읽는다.
3. `_tag_recent_bills`는 `tags_by_bill`의 법안 문서를 갱신하고 `search_status`, `search_rebuilt`를 기록한다. 실패하면 `search_status: failed`와 `search_error`를 남기고 실행은 성공으로 둔다.
4. `bill-search-rebuild --bill-ids-file`은 파일의 법안만 갱신한다. 옵션이 없으면 기존 동작을 유지한다.

## 범위 밖

- 기존 재빌드 대기열 29,441건 해소와 정기 재빌드 등록
- 백엔드 검색 쿼리 변경
