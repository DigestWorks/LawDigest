import http from '@/api/config/core';
import { FeedResponse, FeedPopularResponse } from '@/types';

export const getBillByStage = async (page: number, stage: string) =>
  http.get<FeedResponse>({
    url: '/bill/mainfeed',
    params: { page, size: 10, stage },
  });

export const getBillPopular = async () =>
  http.get<FeedPopularResponse>({
    url: `/bill/popular`,
  });
