'use client';

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { nextBillPage } from '@/lib/billQueries';
import { getTimelineFeed, getTimelineBillState } from './apis';

export const useGetTimelineFeed = () =>
  useInfiniteQuery({
    queryKey: ['/time-line/feed/paging'],
    queryFn: ({ pageParam }: { pageParam: number }) => getTimelineFeed(pageParam),
    initialPageParam: 0,
    getNextPageParam: nextBillPage,
    staleTime: 60_000,
  });

export const useGetTimelineBillState = () =>
  useQuery({
    queryKey: ['/time-line/bill-state'],
    queryFn: () => getTimelineBillState(),
  });
