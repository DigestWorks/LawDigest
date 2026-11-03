import type { FeedAssembly } from '@/lib/feedState';
import http from '@/api/config/core';
import { BillListItem, FeedResponse, FeedPopularResponse } from '@/types';

export const getBillByStage = async (page: number, stage: string, assembly: FeedAssembly) =>
  http.get<FeedResponse<BillListItem>>({
    url: '/bill/mainfeed',
    params: { page, size: 10, stage, assembly, compact: true },
  });

export const getBillPopular = async () =>
  http.get<FeedPopularResponse>({
    url: `/bill/popular`,
    params: { compact: true },
  });
