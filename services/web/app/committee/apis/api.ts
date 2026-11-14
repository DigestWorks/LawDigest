import http from '@/api';
import type { BillListItem, FeedResponse } from '@/types';

export const getCommitteeBills = (name: string, page: number) =>
  http.get<FeedResponse<BillListItem>>({
    url: '/committee/bill',
    params: { name, page, size: 10, compact: true },
  });
