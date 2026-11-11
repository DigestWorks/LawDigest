export type RingState = 'working' | 'settled' | 'still';

/**
 * AI 답변 링. 답을 만드는 동안 검색창과 같은 무지개 링이 같은 속도로 돌고,
 * 끝나면 무지개가 돌며 흐려진 자리에 정당 분포 호(arcs: ringGradient 결과)가 감속하며 멈춘다.
 */
export default function AnswerRing({ arcs, state }: { arcs: string; state: RingState }) {
  return (
    <span aria-hidden="true" data-state={state} className="answer-ring">
      <span className="answer-ring__arcs" style={{ background: arcs }} />
      <span className="answer-ring__spin" />
    </span>
  );
}
