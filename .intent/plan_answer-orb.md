---
title: AI 답변 구체 — 무지개에서 정당 분포로 물드는 오브
slug: answer-orb
stage: plan
status: accepted
intent: .intent/intent_answer-orb.md
spec: .intent/spec_answer-orb.md
date: 2026-11-11
---

# AI 답변 구체 — 구현 계획

## 바뀌는 파일

| 파일 | 무엇을 |
|---|---|
| `services/web/components/qa/answerAccent.ts` | `orbLayers` |
| `services/web/components/qa/answerAccent.test.ts` | 배분 테스트 |
| `services/web/components/qa/AnswerOrb.tsx` | 새 파일 |
| `services/web/components/qa/AiMark.tsx` | `AiLabel`이 구체를 쓰고 반짝임 제거 |
| `services/web/components/qa/AgentTurn.tsx`, `SearchAiOverview.tsx` | 레이어 색 전달 |
| `services/web/styles/globals.css` | 구체 CSS, `@property` 색 |

## 작업 순서

1. `orbLayers`와 테스트 — 비율 배분 통과
2. `AnswerOrb`와 CSS — 브라우저에서 무지개 회전 확인
3. 라벨·턴 연결 — 실데이터로 정당색 물듦 확인
4. 린트·테스트 후 커밋

## 가장 위험한 단계

2단계. 작은 크기에서 블러·대비가 과하면 색이 뭉개져 '공존'이 안 보인다. 크기별 블러 값을 화면에서 조정한다.

## 검증

```
cd services/web && npx tsc --noEmit && npm run lint && npm test
```
