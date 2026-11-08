---
title: 잘못 저장된 법안 제목 수리
slug: repair-bill-titles
stage: spec
status: accepted
intent: .intent/intent_repair-bill-titles.md
date: 2026-11-07
---

# 잘못 저장된 법안 제목 수리 — 명세

## 요구사항

1. `is_summary_heading`은 앞 기호(`■` 등), 번호(`1.`, `가.`), 괄호, `대안의`, `제안이유`·`주요내용` 조합, 끝 콜론을 소제목으로 판정한다. 내용이 이어지는 문장은 소제목이 아니다.
2. `_derive_title`은 소제목 줄을 건너뛴다.
3. `repair_bill_titles.py`는 AI 요약이 없고 제목이 소제목인 법안을 원문 첫 내용 줄로, 제목이 `error`인 법안을 정식 법안명으로 바꾼다.
4. 저장은 `--execute`에서만 하고, 조회 뒤 제목이 바뀐 행은 건너뛴다. 저장한 법안의 검색 문서를 갱신한다.

## 범위 밖

- AI 요약이 있는 법안의 제목 재생성
