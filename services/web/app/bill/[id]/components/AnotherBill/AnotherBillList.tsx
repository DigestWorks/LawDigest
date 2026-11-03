'use client';

import { useId, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { BillProps, SimilarBill } from '@/types';
import { Button } from '@/components/ui/button';
import { nextBillPage } from '@/lib/billQueries';
import { getSimilarBills } from '../../apis/apis';
import AnotherBill from './AnotherBill';

function RelatedPageList({
  billId,
  count,
  current,
  initialBills,
}: {
  billId: string;
  count: number;
  current?: boolean;
  initialBills?: SimilarBill[];
}) {
  const query = useInfiniteQuery({
    queryKey: ['/bill/similar', billId, current],
    queryFn: ({ pageParam }) => getSimilarBills(billId, pageParam, current),
    initialPageParam: 0,
    getNextPageParam: nextBillPage,
    staleTime: 60_000,
    initialData: initialBills && {
      pageParams: [0],
      pages: [
        {
          code: 200,
          message: '',
          data: {
            bill_list: initialBills.slice(0, 5),
            total_count: count,
            pagination_response: { last_page: count <= 5, page_number: 0 },
          },
        },
      ],
    },
  });
  let group = '';
  if (current === true) group = '현재 대수';
  if (current === false) group = '이전 대수';
  const seen = new Set<string>();
  const bills = (query.data?.pages ?? [])
    .flatMap(({ data }) => data.bill_list)
    .filter(({ billId }) => {
      if (seen.has(billId)) return false;
      seen.add(billId);
      return true;
    });

  return (
    <div className="flex flex-col gap-3">
      {query.isPending && <p role="status">개정안을 불러오는 중입니다.</p>}
      {query.isError && !query.data && (
        <div className="flex flex-col gap-2">
          <p role="alert">개정안을 불러오지 못했습니다.</p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            다시 불러오기
          </Button>
        </div>
      )}
      {query.isSuccess && !bills.length && (
        <p className="text-sm text-muted-foreground">관련된 다른 개정안이 없습니다.</p>
      )}
      {bills.map((bill) => (
        <AnotherBill key={bill.billId} {...bill} previous={current === false} />
      ))}
      {query.isFetchNextPageError && <p role="alert">다음 개정안을 불러오지 못했습니다.</p>}
      {query.hasNextPage && (
        <Button variant="outline" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
          {query.isFetchingNextPage ? '불러오는 중…' : `${group || '다른'} 개정안 더 보기`}
        </Button>
      )}
      {!query.hasNextPage && bills.length > 5 && (
        <p className="text-sm text-muted-foreground">
          {group ? `${group} 개정안을 모두` : '모든 개정안을'} 확인했습니다.
        </p>
      )}
    </div>
  );
}

export default function AnotherBillList({
  bill_info_dto,
  similar_bills = [],
  similar_bills_count,
  previous_similar_bills_count,
}: BillProps) {
  const count = similar_bills_count ?? similar_bills.length;
  const previousCount = previous_similar_bills_count ?? 0;
  const scoped = previous_similar_bills_count !== undefined;
  const previousId = useId();
  const [showPrevious, setShowPrevious] = useState(false);
  const billId = bill_info_dto.bill_id;

  return (
    <section className="flex flex-col gap-4 lg:gap-6">
      <h2 className="text-xl font-semibold">
        {bill_info_dto.bill_name}의 다른 개정안{' '}
        {scoped ? null : <span className="text-muted-foreground">{count.toLocaleString('ko-KR')}건</span>}
      </h2>
      {scoped && <h3 className="font-medium">현재 대수 · {count.toLocaleString('ko-KR')}건</h3>}
      <RelatedPageList billId={billId} count={count} current={scoped ? true : undefined} initialBills={similar_bills} />
      {previousCount > 0 && (
        <>
          <Button
            type="button"
            variant="outline"
            aria-expanded={showPrevious}
            aria-controls={previousId}
            onClick={() => setShowPrevious((value) => !value)}>
            이전 대수 {previousCount.toLocaleString('ko-KR')}건 {showPrevious ? '접기' : '보기'}
          </Button>
          <div id={previousId} hidden={!showPrevious}>
            {showPrevious && <RelatedPageList billId={billId} count={previousCount} current={false} />}
          </div>
        </>
      )}
    </section>
  );
}
