'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, SquarePen } from 'lucide-react';
import { useRagConversation, useRagStatus } from '@/hooks/useRagConversation';
import { buildSearchHref } from '@/lib/search';
import ChatBar, { type ChatBarHandle } from '@/components/qa/ChatBar';
import AgentTurn from '@/components/qa/AgentTurn';
import { OverseasNotice } from '@/app/search/[id]/components/SearchAiOverview';

const EXAMPLES = [
  '전세사기 피해자를 지원하는 법안은 어떤 내용을 담고 있나요?',
  '청년 주거비 부담을 줄이려는 법안에는 무엇이 있나요?',
  '반도체 산업 지원 법안들은 서로 무엇이 다른가요?',
];

/** 에이전트 채팅. 검색 결과의 AI 답변에서 이어진 대화를 질문 제목과 답변의 흐름으로 보이고, 채팅 바를 하단에 고정한다. */
export default function AskClient() {
  const { turns, assembly, setAssembly, ask, stop, reset, pending } = useRagConversation();
  const status = useRagStatus(assembly);
  const available = status.data?.available === true;
  const bar = useRef<ChatBarHandle>(null);
  const shownCount = useRef(0);
  const entry = turns[0]?.entry;

  // 새 질문이 들어오면 그 질문이 화면 위쪽에 오도록 옮긴다. 처음 들어왔을 때는 바로 옮긴다.
  useEffect(() => {
    const previous = shownCount.current;
    shownCount.current = turns.length;
    if (turns.length <= previous || turns.length === 0) return;
    const last = document.getElementById(`turn-${turns.at(-1)!.id}`);
    last?.scrollIntoView({ block: 'start', behavior: previous === 0 ? 'auto' : 'smooth' });
  }, [turns]);

  const submit = (question: string) => {
    if (pending || !available) return false;
    void ask(undefined, { id: crypto.randomUUID(), question, mode: 'chat' });
    return true;
  };

  let announcement = '';
  if (pending)
    announcement =
      turns.find((turn) => turn.status === 'pending')?.steps?.at(-1)?.summary ?? '질문에 맞는 법안을 찾고 있습니다.';
  else if (turns.length) announcement = '답변이 끝났습니다.';

  return (
    <div className="mx-auto w-full max-w-[720px] px-5 pb-[calc(env(safe-area-inset-bottom)+168px)] pt-4 text-foreground md:px-6 md:pt-6">
      <p className="sr-only" role="status">
        {announcement}
      </p>
      {turns.length > 0 && (
        <div className="mb-6 flex items-center justify-between gap-3">
          {entry ? (
            <Link
              href={buildSearchHref(entry)}
              className="-ml-2 inline-flex h-9 min-w-0 items-center gap-1.5 rounded-full px-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
              <ArrowLeft aria-hidden="true" className="size-4 shrink-0" />
              <span className="truncate">‘{entry}’ 검색 결과</span>
            </Link>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={() => {
              reset();
              bar.current?.focus();
            }}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
            <SquarePen aria-hidden="true" className="size-4" />새 대화
          </button>
        </div>
      )}

      {turns.length === 0 && (
        <section className="flex min-h-[calc(100dvh-340px)] flex-col justify-center py-10">
          <h1 className="text-[26px] font-bold leading-tight md:text-[32px]">법안에 대해 물어보세요</h1>
          {!available && !status.isPending && (
            <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
              지금은 질문을 받을 수 없습니다. 잠시 후 다시 들어와 주세요.
            </p>
          )}
          {available && (
            <ul className="mt-8 flex flex-col">
              {EXAMPLES.map((example) => (
                <li key={example} className="border-t border-border last:border-b">
                  <button
                    type="button"
                    onClick={() => bar.current?.fill(example)}
                    className="w-full py-4 text-left text-[15px] leading-6 transition-colors hover:text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
                    {example}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div className="flex flex-col">
        {turns.map((turn, index) => (
          <article
            key={turn.id}
            id={`turn-${turn.id}`}
            aria-labelledby={`question-${turn.id}`}
            className={`scroll-mt-20 md:scroll-mt-28 ${index > 0 ? 'mt-12 border-t border-border pt-10' : ''} ${
              // 마지막 질문이 화면 위쪽까지 올라갈 수 있게 남은 높이를 채운다.
              index === turns.length - 1 && index > 0 ? 'min-h-[calc(100dvh-300px)]' : ''
            }`}>
            <h2
              id={`question-${turn.id}`}
              className="whitespace-pre-wrap text-[22px] font-bold leading-[1.35] [word-break:keep-all] md:text-[26px]">
              {turn.question}
            </h2>
            <div className="mt-5">
              <AgentTurn turn={turn} onRetry={() => void ask(turn)} retryDisabled={pending || !available} />
            </div>
          </article>
        ))}
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-background from-60% to-transparent pb-[max(env(safe-area-inset-bottom),12px)] pt-10">
        <div className="pointer-events-auto mx-auto w-full max-w-[720px] px-4 md:px-5">
          <ChatBar
            ref={bar}
            placeholder={turns.length ? '이어서 질문하기' : '법안에 관해 질문하기'}
            pending={pending}
            disabled={!available}
            assembly={assembly}
            onAssemblyChange={setAssembly}
            onSubmit={submit}
            onStop={stop}
            autoFocus={turns.length === 0}
          />
          <OverseasNotice className="mt-2 px-2 text-center" />
        </div>
      </div>
    </div>
  );
}
