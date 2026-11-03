import { dehydrate } from '@tanstack/react-query';
import ListHydrationBoundary from '@/lib/ListHydrationBoundary';
import getQueryClient from '@/lib/getQueryClient';
import { searchBillOptions, searchPeopleOptions } from '@/lib/billQueries';
import { canSearchBills, decodeSearchParam } from '@/lib/search';
import SearchResultClient from './SearchResultClient';

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
