'use client';

import { QueryClient, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { nextBillPage } from '@/lib/billQueries';
import { BILL_TAB } from '@/constants';
import { ValueOf } from '@/types';
import { getBillByCongressmanId, getCongressmanDetail, patchCongressmanFollow } from './apis';

export const useGetBillByCongressman = (id: string, type: ValueOf<typeof BILL_TAB>) =>
  useInfiniteQuery({
    queryKey: ['/congressman/bill_info', id, type],
    queryFn: ({ pageParam }: { pageParam: number }) => getBillByCongressmanId(pageParam, id, type),
    initialPageParam: 0,
    getNextPageParam: nextBillPage,
  });

export const useGetCongressmanDetail = ({
  congressmanId,
  queryClient,
}: {
  congressmanId: string;
  queryClient: QueryClient;
}) =>
  queryClient.fetchQuery({
    queryKey: ['/congressman/detail', congressmanId],
    queryFn: () => getCongressmanDetail(congressmanId),
  });

export const usePatchCongressmanFollow = (congressmanId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (likeChecked: boolean) => patchCongressmanFollow(congressmanId, likeChecked),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/congressman/detail', congressmanId] });
    },
  });
};
