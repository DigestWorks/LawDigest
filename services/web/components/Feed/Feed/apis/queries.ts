'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { FeedAssembly } from '@/lib/feedState';
import { feedQueryOptions } from '@/lib/billQueries';
import { getBillPopular } from './apis';

export const useGetBillByStage = (stage: string, assembly: FeedAssembly, enabled = true) =>
  useInfiniteQuery({ ...feedQueryOptions(stage, assembly), enabled });

export const useGetBillPopular = (enabled = true) =>
  useQuery({
    queryKey: ['/bill/popular'],
    queryFn: () => getBillPopular(),
    enabled,
  });
