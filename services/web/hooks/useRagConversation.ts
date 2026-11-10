'use client';

import { useEffect, useRef } from 'react';
import { useAtom } from 'jotai';
import { useQuery } from '@tanstack/react-query';
import { isRagAnswer, unavailableStatus, type Assembly, type RagStatus } from '@/lib/rag';
import { readRagStream, RagStreamError } from '@/lib/ragStream';
import {
  ragAssemblyState,
  ragConversationState,
  ragDraftState,
  ragModeState,
  ragSubmissionState,
  ragCancelState,
  type RagSubmission,
  type RagTurn,
} from '@/store/RagConversationState';

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

/** consume가 false면 다른 화면으로 보낼 제출(ragSubmissionState)을 이 화면에서 처리하지 않는다. */
export function useRagConversation({ consume = true }: { consume?: boolean } = {}) {
  const [turns, setTurns] = useAtom(ragConversationState);
  const [draft, setDraft] = useAtom(ragDraftState);
  const [assembly, setAssembly] = useAtom(ragAssemblyState);
  const [mode, setMode] = useAtom(ragModeState);
  const [submission, setSubmission] = useAtom(ragSubmissionState);
  const [cancelVersion] = useAtom(ragCancelState);
  const consumed = useRef<string | null>(null);
  const seenCancel = useRef(cancelVersion);
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

  const ask = async (retry?: RagTurn, incoming?: RagSubmission) => {
    const question = (retry?.question ?? incoming?.question ?? draft).trim();
    const fresh = Boolean(incoming?.fresh);
    // 검색 결과 화면의 첫 턴은 진행 중이던 대화를 끊고 새로 시작한다.
    if (fresh && active.current) stop();
    if (active.current || question.length < 2 || question.length > 1000 || (retry?.retryAt ?? 0) > Date.now()) return;
    const turn: RagTurn = {
      id: retry?.id ?? crypto.randomUUID(),
      question,
      assembly: retry?.assembly ?? assembly,
      mode: retry?.mode ?? incoming?.mode ?? mode,
      steps: [],
      status: 'pending',
      entry: retry?.entry ?? incoming?.entry,
    };
    const controller = new AbortController();
    const pendingRequest = { id: turn.id, controller };
    active.current = pendingRequest;
    let prior = turns;
    if (fresh) prior = [];
    else if (retry)
      prior = turns.slice(
        0,
        turns.findIndex((item) => item.id === retry.id),
      );
    const history = prior
      .filter((item) => item.status === 'answered' && ['answered', 'searched'].includes(item.answer?.status ?? ''))
      .slice(-4)
      .map((item) => ({
        question: item.question,
        assembly: item.assembly,
        source_ids: item.answer!.sources.map((source) => source.bill_id),
      }));
    setTurns((current) => {
      if (fresh) return [turn];
      if (retry) return current.map((item) => (item.id === turn.id ? turn : item));
      return [...current.slice(-19), turn];
    });
    if (!retry && !incoming) setDraft('');
    try {
      const response = await fetch(`/api/qa/${turn.mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, assembly: turn.assembly, history }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const result = await response.json();
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
      const result =
        turn.mode === 'search'
          ? await response.json()
          : await readRagStream(response, (step) => {
              if (!mounted.current || active.current !== pendingRequest || controller.signal.aborted) return;
              setTurns((current) =>
                current.map((item) => {
                  if (item.id !== turn.id) return item;
                  const steps = [...(item.steps ?? [])];
                  const index = steps.findIndex((entry) => entry.id === step.id);
                  if (index < 0) steps.push(step);
                  else steps[index] = step;
                  return { ...item, steps };
                }),
              );
            });
      if (!isRagAnswer(result) || (turn.mode === 'search' && result.status !== 'searched'))
        throw new Error('invalid answer');
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
    } catch (error) {
      const failureMessage = error instanceof RagStreamError ? error.message : '연결을 확인한 뒤 다시 시도해 주세요.';
      if (mounted.current && active.current === pendingRequest)
        setTurns((current) =>
          current.map((item) =>
            item.id === turn.id
              ? {
                  ...item,
                  status: controller.signal.aborted ? 'cancelled' : 'failed',
                  error: controller.signal.aborted ? undefined : failureMessage,
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
  useEffect(() => {
    if (!consume || !submission || consumed.current === submission.id) return undefined;
    let live = true;
    queueMicrotask(() => {
      if (!live || consumed.current === submission.id) return;
      consumed.current = submission.id;
      setSubmission(null);
      void ask(undefined, submission);
    });
    return () => {
      live = false;
    };
  });
  useEffect(() => {
    if (seenCancel.current === cancelVersion) return;
    seenCancel.current = cancelVersion;
    stop();
  });
  return {
    turns,
    draft,
    setDraft,
    assembly,
    setAssembly,
    mode,
    setMode,
    ask,
    stop,
    reset,
    pending: turns.some((turn) => turn.status === 'pending'),
  };
}
