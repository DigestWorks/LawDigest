import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BaseResponse, SearchBillResponse } from '@/types';
import { getSearchBill } from './apis';
import { useGetSearchBill } from './queries';

vi.mock('./apis', () => ({ getSearchBill: vi.fn(), getSearchCongressmanParty: vi.fn() }));
vi.mock('@/components/Feed/Feed/apis/apis', () => ({ getBillByStage: vi.fn() }));

function response(id: string, page: number, last: boolean): BaseResponse<SearchBillResponse> {
  return {
    code: 200,
    message: '',
    data: {
      pagination_response: { last_page: last, page_number: page },
      search_response: [
        {
          bill_info_dto: {
            bill_id: id,
            bill_name: id,
            title: id,
            propose_date: '2026-11-01',
            summary: '',
            gpt_summary: '',
            view_count: 0,
            bill_like_count: 0,
            bill_stage: '접수',
            bill_result: '',
          },
          representative_proposer_dto_list: [],
          public_proposer_dto_list: [],
          is_book_mark: false,
        },
      ],
    },
  };
}
function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('검색 결과 캐시와 페이지', () => {
  beforeEach(() => vi.clearAllMocks());

  it('검색어 변경 중 이전 검색 결과를 새 검색어의 결과로 보여 주지 않는다', async () => {
    let resolveNext!: (value: BaseResponse<SearchBillResponse>) => void;
    const next = new Promise<BaseResponse<SearchBillResponse>>((resolve) => {
      resolveNext = resolve;
    });
    vi.mocked(getSearchBill).mockImplementation((keyword) =>
      keyword === '의료법' ? Promise.resolve(response('의료법 결과', 0, true)) : next,
    );
    const { result, rerender } = renderHook(({ keyword }) => useGetSearchBill(keyword), {
      initialProps: { keyword: '의료법' },
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    rerender({ keyword: '소방' });
    expect(result.current.data).toBeUndefined();
    await act(async () => resolveNext(response('소방 결과', 0, true)));
    await waitFor(() =>
      expect(result.current.data?.pages[0].data.search_response[0].bill_info_dto.bill_id).toBe('소방 결과'),
    );
  });

  it('다음 페이지를 추가하고 마지막 페이지 이후 요청을 멈춘다', async () => {
    vi.mocked(getSearchBill).mockImplementation((_, page) =>
      Promise.resolve(response(`법안 ${page}`, page, page === 1)),
    );
    const { result } = renderHook(
      () => {
        const query = useGetSearchBill('의료법');
        // 실제 화면처럼 렌더 중 data와 페이지 상태를 구독한다.
        return {
          data: query.data,
          hasNextPage: query.hasNextPage,
          isSuccess: query.isSuccess,
          fetchNextPage: query.fetchNextPage,
        };
      },
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect(getSearchBill).toHaveBeenNthCalledWith(2, '의료법', 1);
    expect(result.current.hasNextPage).toBe(false);
    await act(async () => {
      await result.current.fetchNextPage();
    });
    expect(getSearchBill).toHaveBeenCalledTimes(2);
  });
});
