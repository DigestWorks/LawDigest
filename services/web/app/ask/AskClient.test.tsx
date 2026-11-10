import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { StrictMode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AskClient from './AskClient';
import SearchAiOverview from '@/app/search/[id]/components/SearchAiOverview';
import { unavailableStatus } from '@/lib/rag';
import { ragConversationState, ragSubmissionState } from '@/store/RagConversationState';

const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => '/ask', useRouter: () => navigation }));
vi.mock('@/hooks/useRagConversation', async (original) => ({
  ...(await original<typeof import('@/hooks/useRagConversation')>()),
  useRagStatus: () => ({
    data: { ...unavailableStatus, available: true },
    isPending: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
}));

const source = {
  key: 'S1',
  bill_id: 'PRC_A1',
  bill_name: '전세사기피해자 지원 및 주거안정에 관한 특별법 일부개정법률안',
  assembly: 22,
  propose_date: '2026-10-02',
  stage: '소관위접수',
  result: null,
  excerpt: '피해자 결정 요건을 완화한다.',
  detail_url: '/bill/PRC_A1',
  official_url: 'https://likms.assembly.go.kr/bill/billDetail.do?billId=PRC_A1',
};
const answered = {
  status: 'answered',
  paragraphs: [{ text: '피해자 결정 요건을 완화하는 개정안이 있습니다.', source_keys: ['S1'] }],
  sources: [source],
  limitations: [],
  metadata: unavailableStatus,
};
const stream = (answer: unknown) =>
  new Response(`data: ${JSON.stringify({ type: 'answer', answer })}\n\n`, {
    headers: { 'Content-Type': 'text/event-stream' },
  });

beforeEach(() => {
  navigation.push.mockClear();
  // jsdom에는 스크롤 이동이 없다. 새 질문으로 옮기는 동작은 브라우저에서 확인한다.
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => vi.unstubAllGlobals());

it('answers the search keyword once in StrictMode and hands a follow-up to the agent chat', async () => {
  const fetcher = vi.fn().mockResolvedValue(stream(answered));
  vi.stubGlobal('fetch', fetcher);
  const store = createStore();
  render(
    <StrictMode>
      <Provider store={store}>
        <SearchAiOverview keyword="전세사기" />
      </Provider>
    </StrictMode>,
  );
  await screen.findByText('피해자 결정 요건을 완화하는 개정안이 있습니다.');
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({ question: '전세사기', history: [] });
  expect(screen.getByRole('link', { name: source.bill_name })).toHaveAttribute('href', '/bill/PRC_A1');

  const bar = screen.getByRole('textbox', { name: '이어서 질문하기' });
  fireEvent.change(bar, { target: { value: '시행일은 언제인가요?' } });
  fireEvent.keyDown(bar, { key: 'Enter', keyCode: 13 });
  expect(navigation.push).toHaveBeenCalledExactlyOnceWith('/ask');
  expect(store.get(ragSubmissionState)).toMatchObject({ question: '시행일은 언제인가요?', mode: 'chat' });
  // 다른 화면으로 보낼 질문은 검색 결과 화면에서 처리하지 않는다.
  await Promise.resolve();
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it('continues the conversation on /ask with the first answer as history', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(stream({ ...answered, paragraphs: [{ text: '공포 후 6개월입니다.', source_keys: ['S1'] }] }));
  vi.stubGlobal('fetch', fetcher);
  const store = createStore();
  store.set(ragConversationState, [
    {
      id: 'first',
      question: '전세사기',
      assembly: 22,
      mode: 'chat',
      status: 'answered',
      answer: answered as never,
      entry: '전세사기',
    },
  ]);
  store.set(ragSubmissionState, { id: 'next', question: '시행일은 언제인가요?', mode: 'chat' });
  render(
    <Provider store={store}>
      <AskClient />
    </Provider>,
  );
  await screen.findByText('공포 후 6개월입니다.');
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({
    question: '시행일은 언제인가요?',
    history: [{ question: '전세사기', source_ids: ['PRC_A1'] }],
  });
  expect(screen.getByRole('heading', { name: '전세사기' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '‘전세사기’ 검색 결과' })).toHaveAttribute(
    'href',
    `/search/${encodeURIComponent('전세사기')}`,
  );
});

it('does not submit Enter during Korean IME composition and submits once after composition ends', async () => {
  const fetcher = vi.fn().mockResolvedValue(
    stream({
      status: 'insufficient_evidence',
      paragraphs: [],
      sources: [],
      limitations: [],
      metadata: unavailableStatus,
    }),
  );
  vi.stubGlobal('fetch', fetcher);
  render(
    <StrictMode>
      <Provider store={createStore()}>
        <AskClient />
      </Provider>
    </StrictMode>,
  );
  const input = screen.getByRole('textbox', { name: '법안에 관해 질문하기' });
  fireEvent.compositionStart(input);
  fireEvent.change(input, { target: { value: '주거 지원 법안은?' } });
  fireEvent.keyDown(input, { key: 'Enter', keyCode: 229, isComposing: true });
  expect(fetcher).not.toHaveBeenCalled();
  fireEvent.compositionEnd(input);
  fireEvent.keyDown(input, { key: 'Enter', keyCode: 13 });
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  expect(JSON.parse(fetcher.mock.calls[0][1].body).question).toBe('주거 지원 법안은?');
  await screen.findByText(/확인한 법안에서 답할 근거를 찾지 못했습니다/);
});
