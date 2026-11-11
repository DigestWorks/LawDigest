---
title: AI 답변에 정당 컬러 포인트와 발의자 카드
slug: party-accent-answer
stage: spec
status: accepted
intent: .intent/intent_party-accent-answer.md
date: 2026-11-11
---

# 정당 컬러 포인트 — 명세

## 요구사항

- [ ] `Source`에 선택 필드 `proposer_label: str | None`, `representative: Representative | None`(단독 대표발의일 때만: name, congressman_id, image_url, party, party_id, party_image_url).
- [ ] `BillRepository.proposer_info(bill_ids)`가 법안별 대표발의자 목록을 돌려준다(읽기 전용).
- [ ] 에이전트 최종 단계에서 현재 근거에 발의자 정보를 붙인다.
- [ ] 웹 `isRagAnswer`가 두 필드를 선택적으로 검증한다(문자열 길이, 식별자 형식, 이미지 경로).
- [ ] 패널 포인트 = 모든 근거의 `representative.party`가 같으면 `getPartyColor(party)`, 아니면 중립(`getPartyColor(null)`).
- [ ] 포인트는 CSS 변수 `--lawdigest-summary-accent`로 넘기고 `.lawdigest-summary-heading`, `.lawdigest-summary-mark`를 재사용한다.
- [ ] 모든 근거의 `representative.congressman_id`가 같으면 의원 카드, 아니고 정당이 같으면 정당 카드를 둔다.

## 설계

재사용: `getPartyColor`, `getPartyLogoSrc`, `ThemedPartyLogo`, HeroUI `Avatar`, 법안 카드의 형광펜 클래스와 `.{정당명}` 테두리 클래스.
- 새 `components/qa/answerAccent.ts`: 근거로 포인트·주인공을 계산한다.
- 새 `components/qa/ProposerCard.tsx`: 의원/정당 카드.
- `RagAnswer`: 문단을 정당색 점 목록으로, 첫 문단 형광펜, 근거 번호와 근거 줄 정당 표시.
- `AiMark`: 무지개 대신 `currentColor`로 포인트를 따른다.

## 버린 대안

- 파란 보조색 포인트: 서비스 컨셉(정당색)과 다르다.
- 무지개 AI 표식: 무지개는 검색 진입점 전용이고, 정당색과 겹치면 포인트가 흐려진다.

## 함정

- 정부·위원장 법안은 대표발의자 행이 없을 수 있다 → `proposer_label=None`.
- 공동대표발의는 정당이 하나여도 representative가 없다 → 중립.

## 완료 기준

- `pytest tests/rag`, 웹 `npm test`·`npm run lint`·`tsc` 통과.
- 실데이터: 국민의힘 의원명, '국민의힘', '전세사기' 화면 확인(라이트·다크).
