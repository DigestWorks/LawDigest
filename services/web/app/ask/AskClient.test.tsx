import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'jotai';
import { afterEach, expect, it, vi } from 'vitest';
import AskClient from './AskClient';
import { unavailableStatus } from '@/lib/rag';

vi.mock('@/hooks/useRagConversation', async (original) => ({
  ...(await original<typeof import('@/hooks/useRagConversation')>()),
  useRagStatus: () => ({
    data: { ...unavailableStatus, available: true },
    isPending: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
}));
// 스크롤 기하·브라우저 조작은 실제 화면에서 검증한다. 이 검사는 입력 이벤트에 한정한다.
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
    Response.json({
      status: 'insufficient_evidence',
      paragraphs: [],
      sources: [],
      limitations: ['해당 자료가 없습니다.'],
      metadata: unavailableStatus,
    }),
  );
  vi.stubGlobal('fetch', fetcher);
  render(
    <Provider>
      <AskClient />
    </Provider>,
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
