'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useSetAtom } from 'jotai';
import { useIntersect } from '@/hooks';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { canSearchBills } from '@/lib/search';
import { searchEntryState } from '@/store';
import { useListScrollRestoration } from '@/hooks/useListScrollRestoration';
import useSearchEntry from '@/components/search/useSearchEntry';
import useSearchSuggestions from '@/components/search/useSearchSuggestions';
import { useGetSearchCongressmanParty, useGetSearchBill } from '../apis';
import { SearchList } from './components';
import SearchTypeTabs, { RESULT_TYPES, ResultType } from './components/SearchTypeTabs';
import SearchBillList from './components/SearchBillList';

function SectionHeading({ id, label, count }: { id: string; label: string; count?: string }) {
  return (
    <h2 id={id} className="flex items-baseline gap-1.5 px-5 pb-1 pt-6 text-base font-semibold md:px-4">
      {label}
      {count && <span className="text-sm font-medium tabular-nums text-muted-foreground">{count}</span>}
    </h2>
  );
}

function RetryBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-8 text-center" role="alert">
      <p>{message}</p>
      <Button variant="outline" className="rounded-full" onClick={onRetry}>
        다시 검색
      </Button>
    </div>
  );
}

function NoResults({ keyword }: { keyword: string }) {
  const { submit } = useSearchEntry();
  const { trending } = useSearchSuggestions(true);
  return (
    <section className="animate-fade-up px-5 py-14 text-center motion-reduce:animate-fade-in md:px-4">
      <p className="text-lg font-semibold [word-break:keep-all]">‘{keyword}’와 일치하는 결과가 없습니다.</p>
      {trending.length > 0 && (
        <>
          <h2 className="mt-8 text-xs font-semibold text-muted-foreground">지금 뜨는 키워드</h2>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {trending.map(({ keyword: item }) => (
              <button
                key={item}
                type="button"
                onClick={() => submit(item)}
                className="rounded-full border border-border px-3.5 py-2 text-[13px] font-medium transition-colors hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
                <span className="text-[#0088FF]">#</span> {item}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export default function SearchResultClient({ keyword }: { keyword: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const setEntry = useSetAtom(searchEntryState);
  const selected = RESULT_TYPES.find(({ value }) => value === searchParams.get('type'))?.value ?? 'all';
  const expanded = searchParams.get('expanded') === '1' && (selected === 'member' || selected === 'party');
  const showPeople = selected !== 'bill';
  const showBills = selected === 'all' || selected === 'bill';
  const people = useGetSearchCongressmanParty(keyword);
  const bill = useGetSearchBill(keyword);
  const peopleResults = people.data?.data.search_response ?? [];
  const members = peopleResults.filter((result) => result.search_type === 'CONGRESSMAN');
  const parties = peopleResults.filter((result) => result.search_type === 'PARTY');
  const bills = bill.data?.pages.flatMap(({ data }) => data.search_response) ?? [];
  const billEnabled = canSearchBills(keyword);
  const peopleSettled = people.isSuccess || people.isError;
  const billSettled = !billEnabled || bill.isSuccess || bill.isError;
  const counts: Record<ResultType, string> = {
    all: '',
    bill: bill.isSuccess ? `${bills.length.toLocaleString('ko-KR')}${bill.hasNextPage ? '+' : ''}` : '',
    member: people.isSuccess ? members.length.toLocaleString('ko-KR') : '',
    party: people.isSuccess ? parties.length.toLocaleString('ko-KR') : '',
  };
  const peopleGroups = [
    { type: 'member', label: '의원', results: members },
    { type: 'party', label: '정당', results: parties },
  ] as const;
  const nothingFound =
    people.isSuccess &&
    members.length === 0 &&
    parties.length === 0 &&
    (!billEnabled || (bill.isSuccess && bills.length === 0));

  // 헤더·하단 바의 검색 중 표시는 이 검색어의 첫 결과가 도착하면 멈춘다.
  useEffect(() => {
    if (!peopleSettled || !billSettled) return;
    setEntry((current) => (current.pending === keyword ? { ...current, pending: null } : current));
  }, [peopleSettled, billSettled, keyword, setEntry]);

  const selectType = (type: ResultType) => {
    if (selected === type) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete('expanded');
    if (type === 'all') params.delete('type');
    else params.set('type', type);
    window.history.pushState(null, '', `${pathname}${params.size ? `?${params}` : ''}`);
    window.scrollTo(0, 0);
  };

  const toggleExpanded = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (expanded) params.delete('expanded');
    else params.set('expanded', '1');
    window.history.replaceState(null, '', `${pathname}?${params}`);
  };

  useListScrollRestoration(
    `${pathname}?type=${selected}`,
    (!showPeople || Boolean(people.data || people.isError)) &&
      (!showBills || !billEnabled || Boolean(bill.data || bill.isError)),
  );
  const fetchRef = useIntersect(() => {
    if (bill.hasNextPage && !bill.isFetching && !bill.isFetchNextPageError) void bill.fetchNextPage();
  });

  if (!keyword) {
    return <p className="px-5 py-14 text-center text-muted-foreground">검색어를 입력해 주세요.</p>;
  }

  return (
    <section className="mx-auto w-full max-w-[720px] pt-4 md:pt-6">
      <h1 className="sr-only">‘{keyword}’ 검색 결과</h1>
      <div className="px-4 md:px-3">
        <SearchTypeTabs selected={selected} counts={counts} onSelect={selectType} />
      </div>

      {nothingFound ? (
        <NoResults keyword={keyword} />
      ) : (
        <div key={`${keyword}-${selected}`} className="animate-fade-in motion-reduce:animate-none">
          {showPeople && people.isPending && (
            <div className="flex flex-col gap-3 px-5 pt-6 md:px-4" role="status" aria-label="의원·정당 검색 중">
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          )}
          {showPeople && people.isError && (
            <RetryBlock message="의원·정당 검색 결과를 불러오지 못했습니다." onRetry={() => void people.refetch()} />
          )}
          {showPeople &&
            people.isSuccess &&
            peopleGroups
              .filter(({ type, results }) => selected === type || (selected === 'all' && results.length > 0))
              .map(({ type, label, results }) => (
                <section
                  key={type}
                  aria-labelledby={`${type}-results`}
                  className="animate-fade-up motion-reduce:animate-fade-in">
                  <SectionHeading id={`${type}-results`} label={label} count={counts[type]} />
                  {results.length ? (
                    <SearchList
                      key={`${keyword}-${selected}`}
                      searchResults={results}
                      kind={label}
                      expanded={expanded}
                      onToggleExpanded={toggleExpanded}
                      onShowCategory={selected === 'all' ? () => selectType(type) : undefined}
                    />
                  ) : (
                    <p className="px-5 py-6 text-muted-foreground md:px-4">일치하는 {label}이 없습니다.</p>
                  )}
                </section>
              ))}

          {showBills && (
            <section aria-labelledby="bill-results">
              <SectionHeading id="bill-results" label="법안" count={counts.bill} />
              {!billEnabled && (
                <p className="px-5 py-6 text-muted-foreground md:px-4">
                  법안은 두 글자 이상의 이름이나 단어로 검색해 주세요.
                </p>
              )}
              {billEnabled && bill.isError && !bill.data && (
                <RetryBlock message="법안 검색 결과를 불러오지 못했습니다." onRetry={() => void bill.refetch()} />
              )}
              {billEnabled && !(bill.isError && !bill.data) && (
                <SearchBillList
                  bills={bills}
                  keyword={keyword}
                  pending={bill.isPending}
                  fetchingNext={bill.isFetchingNextPage}
                  hasNextPage={bill.hasNextPage}
                  nextPageError={bill.isFetchNextPageError}
                  fetchRef={fetchRef}
                  onLoadMore={() => void bill.fetchNextPage()}
                />
              )}
              {billEnabled && bill.isSuccess && bills.length === 0 && (
                <p className="px-5 py-6 text-muted-foreground md:px-4">일치하는 법안이 없습니다.</p>
              )}
            </section>
          )}
        </div>
      )}
    </section>
  );
}
