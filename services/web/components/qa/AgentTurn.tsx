'use client';

import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import type { RagTurn } from '@/store/RagConversationState';
import { Skeleton } from '@/components/ui/skeleton';
import AgentSteps from './AgentSteps';
import RagAnswer from './RagAnswer';

function RetryButton({ turn, onRetry, disabled }: { turn: RagTurn; onRetry: () => void; disabled: boolean }) {
  const [waiting, setWaiting] = useState((turn.retryAt ?? 0) > Date.now());
  useEffect(() => {
    const remaining = (turn.retryAt ?? 0) - Date.now();
    setWaiting(remaining > 0);
    if (remaining <= 0) return undefined;
    const timer = setTimeout(() => setWaiting(false), remaining + 10);
    return () => clearTimeout(timer);
  }, [turn.retryAt]);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onRetry}
        disabled={disabled || waiting}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3.5 text-sm font-semibold transition-colors hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50 disabled:hover:bg-transparent">
        <RotateCcw aria-hidden="true" className="size-3.5" />
        다시 시도
      </button>
      {waiting && (
        <span className="text-sm text-muted-foreground">
          {new Date(turn.retryAt!).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}부터 다시 물을 수
          있습니다
        </span>
      )}
    </div>
  );
}

/** 질문 하나에 대한 에이전트의 진행 상태와 답변 */
export default function AgentTurn({
  turn,
  onRetry,
  retryDisabled,
  collapsible = false,
}: {
  turn: RagTurn;
  onRetry: () => void;
  retryDisabled: boolean;
  collapsible?: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      <AgentSteps steps={turn.steps} status={turn.status} />
      {turn.status === 'pending' && (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="답변을 만드는 중">
          <Skeleton className="h-3.5 w-[94%] rounded-full bg-foreground/[0.07]" />
          <Skeleton className="h-3.5 w-[86%] rounded-full bg-foreground/[0.07]" />
          <Skeleton className="h-3.5 w-[62%] rounded-full bg-foreground/[0.07]" />
        </div>
      )}
      {turn.status === 'answered' && turn.answer && (
        <RagAnswer answer={turn.answer} turnId={turn.id} collapsible={collapsible} />
      )}
      {turn.status === 'failed' && (
        <div className="flex flex-col gap-3" role="alert">
          <p className="text-[15px] leading-7 text-[#C62C38] dark:text-[#F0757D]">{turn.error}</p>
          <RetryButton turn={turn} onRetry={onRetry} disabled={retryDisabled} />
        </div>
      )}
      {turn.status === 'cancelled' && (
        <div className="flex flex-col gap-3">
          <p className="text-[15px] text-muted-foreground">답변을 멈췄습니다.</p>
          <RetryButton turn={turn} onRetry={onRetry} disabled={retryDisabled} />
        </div>
      )}
    </div>
  );
}
