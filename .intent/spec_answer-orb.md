---
title: AI 답변 구체 — 무지개에서 정당 분포로 물드는 오브
slug: answer-orb
stage: spec
status: accepted
intent: .intent/intent_answer-orb.md
date: 2026-11-11
---

# AI 답변 구체 — 명세

> 2026-11-11 변경: 구체 대신 회전 링. 아래 "링 요구사항"이 앞선 구체 요구사항을 대신한다.

## 링 요구사항

- [ ] `ringGradient(shares)`가 정당 호의 conic-gradient 문자열을 돌려준다. 호 길이는 건수 비율, 정당이 둘 이상이면 호 사이 6° 틈. 근거가 없으면 중립 회색 링.
- [ ] `AnswerRing`: 지름 22px, 굵기 3px. working은 무지개 회전(`search-ring-spin`, 1.1초), settled는 무지개가 0.6초 동안 돌며 흐려지고 호가 -90°에서 0°로 감속해 멈춘다. still은 호만 정지.
- [ ] `prefers-reduced-motion`이면 회전하지 않는다.
- [ ] 구체(`AnswerOrb`, `orbLayers`, 7겹 CSS)와 외부 출처 코드를 제거한다.

## 요구사항

- [ ] `orbLayers(sources)`가 7개 레이어 색을 돌려준다. 정당별 건수 비율로 최대잉여 배분하고, 있는 정당은 최소 1겹. 단독 대표발의가 아니면 중립색(`getPartyColor(null)`).
- [ ] 생성 중(`pending`)과 근거가 없을 때는 무지개 4색을 7겹에 순환 배정한다.
- [ ] `AnswerOrb`는 7겹 원뿔형 그라디언트(각기 다른 중심·회전 배수), 광택, 테두리, 바깥 번짐으로 구성한다.
- [ ] 레이어 색은 `@property --orb-c1..7`(`<color>`)로 등록해 1.2초 전환한다.
- [ ] 회전 주기: 생성 중 6초, 끝난 뒤 24초. 실패·중지는 정지. `prefers-reduced-motion`이면 정지.
- [ ] `AiLabel`이 `AiMark` 대신 `AnswerOrb`를 쓴다.

## 설계

SmoothUI Siri Orb(MIT, © 2024 Eduardo Calvo)의 `.siri-orb::before` 다층 conic-gradient와 sheen/rim을 CSS로 옮긴다(motion 라이브러리 없이). react-ai-orb(MIT, © Steve0929)의 유리 하이라이트 겹침을 sheen에 응용한다. 색 혼합 모드·hue 회전은 쓰지 않는다(정당색 왜곡).
- 새 `components/qa/AnswerOrb.tsx`, `orbLayers`는 `answerAccent.ts`에 둔다.
- CSS는 `styles/globals.css`의 AI 답변 구역에 둔다. 출처·라이선스 고지는 CSS와 컴포넌트 머리에 남긴다.

## 버린 대안

- react-ai-orb의 blend/hue 방식: 색이 섞여 정당색이 바뀐다.
- WebGL 구체: 작은 크기에 비해 무겁고 라이브러리가 늘어난다.

## 함정

- 28px 안팎의 작은 크기에서는 블러를 1px로 낮춰야 색 덩어리가 구분된다.
- `@property` 미지원 브라우저는 색이 즉시 바뀐다(동작은 유지).

## 완료 기준

- `npm test`, `npm run lint`, `tsc` 통과. 실데이터로 국민의힘 의원, 전세사기에서 구체 확인(라이트·다크).
