'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSetAtom, useStore } from 'jotai';
import { useRagConversation, useRagStatus } from '@/hooks/useRagConversation';
import { ragConversationState, ragSubmissionState } from '@/store/RagConversationState';
import ChatBar from '@/components/qa/ChatBar';
import AgentTurn from '@/components/qa/AgentTurn';
import AgentSteps from '@/components/qa/AgentSteps';
import AiLabel from '@/components/qa/AiMark';

/** 질문이 국외로 전송된다는 안내. 채팅 바가 있는 곳마다 한 줄로 둔다. */
export function OverseasNotice({ className = '' }: { className?: string }) {
  return (
    <p className={`text-xs leading-5 text-muted-foreground ${className}`}>
      AI 답변은 틀릴 수 있습니다. 질문은 OpenAI(미국)로 전송되니 개인정보는 넣지 마세요.{' '}
      <Link href="/privacy#overseas" className="underline underline-offset-4 hover:text-foreground">
        국외 이전 안내
      </Link>
    </p>
  );
}

/** 검색 결과 맨 위의 AI 답변. 검색어를 첫 질문으로 답을 만들고, 그 아래 채팅 바로 에이전트 채팅에 들어간다. */
export default function SearchAiOverview({ keyword }: { keyword: string }) {
  const router = useRouter();
  const store = useStore();
  const { turns, assembly, setAssembly, ask, stop, pending } = useRagConversation({ consume: false });
  const setSubmission = useSetAtom(ragSubmissionState);
  const status = useRagStatus(assembly);
  const available = status.data?.available === true;
  const first = turns[0]?.entry === keyword ? turns[0] : undefined;
  const checked = useRef<string | null>(null);

  // 같은 검색어의 답이 이미 있으면(채팅에서 돌아온 경우) 다시 만들지 않는다.
  // 화면을 떠나며 끊긴 답은 다시 들어왔을 때 새로 만든다. 사용자가 멈춘 답은 그대로 둔다.
  // 개발 모드의 이펙트 재실행에서 요청이 취소되지 않도록 마이크로태스크에서 시작한다.
  useEffect(() => {
    if (!available || keyword.trim().length < 2 || checked.current === keyword) return undefined;
    const current = store.get(ragConversationState)[0];
    if (current?.entry === keyword && current.status !== 'cancelled') {
      checked.current = keyword;
      return undefined;
    }
    let live = true;
    queueMicrotask(() => {
      if (!live || checked.current === keyword) return;
      checked.current = keyword;
      void ask(undefined, { id: crypto.randomUUID(), question: keyword, mode: 'chat', fresh: true, entry: keyword });
    });
    return () => {
      live = false;
    };
  });

  if (!available || keyword.trim().length < 2) return null;

  const followUp = (question: string) => {
    if (pending || !first || first.status === 'pending') return false;
    setSubmission({ id: crypto.randomUUID(), question, mode: 'chat' });
    router.push('/ask');
    return true;
  };

  return (
    <section
      aria-labelledby="ai-answer-heading"
      className="mx-4 mt-5 rounded-[20px] bg-[#F5F7FD] px-5 pb-5 pt-5 dark:bg-[#1E1E1E] md:mx-3 md:px-6 md:pt-6">
      {first ? (
        <AgentTurn
          turn={first}
          collapsible
          onRetry={() => void ask(first)}
          retryDisabled={pending}
          labelAs="h2"
          labelId="ai-answer-heading"
        />
      ) : (
        <div className="flex flex-col gap-5">
          <AiLabel as="h2" id="ai-answer-heading" />
          <AgentSteps status="pending" />
        </div>
      )}
      <div className="mt-6">
        <ChatBar
          placeholder="이어서 질문하기"
          pending={first?.status === 'pending'}
          disabled={!first || first.status === 'pending'}
          assembly={assembly}
          onAssemblyChange={setAssembly}
          onSubmit={followUp}
          onStop={stop}
        />
        <OverseasNotice className="mt-2.5 px-2" />
      </div>
    </section>
  );
}
