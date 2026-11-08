---
title: 잘못 저장된 법안 제목 수리
slug: repair-bill-titles
stage: plan
status: accepted
intent: .intent/intent_repair-bill-titles.md
spec: .intent/spec_repair-bill-titles.md
date: 2026-11-07
---

# 잘못 저장된 법안 제목 수리 — 구현 계획

| 파일 | 무엇을 |
|---|---|
| `services/data/src/lawdigest_data/core/WorkFlowManager.py` | 소제목 판정, 제목 후보에서 제외 |
| `services/data/scripts/db/repair_bill_titles.py` | 저장된 제목 수리 |
| `services/data/tests/test_workflow_manager.py`, `test_repair_bill_titles.py` | 판정, 수리 계획, 저장 조건 |

## 검증

- 단위 테스트
- 운영 저장 없는 실행: 2026-11-07 대상 152건(소제목 115, `error` 37)
- 실행 뒤 대상 0건과 화면의 법안 제목을 확인한다.
