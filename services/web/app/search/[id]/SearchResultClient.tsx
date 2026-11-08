'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { BillList, SearchBarButton } from '@/components';
import { useIntersect } from '@/hooks';
import { Button } from '@/components/ui/button';
import { PeopleRowsSkeleton, useSkeletonGate } from '@/components/common/Skeletons';
import { Separator } from '@/components/ui/separator';
import { canSearchBills } from '@/lib/search';
import { useListScrollRestoration } from '@/hooks/useListScrollRestoration';
import { useGetSearchCongressmanParty, useGetSearchBill } from '../apis';
import { SearchList } from './components';

const RESULT_TYPES = [
  { value: 'all', label: '전체' },
  { value: 'bill', label: '법안' },
  { value: 'member', label: '의원' },
  { value: 'party', label: '정당' },
] as const;
type ResultType = (typeof RESULT_TYPES)[number]['value'];

export default function SearchResultClient({ keyword }: { keyword: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected = RESULT_TYPES.find(({ value }) => value === searchParams.get('type'))?.value ?? 'all';
  const expanded = searchParams.get('expanded') === '1' && (selected === 'member' || selected === 'party');
  const showPeople = selected !== 'bill';
  const showBills = selected === 'all' || selected === 'bill';
  const people = useGetSearchCongressmanParty(keyword);
  const peopleSkeleton = useSkeletonGate(people.isPending);
  const bill = useGetSearchBill(keyword);
  const peopleResults = people.data?.data.search_response ?? [];
  const members = peopleResults.filter((result) => result.search_type === 'CONGRESSMAN');
  const parties = peopleResults.filter((result) => result.search_type === 'PARTY');
  const bills = bill.data?.pages.flatMap(({ data }) => data.search_response) ?? [];
  const billEnabled = canSearchBills(keyword);
  const counts = {
    all: '',
    bill: bill.isSuccess ? `${bills.length.toLocaleString('ko-KR')}${bill.hasNextPage ? '+' : ''}` : '',
    member: people.isSuccess ? members.length.toLocaleString('ko-KR') : '',
    party: people.isSuccess ? parties.length.toLocaleString('ko-KR') : '',
  };
  const peopleGroups = [
    { type: 'member', label: '의원', results: members },
    { type: 'party', label: '정당', results: parties },
  ] as const;
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
        <div className="mx-5 mb-5 flex flex-wrap gap-2" role="group" aria-label="검색 결과 유형">
          {RESULT_TYPES.map(({ value, label }) => (
            <Button
              key={value}
              type="button"
              variant={selected === value ? 'default' : 'outline'}
              size="sm"
              aria-pressed={selected === value}
              onClick={() => selectType(value)}>
              {label}
              {counts[value] && ` ${counts[value]}`}
            </Button>
          ))}
        </div>
        {showPeople && peopleSkeleton && <PeopleRowsSkeleton />}
        {showPeople && people.isError && (
          <div className="flex flex-col items-center gap-3 py-6" role="alert">
            <p>의원·정당 검색 결과를 불러오지 못했습니다.</p>
            <Button variant="outline" onClick={() => void people.refetch()}>
              다시 검색
            </Button>
          </div>
        )}
        {showPeople &&
          people.isSuccess &&
          !peopleSkeleton &&
          peopleGroups
            .filter(({ type, results }) => selected === type || (selected === 'all' && results.length > 0))
            .map(({ type, label, results }) => (
              <section key={type} className="mb-6" aria-labelledby={`${type}-results`}>
                <h2 id={`${type}-results`} className="mx-5 text-lg font-semibold">
                  {label}
                </h2>
                <Separator className="mx-5 my-3 w-auto" />
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
                  <p className="px-5 py-6 text-muted-foreground">일치하는 {label}이 없습니다.</p>
                )}
              </section>
            ))}
        {showBills && (
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
                headingLevel={3}
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
        )}
      </section>
    </>
  );
}
