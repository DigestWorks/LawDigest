import { QueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { getFollowingBill, getFollowingCongressman } from './apis';
import { nextBillPage } from '@/lib/billQueries';

export const useGetFollowingCongressman = (queryClient: QueryClient) =>
  queryClient.fetchQuery({
    queryKey: ['/following-tab/congressman'],
    queryFn: () => getFollowingCongressman(),
  });

export const useGetFollowingBill = (enabled = true) =>
  useInfiniteQuery({
    queryKey: ['/following-tab/bill'],
    queryFn: ({ pageParam }: { pageParam: number }) => getFollowingBill(pageParam),
    initialPageParam: 0,
    getNextPageParam: nextBillPage,
    enabled,
  });
