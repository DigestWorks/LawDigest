import AnswerRing from './AnswerRing';

/**
 * "AI 답변" 머리말. 앞의 무지개 링은 답을 만드는 동안 돌고 끝나면 멈춘다.
 * 검색 결과 패널과 에이전트 채팅의 턴이 함께 쓴다.
 */
export default function AiLabel({
  spinning = true,
  as: Tag = 'p',
  id,
}: {
  spinning?: boolean;
  as?: 'p' | 'h2';
  id?: string;
}) {
  return (
    <Tag id={id} className="flex items-center gap-2 text-[15px] font-bold text-foreground">
      <AnswerRing spinning={spinning} />
      <span className="lawdigest-summary-heading">AI 답변</span>
    </Tag>
  );
}
