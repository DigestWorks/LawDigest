/**
 * AI 답변 링. 검색창과 같은 무지개 원뿔형 링이 답을 만드는 동안 같은 속도로 돌고, 끝나면 그 자리에서 멈춘다.
 */
export default function AnswerRing({ spinning }: { spinning: boolean }) {
  return <span aria-hidden="true" data-spinning={spinning} className="answer-ring" />;
}
