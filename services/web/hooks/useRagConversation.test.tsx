import { act, renderHook, waitFor } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { afterEach, expect, it, vi } from 'vitest';
import { useRagConversation } from './useRagConversation';
import { ragDraftState } from '@/store/RagConversationState';
import { unavailableStatus } from '@/lib/rag';

const answer = {
  status: 'insufficient_evidence',
  paragraphs: [],
  sources: [],
  limitations: ['근거 부족'],
  metadata: unavailableStatus,
};
afterEach(() => vi.unstubAllGlobals());

it('restores a conversation and draft after visiting a source page', async () => {
  const store = createStore();
  store.set(ragDraftState, '주거 지원 법안은?');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(answer)));
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  const first = renderHook(useRagConversation, { wrapper });
  await act(async () => {
    await first.result.current.ask();
  });
  act(() => first.result.current.setDraft('후속 질문 초안'));
  first.unmount();
  const back = renderHook(useRagConversation, { wrapper });
  expect(back.result.current.turns).toHaveLength(1);
  expect(back.result.current.turns[0].answer).toEqual(answer);
  expect(back.result.current.draft).toBe('후속 질문 초안');
});

it('ignores a late cancelled response when the same turn is retried immediately', async () => {
  let resolveFirst!: (response: Response) => void;
  let resolveRetry!: (response: Response) => void;
  const fetcher = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveFirst = resolve;
        }),
    )
    .mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveRetry = resolve;
        }),
    );
  vi.stubGlobal('fetch', fetcher);
  const store = createStore();
  store.set(ragDraftState, '주거 지원 법안은?');
  const hook = renderHook(useRagConversation, {
    wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
  });
  act(() => {
    void hook.result.current.ask();
  });
  act(() => hook.result.current.stop());
  const turn = hook.result.current.turns[0];
  act(() => {
    void hook.result.current.ask(turn);
  });
  await act(async () => {
    resolveFirst(Response.json(answer));
  });
  expect(hook.result.current.turns[0].status).toBe('pending');
  await act(async () => {
    resolveRetry(Response.json(answer));
  });
  await waitFor(() => expect(hook.result.current.turns[0].status).toBe('answered'));
});

it('keeps a rate-limited question and prevents immediate retries', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      Response.json({ message: '잠시 후 다시 시도해 주세요.' }, { status: 429, headers: { 'Retry-After': '60' } }),
    );
  vi.stubGlobal('fetch', fetcher);
  const store = createStore();
  store.set(ragDraftState, '질문을 보냅니다');
  const hook = renderHook(useRagConversation, {
    wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
  });
  await act(async () => {
    await hook.result.current.ask();
  });
  const turn = hook.result.current.turns[0];
  expect(turn.status).toBe('failed');
  expect(turn.retryAt).toBeGreaterThan(Date.now());
  await act(async () => {
    await hook.result.current.ask(turn);
  });
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(hook.result.current.turns).toHaveLength(1);
});
