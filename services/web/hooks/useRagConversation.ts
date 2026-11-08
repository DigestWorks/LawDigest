'use client';

import { useEffect, useRef } from 'react';
import { useAtom } from 'jotai';
import { useQuery } from '@tanstack/react-query';
import { isRagAnswer, unavailableStatus, type Assembly, type RagStatus } from '@/lib/rag';
import { ragAssemblyState, ragConversationState, ragDraftState, type RagTurn } from '@/store/RagConversationState';

export function useRagStatus(assembly: Assembly = 22, enabled = true) {
  return useQuery({
    queryKey: ['rag-status', assembly],
    enabled,
    staleTime: 60000,
    retry: 1,
    queryFn: async ({ signal }): Promise<RagStatus> => {
      const response = await fetch(`/api/qa?assembly=${assembly}`, { signal, cache: 'no-store' });
      if (!response.ok) throw new Error('질의응답 자료 상태를 불러오지 못했습니다.');
      const result = await response.json();
      return typeof result?.available === 'boolean' ? result : unavailableStatus;
    },
  });
}

export function useRagConversation() {
  const [turns, setTurns] = useAtom(ragConversationState);
  const [draft, setDraft] = useAtom(ragDraftState);
  const [assembly, setAssembly] = useAtom(ragAssemblyState);
  const active = useRef<{ id: string; controller: AbortController } | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (active.current) {
        const { id, controller } = active.current;
        controller.abort();
        setTurns((current) => current.map((turn) => (turn.id === id ? { ...turn, status: 'cancelled' } : turn)));
        active.current = null;
      }
    };
  }, [setTurns]);

  const ask = async (retry?: RagTurn) => {
    const question = (retry?.question ?? draft).trim();
    if (active.current || question.length < 2 || question.length > 1000 || (retry?.retryAt ?? 0) > Date.now()) return;
    const turn: RagTurn = {
      id: retry?.id ?? crypto.randomUUID(),
      question,
      assembly: retry?.assembly ?? assembly,
      status: 'pending',
    };
    const controller = new AbortController();
    const pendingRequest = { id: turn.id, controller };
    active.current = pendingRequest;
    const prior = retry
      ? turns.slice(
          0,
          turns.findIndex((item) => item.id === retry.id),
        )
      : turns;
    const history = prior
      .filter((item) => item.status === 'answered' && item.answer?.status === 'answered')
      .slice(-4)
      .map((item) => ({
        question: item.question,
        assembly: item.assembly,
        source_ids: item.answer!.sources.map((source) => source.bill_id),
      }));
    setTurns((current) =>
      retry ? current.map((item) => (item.id === turn.id ? turn : item)) : [...current.slice(-19), turn],
    );
    if (!retry) setDraft('');
    try {
      const response = await fetch('/api/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, assembly: turn.assembly, history }),
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok) {
        const wait =
          response.status === 429 ? Math.min(86400, Math.max(1, Number(response.headers.get('retry-after')) || 60)) : 0;
        if (mounted.current && active.current === pendingRequest && !controller.signal.aborted)
          setTurns((current) =>
            current.map((item) =>
              item.id === turn.id
                ? {
                    ...item,
                    status: 'failed',
                    error: typeof result?.message === 'string' ? result.message : '답변을 불러오지 못했습니다.',
                    retryAt: wait ? Date.now() + wait * 1000 : undefined,
                  }
                : item,
            ),
          );
        return;
      }
      if (!isRagAnswer(result)) throw new Error('invalid answer');
      if (mounted.current && active.current === pendingRequest && !controller.signal.aborted)
        setTurns((current) =>
          current.map((item) =>
            item.id === turn.id
              ? {
                  ...item,
                  status: 'answered',
                  answer: result,
                }
              : item,
          ),
        );
    } catch {
      if (mounted.current && active.current === pendingRequest)
        setTurns((current) =>
          current.map((item) =>
            item.id === turn.id
              ? {
                  ...item,
                  status: controller.signal.aborted ? 'cancelled' : 'failed',
                  error: controller.signal.aborted ? undefined : '연결을 확인한 뒤 다시 시도해 주세요.',
                }
              : item,
          ),
        );
    } finally {
      if (active.current === pendingRequest) active.current = null;
    }
  };
  const stop = () => {
    const request = active.current;
    if (!request) return;
    request.controller.abort();
    active.current = null;
    setTurns((current) => current.map((item) => (item.id === request.id ? { ...item, status: 'cancelled' } : item)));
  };
  const reset = () => {
    stop();
    setTurns([]);
    setDraft('');
  };
  return {
    turns,
    draft,
    setDraft,
    assembly,
    setAssembly,
    ask,
    stop,
    reset,
    pending: turns.some((turn) => turn.status === 'pending'),
  };
}
