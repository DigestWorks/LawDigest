/*
 * AI 답변 구체.
 *
 * 다층 원뿔형 그라디언트 메시, 떠다니는 광택, 테두리, 번짐은 SmoothUI Siri Orb를 CSS로 옮겨 응용했다.
 *   https://github.com/educlopez/smoothui/blob/main/packages/smoothui/components/siri-orb/index.tsx
 *   MIT License, Copyright (c) 2024 Eduardo Calvo
 * 유리 하이라이트를 겹쳐 구의 입체감을 내는 방식은 react-ai-orb를 참고했다.
 *   https://github.com/Steve0929/react-ai-orb (MIT License)
 * 두 프로젝트의 색 혼합·색상 회전은 쓰지 않는다. 정당색이 다른 색으로 바뀌지 않게 겹마다 한 색을 그대로 둔다.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 * documentation files (the "Software"), to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright
 * notice and this permission notice shall be included in all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.
 */
import { CSSProperties } from 'react';

export type OrbState = 'working' | 'settled' | 'still';

/** 7겹 색(layers)을 받아 그린다. working은 빠르게, settled는 천천히 돌고, still은 멈춘다. */
export default function AnswerOrb({
  layers,
  state,
  className = 'size-7',
}: {
  layers: string[];
  state: OrbState;
  className?: string;
}) {
  const style = Object.fromEntries(layers.map((color, index) => [`--orb-c${index + 1}`, color])) as CSSProperties;
  return (
    <span aria-hidden="true" data-state={state} style={style} className={`answer-orb ${className}`}>
      <span className="answer-orb__glow" />
      <span className="answer-orb__mesh">
        <span className="answer-orb__sheen" />
        <span className="answer-orb__rim" />
      </span>
    </span>
  );
}
