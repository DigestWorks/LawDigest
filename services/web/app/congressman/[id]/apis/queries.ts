'use client';

import { useMutation, useInfiniteQuery, useQueryClient, useQuery } from '@tanstack/react-query';
import { nextBillPage } from '@/lib/billQueries';
import { BILL_TAB } from '@/constants';
import type { BaseResponse, CongressmanDetailResponse, ValueOf } from '@/types';
import { getBillByCongressmanId, getCongressmanDetail, patchCongressmanFollow } from './apis';

export const useGetBillByCongressman = (id: string, type: ValueOf<typeof BILL_TAB>) =>
  useInfiniteQuery({
    queryKey: ['/congressman/bill_info', id, type],
    queryFn: ({ pageParam }: { pageParam: number }) => getBillByCongressmanId(pageParam, id, type),
    initialPageParam: 0,
    getNextPageParam: nextBillPage,
  });

export const useGetCongressmanDetail = (congressmanId: string) =>
  useQuery({
    queryKey: ['/congressman/detail', congressmanId],
    queryFn: () => getCongressmanDetail(congressmanId),
  });

export const usePatchCongressmanFollow = (congressmanId: string) => {
  const queryClient = useQueryClient();

  const detailKey = ['/congressman/detail', congressmanId];
  return useMutation({
    mutationFn: async (likeChecked: boolean) => {
      const { data } = await patchCongressmanFollow(congressmanId, likeChecked);
      if (data?.like_checked !== likeChecked) throw new Error('팔로우 상태를 확인하지 못했습니다.');
      return likeChecked;
    },
    onSuccess: async (followed) => {
      queryClient.setQueryData<BaseResponse<CongressmanDetailResponse>>(detailKey, (previous) => {
        if (!previous?.data || previous.data.like_checked === followed) return previous;
        return {
          ...previous,
          data: {
            ...previous.data,
            like_checked: followed,
            follow_count: Math.max(0, previous.data.follow_count + (followed ? 1 : -1)),
          },
        };
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: detailKey }),
        queryClient.invalidateQueries({ queryKey: ['/user/liking/congressman'] }),
        queryClient.invalidateQueries({ queryKey: ['/following-tab/congressman'] }),
        queryClient.invalidateQueries({ queryKey: ['/following-tab/bill'] }),
      ]);
    },
  });
};
