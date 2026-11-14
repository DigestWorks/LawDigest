'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { nextBillPage } from '@/lib/billQueries';
import { getCommitteeBills } from './api';

export const useGetCommitteeBills = (name: string) =>
  useInfiniteQuery({
    queryKey: ['/committee/bill', name],
    queryFn: ({ pageParam }: { pageParam: number }) => getCommitteeBills(name, pageParam),
    initialPageParam: 0,
    getNextPageParam: nextBillPage,
  });
