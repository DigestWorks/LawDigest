'use client';

import { ChevronDown } from 'lucide-react';
import type { RagStep } from '@/lib/rag';
import type { RagTurn } from '@/store/RagConversationState';

/** 에이전트가 지금 하는 일. 진행 중에는 마지막 단계 한 줄을, 끝나면 접힌 단계 목록을 보인다. */
export default function AgentSteps({ steps = [], status }: { steps?: RagStep[]; status: RagTurn['status'] }) {
  if (status === 'pending') {
    const current = steps.at(-1)?.summary ?? '질문에 맞는 법안을 찾고 있습니다';
    return (
      <p className="flex items-center gap-2.5 text-[15px]" aria-live="polite">
        <span aria-hidden="true" className="relative flex size-2">
          <span className="absolute inset-0 animate-ping rounded-full bg-[var(--lawdigest-summary-accent,#797C85)] opacity-40 motion-reduce:animate-none" />
          <span className="relative size-2 rounded-full bg-[var(--lawdigest-summary-accent,#797C85)]" />
        </span>
        <span className="ai-shimmer font-medium">{current}</span>
      </p>
    );
  }
  if (!steps.length) return null;
  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
        확인 과정
        <ChevronDown aria-hidden="true" className="size-3.5 transition-transform group-open:rotate-180" />
      </summary>
      <ol className="mt-3 flex flex-col">
        {steps.map((step, index) => (
          <li key={step.id} className="relative flex gap-3 pb-3 last:pb-0">
            {index < steps.length - 1 && (
              <span aria-hidden="true" className="absolute left-[3.5px] top-3 h-full w-px bg-border" />
            )}
            <span
              aria-hidden="true"
              className={`relative mt-[7px] size-2 shrink-0 rounded-full ${
                step.status === 'complete'
                  ? 'bg-[var(--lawdigest-summary-accent,#797C85)]'
                  : 'border border-muted-foreground bg-background'
              }`}
            />
            <span className="text-sm leading-[22px] text-muted-foreground">
              {step.summary}
              {step.status !== 'complete' && <span className="sr-only"> (중단됨)</span>}
            </span>
          </li>
        ))}
      </ol>
    </details>
  );
}
