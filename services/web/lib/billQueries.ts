import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import { Pagination } from '@/types/type/common/pagination';
import { getBillByStage } from '@/components/Feed/Feed/apis/apis';
import { getSearchBill, getSearchCongressmanParty } from '@/app/search/apis/apis';

export function nextBillPage(response: { data: { pagination_response: Pagination } }) {
  const page = response.data?.pagination_response;
  return page && !page.last_page && Number.isInteger(page.page_number) ? page.page_number + 1 : undefined;
}

export const feedQueryOptions = (stage: string) =>
  infiniteQueryOptions({
    queryKey: ['/bill/mainfeed', stage],
    queryFn: ({ pageParam }) => getBillByStage(pageParam, stage),
    initialPageParam: 0,
    getNextPageParam: nextBillPage,
    staleTime: 60_000,
  });

export const searchBillOptions = (keyword: string) =>
  infiniteQueryOptions({
    queryKey: ['/search/bill', keyword],
    queryFn: ({ pageParam }) => getSearchBill(keyword, pageParam),
    initialPageParam: 0,
    getNextPageParam: nextBillPage,
    staleTime: 60_000,
  });

export const searchPeopleOptions = (keyword: string) =>
  queryOptions({
    queryKey: ['/search/congressman/party', keyword],
    queryFn: () => getSearchCongressmanParty(keyword),
    staleTime: 60_000,
  });
