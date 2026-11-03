'use client';

import { useInfiniteQuery, useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { nextBillPage } from '@/lib/billQueries';
import { BILL_TAB } from '@/constants';
import type { BaseResponse, PartyDetailResponse, ValueOf } from '@/types';
import { getBillByParty, getPartyDetail, getPartyCongressman, patchPartyFollow } from './api';

export const useGetBillByParty = (id: number, type: ValueOf<typeof BILL_TAB>) =>
  useInfiniteQuery({
    queryKey: ['/party/bill', id, type],
    queryFn: ({ pageParam }: { pageParam: number }) => getBillByParty(id, type, pageParam),
    initialPageParam: 0,
    getNextPageParam: nextBillPage,
  });

export const useGetPartyDetail = (partyId: number) =>
  useQuery({
    queryKey: ['/party/detail', partyId],
    queryFn: () => getPartyDetail(partyId),
  });

export const useGetPartyCongressman = (partyId: number) =>
  useQuery({
    queryKey: ['/party/congressman', { party_id: partyId }],
    queryFn: () => getPartyCongressman(partyId),
  });

export const usePatchPartyFollow = (partyId: number) => {
  const queryClient = useQueryClient();

  const detailKey = ['/party/detail', partyId];
  return useMutation({
    mutationFn: async (followChecked: boolean) => {
      const { data } = await patchPartyFollow(partyId, followChecked);
      if (data?.follow_checked !== followChecked) throw new Error('팔로우 상태를 확인하지 못했습니다.');
      return followChecked;
    },
    onSuccess: async (followed) => {
      queryClient.setQueryData<BaseResponse<PartyDetailResponse>>(detailKey, (previous) => {
        if (!previous?.data || previous.data.followed === followed) return previous;
        return {
          ...previous,
          data: {
            ...previous.data,
            followed: followed,
            follow_count: Math.max(0, previous.data.follow_count + (followed ? 1 : -1)),
          },
        };
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: detailKey }),
        queryClient.invalidateQueries({ queryKey: ['/user/following/party'] }),
      ]);
    },
  });
};
