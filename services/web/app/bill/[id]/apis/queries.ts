'use client';

import { queryOptions, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
import type { BaseResponse, BillResponse } from '@/types';
import { getBillDetail, postBookmark } from './apis';

const bookmarkListKeys = [
  '/bill/mainfeed',
  '/bill/popular',
  '/search/bill',
  '/following-tab/bill',
  '/user/bookmarking/bill',
  '/user/bookmarking/bill/count',
  '/party/bill',
  '/congressman/bill_info',
  '/bill/category',
];

export const billDetailQueryOptions = (billId: string, personalized = false) =>
  queryOptions({
    queryKey: ['/bill/detail', billId, personalized ? 'personalized' : 'public'],
    queryFn: () => getBillDetail(billId),
    staleTime: personalized ? 0 : 60_000,
    ...(personalized && { gcTime: 0 }),
  });

export const useGetBillDetail = (billId: string, queryClient: QueryClient) =>
  queryClient.fetchQuery(billDetailQueryOptions(billId));

export const usePatchBookmark = (billId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (likeChecked: boolean) => {
      const { data } = await postBookmark(billId, likeChecked);
      if (data?.like_checked !== likeChecked) throw new Error('스크랩 상태를 확인하지 못했습니다.');
      return likeChecked;
    },
    onSuccess: async (bookmarked) => {
      queryClient.setQueryData<BaseResponse<BillResponse>>(
        billDetailQueryOptions(billId, true).queryKey,
        (previous) => {
          if (!previous?.data || previous.data.is_book_mark === bookmarked) return previous;
          const { bill_info_dto } = previous.data;
          return {
            ...previous,
            data: {
              ...previous.data,
              is_book_mark: bookmarked,
              bill_info_dto: {
                ...bill_info_dto,
                bill_like_count: Math.max(0, bill_info_dto.bill_like_count + (bookmarked ? 1 : -1)),
              },
            },
          };
        },
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/bill/detail', billId] }),
        ...bookmarkListKeys.map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
      ]);
    },
  });
};
