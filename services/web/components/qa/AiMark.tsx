import AnswerRing, { type RingState } from './AnswerRing';
import { ringGradient, type PartyShare } from './answerAccent';

/**
 * "AI 답변" 머리말. 앞의 링은 답을 만드는 동안 검색창과 같은 무지개로 돌고,
 * 답이 끝나면 근거 법안의 정당 분포 호로 멈춘다. 검색 결과 패널과 에이전트 채팅의 턴이 함께 쓴다.
 */
export default function AiLabel({
  state = 'working',
  shares = [],
  as: Tag = 'p',
  id,
}: {
  state?: RingState;
  shares?: PartyShare[];
  as?: 'p' | 'h2';
  id?: string;
}) {
  return (
    <Tag id={id} className="flex items-center gap-2 text-[15px] font-bold text-foreground">
      <AnswerRing arcs={ringGradient(shares)} state={state} />
      <span className="lawdigest-summary-heading">AI 답변</span>
      {shares.length > 0 && (
        <span className="sr-only">
          , 근거 법안 정당 분포{' '}
          {shares.map(({ party, count }) => `${party ?? '공동·위원회 발의'} ${count}건`).join(', ')}
        </span>
      )}
    </Tag>
  );
}
