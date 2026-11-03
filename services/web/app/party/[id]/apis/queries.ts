'use client';

import { useInfiniteQuery, useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { nextBillPage } from '@/lib/billQueries';
import { BILL_TAB } from '@/constants';
import { ValueOf } from '@/types';
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

  return useMutation({
    mutationFn: (followChecked: boolean) => patchPartyFollow(partyId, followChecked),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/party/detail', partyId] });
    },
  });
};
