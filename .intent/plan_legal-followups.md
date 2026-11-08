---
title: 약관·처리방침 접근 경로와 개정 이력
slug: legal-followups
stage: plan
status: accepted
intent: .intent/intent_legal-followups.md
spec: .intent/spec_legal-followups.md
date: 2026-11-08
---

# 약관·처리방침 접근 경로와 개정 이력 — 구현 계획

## 바뀌는 파일

| 파일 | 무엇을 |
|---|---|
| `services/web/constants/legal.ts` | 문서별 `kind`, 시행일, `history` |
| `services/web/constants/legalArchive.ts` (새로) | 보관 버전 저장소와 개정 절차 주석 |
| `services/web/components/Legal/LegalDocument.tsx` | 문서별 시행일, 개정 이력 섹션, 이전 버전 표시 |
| `services/web/components/Legal/LegalDocument.test.tsx` | 이력 섹션과 이전 버전 표시 검사 |
| `services/web/app/terms/[version]/page.tsx` (새로) | 이전 약관 열람 |
| `services/web/app/privacy/[version]/page.tsx` (새로) | 이전 처리방침 열람 |
| `services/web/app/mypage/components/UserInfo/AccountActions.tsx` | 두 문서 링크 |
| `services/web/app/ask/AskClient.tsx` | 국외 전송 안내와 링크 |

## 작업 순서

1. 데이터 구조 변경과 보관 저장소 — `tsc` 통과
2. `LegalDocument` 이력·이전 버전 표시와 테스트 — 테스트 통과
3. 버전 라우트 — 없는 시행일 404
4. 마이페이지·질의응답 링크 — 화면 확인
5. 검증 — lint, tsc, test, 브라우저

## 가장 위험한 단계

3단계 버전 라우트. `dynamicParams = false`와 빈 `generateStaticParams` 조합이 빌드에서 문제를 일으킬 수 있다. `next build`로 확인하고, 문제가 있으면 `dynamicParams`를 두고 페이지에서 `notFound()`만 쓴다.

## 검증

```
cd services/web
npm run lint
npx tsc --noEmit
npm run test
npx next build
```
