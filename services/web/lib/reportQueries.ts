import { infiniteQueryOptions } from '@tanstack/react-query';
import http from '@/api/config/core';
import { nextBillPage } from '@/lib/billQueries';
import type { Pagination } from '@/types/type/common/pagination';

export interface ReportCard {
  bill_id: string;
  title: string;
  bill_name: string;
  bill_number: number;
  assembly_number: number;
  published_at: string;
}

export interface ReportDetail {
  report: ReportCard;
  markdown: string;
}

interface ReportPage {
  report_list: ReportCard[];
  pagination_response: Pagination;
}

export function reportDateLabel(timestamp: string) {
  const date = new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(timestamp) ? timestamp : `${timestamp}Z`);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export const reportQueryOptions = () =>
  infiniteQueryOptions({
    queryKey: ['/reports'],
    queryFn: ({ pageParam }) => http.get<ReportPage>({ url: '/reports', params: { page: pageParam, size: 10 } }),
    initialPageParam: 0,
    getNextPageParam: nextBillPage,
    staleTime: 60_000,
  });
