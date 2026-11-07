import { dehydrate } from '@tanstack/react-query';
import ListHydrationBoundary from '@/lib/ListHydrationBoundary';
import getQueryClient from '@/lib/getQueryClient';
import { searchBillOptions, searchPeopleOptions } from '@/lib/billQueries';
import { canSearchBills, decodeSearchParam } from '@/lib/search';
import SearchResultClient from './SearchResultClient';
import getMetadata from '@/utils/getMetadata';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const keyword = decodeSearchParam(id);
  return getMetadata({
    title: keyword ? `‘${keyword}’ 검색 결과` : '검색',
    description: '국회 법안, 의원과 정당을 검색합니다.',
    asPath: `/search/${encodeURIComponent(keyword)}`,
    noIndex: true,
  });
}

export default async function SearchResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const keyword = decodeSearchParam(id);
  const client = getQueryClient();
  await Promise.all([
    keyword ? client.prefetchQuery(searchPeopleOptions(keyword)) : Promise.resolve(),
    canSearchBills(keyword) ? client.prefetchInfiniteQuery(searchBillOptions(keyword)) : Promise.resolve(),
  ]);
  return (
    <ListHydrationBoundary state={dehydrate(client)}>
      <SearchResultClient keyword={keyword} />
    </ListHydrationBoundary>
  );
}
