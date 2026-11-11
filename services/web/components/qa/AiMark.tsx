/** AI 답변 표식. 화면의 포인트 색(정당색 또는 중립색)으로 채운 반짝임이며, 답을 만드는 동안 천천히 돈다. */
export function AiMark({ active = false, className = 'size-[18px]' }: { active?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`shrink-0 ${active ? 'ai-mark-active' : ''} ${className}`}>
      <path
        fill="currentColor"
        d="M10 2.5c.5 4.1 3.4 7 7.5 7.5-4.1.5-7 3.4-7.5 7.5-.5-4.1-3.4-7-7.5-7.5 4.1-.5 7-3.4 7.5-7.5Z"
      />
      <path
        fill="currentColor"
        d="M18.5 14c.25 2 1.5 3.25 3.5 3.5-2 .25-3.25 1.5-3.5 3.5-.25-2-1.5-3.25-3.5-3.5 2-.25 3.25-1.5 3.5-3.5Z"
      />
    </svg>
  );
}

/** "AI 답변" 머리말. 검색 결과의 답변 패널과 에이전트 채팅의 턴이 같은 표식을 쓴다. */
export default function AiLabel({
  active = false,
  as: Tag = 'p',
  id,
}: {
  active?: boolean;
  as?: 'p' | 'h2';
  id?: string;
}) {
  return (
    <Tag id={id} className="flex items-center gap-1.5 text-[15px] font-bold text-foreground">
      <AiMark active={active} className="size-[18px] text-[var(--lawdigest-summary-accent,#797C85)]" />
      <span className="lawdigest-summary-heading">AI 답변</span>
    </Tag>
  );
}
