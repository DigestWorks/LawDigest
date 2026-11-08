---
title: 약관·처리방침 접근 경로와 개정 이력
slug: legal-followups
stage: spec
status: accepted
intent: .intent/intent_legal-followups.md
date: 2026-11-08
---

# 약관·처리방침 접근 경로와 개정 이력 — 명세

## 요구사항

- [ ] `AccountActions`에 `/terms`, `/privacy` 링크가 있다.
- [ ] `AskClient`의 `question-help`에 OpenAI(미국) 전송 안내와 `/privacy#overseas` 링크가 있다.
- [ ] `LegalDocumentData`가 문서별 `effectiveDate`, `effectiveDateTime`, `history`를 가진다. 공용 `LEGAL_OPERATOR.effectiveDate`는 쓰지 않는다.
- [ ] `LegalDocument`가 조항 뒤에 `id="history"` 개정 이력 섹션을 그리고 목차 마지막에 넣는다.
- [ ] 이력 항목 중 보관 버전이 있는 시행일은 `/{kind}/{dateTime}` 링크, 현재 버전은 "현재 버전" 표시다.
- [ ] `app/terms/[version]`, `app/privacy/[version]`이 보관 버전을 그리고 없으면 `notFound()`다. 보관 버전 화면은 현재 버전 링크를 보여 주고 `noIndex`다.

## 설계

- 재사용: `LegalDocument`, `getMetadata(noIndex)`, `Layout`, `components/ui/button`.
- `constants/legal.ts`: 문서 데이터에 `kind: 'terms' | 'privacy'`, `effectiveDate`, `effectiveDateTime`, `history: { effectiveDate, effectiveDateTime, summary }[]`(최신순)를 더한다. 현재 버전은 `history[0]`과 같은 시행일이다.
- `constants/legalArchive.ts`(새로): `LEGAL_ARCHIVE: Record<kind, Record<dateTime, LegalDocumentData>>`와 `getArchivedDocument(kind, dateTime)`. 개정 절차를 파일 머리 주석에 적는다: 현재 객체를 이 파일로 옮기고, `legal.ts`에 새 본문·시행일·이력 항목을 추가하고, 시행 7일(불리한 변경 30일) 전에 공지한다.
- `LegalDocument`에 `archived?: { currentPath }` prop을 둔다. 있으면 제목 아래에 "이전 버전" 표시와 현재 버전 링크를 그린다.
- 버전 라우트: `generateStaticParams`로 보관 버전만 만들고 `dynamicParams = false`로 나머지는 404.

## 버린 대안

- 이전 버전을 마크다운이나 PDF로 보관: 렌더러 의존성이 늘고 현재 버전과 다른 화면이 된다.
- 이력을 별도 `/terms/history` 페이지로 분리: 이력이 짧아 문서 끝에 두는 편이 찾기 쉽다.

## 함정

- `generateStaticParams`가 빈 배열이고 `dynamicParams = false`이면 모든 버전 주소가 404가 된다. 지금은 이게 맞는 동작이다.
- 목차 테스트가 섹션 id 목록과 정확히 같아야 하므로 `history`를 포함하도록 고친다.

## 완료 기준

- `npm run lint`, `npx tsc --noEmit`, `npm run test` 통과.
- 개발 서버에서 `/terms#history`, `/privacy#history`, `/terms/2000-01-01`(404), `/ask` 안내, `/mypage` 링크 확인.
