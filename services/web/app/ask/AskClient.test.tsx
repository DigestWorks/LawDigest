import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { StrictMode } from 'react';
import { HeaderSearchField } from '@/components/Layout/Header/HeaderSearch';
import { searchModeState } from '@/store/SearchEntryState';
import { afterEach, expect, it, vi } from 'vitest';
import AskClient from './AskClient';
import { unavailableStatus } from '@/lib/rag';

vi.mock('next/navigation', () => ({ usePathname: () => '/ask', useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/components/search/useSearchSuggestions', () => ({
  default: () => ({ ragAvailable: true, recent: [], trending: [], refreshRecent: vi.fn() }),
}));

vi.mock('@/hooks/useRagConversation', async (original) => ({
  ...(await original<typeof import('@/hooks/useRagConversation')>()),
  useRagStatus: () => ({
    data: { ...unavailableStatus, available: true },
    isPending: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
}));
// 스크롤 기하는 브라우저에서 확인하고, 여기서는 검색바와 대화 화면의 요청 전달을 검증한다.
vi.mock('@/components/ui/message-scroller', () => {
  const Part = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  return {
    MessageScrollerProvider: Part,
    MessageScroller: Part,
    MessageScrollerViewport: Part,
    MessageScrollerContent: Part,
    MessageScrollerItem: Part,
    MessageScrollerButton: () => null,
  };
});
afterEach(() => vi.unstubAllGlobals());

it('does not submit Enter during Korean IME composition and submits once after composition ends', async () => {
  const fetcher = vi.fn().mockResolvedValue(
    new Response(
      `data: ${JSON.stringify({
        type: 'answer',
        answer: {
          status: 'insufficient_evidence',
          paragraphs: [],
          sources: [],
          limitations: ['해당 자료가 없습니다.'],
          metadata: unavailableStatus,
        },
      })}\n\n`,
      { headers: { 'Content-Type': 'text/event-stream' } },
    ),
  );
  vi.stubGlobal('fetch', fetcher);
  const store = createStore();
  store.set(searchModeState, 'chat');
  render(
    <StrictMode>
      <Provider store={store}>
        <HeaderSearchField />
        <AskClient />
      </Provider>
    </StrictMode>,
  );
  const input = screen.getByRole('textbox', { name: '법안에 관한 질문' });
  fireEvent.compositionStart(input);
  fireEvent.change(input, { target: { value: '주거 지원 법안은?' } });
  fireEvent.keyDown(input, { key: 'Enter', keyCode: 229, isComposing: true });
  expect(fetcher).not.toHaveBeenCalled();
  fireEvent.compositionEnd(input);
  fireEvent.keyDown(input, { key: 'Enter', keyCode: 13 });
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  expect(JSON.parse(fetcher.mock.calls[0][1].body).question).toBe('주거 지원 법안은?');
  await screen.findByText('확인한 법안 자료에서 답변할 근거를 찾지 못했습니다.');
});
