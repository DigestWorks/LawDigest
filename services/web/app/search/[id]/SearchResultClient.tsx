'use client';

import { BillList, SearchBarButton } from '@/components';
import { useIntersect } from '@/hooks';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { canSearchBills } from '@/lib/search';
import { useListScrollRestoration } from '@/hooks/useListScrollRestoration';
import { useGetSearchCongressmanParty, useGetSearchBill } from '../apis';
import { SearchList } from './components';

export default function SearchResultClient({ keyword }: { keyword: string }) {
  const people = useGetSearchCongressmanParty(keyword);
  const bill = useGetSearchBill(keyword);
  const peopleResults = people.data?.data.search_response ?? [];
  const bills = bill.data?.pages.flatMap(({ data }) => data.search_response) ?? [];
  const billEnabled = canSearchBills(keyword);
  useListScrollRestoration(
    `/search/${encodeURIComponent(keyword)}`,
    Boolean(people.data || people.isError) && (!billEnabled || Boolean(bill.data || bill.isError)),
  );
  const fetchRef = useIntersect(() => {
    if (bill.hasNextPage && !bill.isFetching && !bill.isFetchNextPageError) void bill.fetchNextPage();
  });
  if (!keyword)
    return (
      <>
        <SearchBarButton />
        <p className="px-5 py-8 text-center">검색어를 입력해 주세요.</p>
      </>
    );
  return (
    <>
      <SearchBarButton keyword={keyword} />
      <section className="lg:w-[840px] mx-auto">
        <h1 className="px-5 my-5 text-xl font-semibold">‘{keyword}’ 검색 결과</h1>
        <section className="mb-10" aria-labelledby="people-results">
          <h2 id="people-results" className="mx-5 text-lg font-semibold">
            의원 · 정당
          </h2>
          <Separator className="mx-5 my-3 w-auto" />
          {people.isPending && (
            <div className="flex flex-col gap-3 mx-5" role="status" aria-label="의원·정당 검색 중">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          )}
          {people.isError && (
            <div className="flex flex-col items-center gap-3 py-6" role="alert">
              <p>의원·정당 검색 결과를 불러오지 못했습니다.</p>
              <Button variant="outline" onClick={() => void people.refetch()}>
                다시 검색
              </Button>
            </div>
          )}
          {people.isSuccess &&
            (peopleResults.length ? (
              <SearchList key={keyword} searchResults={peopleResults} />
            ) : (
              <p className="py-6 text-center text-muted-foreground">일치하는 의원·정당이 없습니다.</p>
            ))}
        </section>
        <section aria-labelledby="bill-results">
          <h2 id="bill-results" className="mx-5 text-lg font-semibold">
            법안
          </h2>
          <Separator className="mx-5 my-3 w-auto" />
          {!billEnabled && (
            <p className="px-5 py-6 text-muted-foreground">법안은 두 글자 이상의 이름이나 단어로 검색해 주세요.</p>
          )}
          {billEnabled && bill.isError && !bill.data && (
            <div className="flex flex-col items-center gap-3 py-6" role="alert">
              <p>법안 검색 결과를 불러오지 못했습니다.</p>
              <Button variant="outline" onClick={() => void bill.refetch()}>
                다시 검색
              </Button>
            </div>
          )}
          {billEnabled && (
            <BillList
              bills={bills}
              isFetching={bill.isPending || bill.isFetchingNextPage}
              fetchRef={fetchRef}
              hasNextPage={bill.hasNextPage}
              error={bill.isFetchNextPageError}
              onLoadMore={() => void bill.fetchNextPage()}
            />
          )}
          {billEnabled && bill.isSuccess && bills.length === 0 && (
            <p className="py-6 text-center text-muted-foreground">일치하는 법안이 없습니다.</p>
          )}
        </section>
      </section>
    </>
  );
}
