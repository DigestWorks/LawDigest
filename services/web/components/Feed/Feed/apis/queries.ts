'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { feedQueryOptions } from '@/lib/billQueries';
import { getBillPopular } from './apis';

export const useGetBillByStage = (stage: string, enabled = true) =>
  useInfiniteQuery({ ...feedQueryOptions(stage), enabled });

export const useGetBillPopular = (enabled = true) =>
  useQuery({
    queryKey: ['/bill/popular'],
    queryFn: () => getBillPopular(),
    enabled,
  });
