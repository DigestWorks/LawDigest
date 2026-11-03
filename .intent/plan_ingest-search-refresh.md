---
stage: plan
status: accepted
date: 2026-11-03
---

정상 upsert에서 누락되는 검색 문서와 별도 재빌드 경로를 확인한다. 기존 생성기와 upsert SQL을 공유하고 정상 수집 트랜잭션에 연결한다. 격리 MySQL에서 최초 적재, 재수집 시 기존 AI 보존, 검색 문서 갱신, 실패 시 기준점을 포함한 롤백을 검증한다.
