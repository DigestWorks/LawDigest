import http from '@/api/config/core';
import { BillListItem, FeedResponse, FeedPopularResponse } from '@/types';

export const getBillByStage = async (page: number, stage: string) =>
  http.get<FeedResponse<BillListItem>>({
    url: '/bill/mainfeed',
    params: { page, size: 10, stage, compact: true },
  });

export const getBillPopular = async () =>
  http.get<FeedPopularResponse>({
    url: `/bill/popular`,
    params: { compact: true },
  });
