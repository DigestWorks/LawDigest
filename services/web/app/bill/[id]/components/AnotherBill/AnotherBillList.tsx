'use client';
import { useInfiniteQuery } from '@tanstack/react-query';
import { BillProps } from '@/types';
import { Button } from '@/components/ui/button';
import { nextBillPage } from '@/lib/billQueries';
import { getSimilarBills } from '../../apis/apis';
import AnotherBill from './AnotherBill';

export default function AnotherBillList({ bill_info_dto, similar_bills = [], similar_bills_count }: BillProps) {
  const count = similar_bills_count ?? similar_bills.length;
  const query = useInfiniteQuery({
    queryKey: ['/bill/similar', bill_info_dto.bill_id],
    queryFn: ({ pageParam }) => getSimilarBills(bill_info_dto.bill_id, pageParam),
    initialPageParam: 0,
    getNextPageParam: nextBillPage,
    staleTime: 60_000,
    initialData: {
      pageParams: [0],
      pages: [
        {
          code: 200,
          message: '',
          data: {
            bill_list: similar_bills.slice(0, 5),
            total_count: count,
            pagination_response: { last_page: count <= 5, page_number: 0 },
          },
        },
      ],
    },
  });
  const seen = new Set<string>();
  const bills = query.data.pages
    .flatMap(({ data }) => data.bill_list)
    .filter((bill) => {
      if (seen.has(bill.billId)) return false;
      seen.add(bill.billId);
      return true;
    });
  return (
    <section className="flex flex-col gap-4 lg:gap-6">
      <h2 className="text-xl font-semibold">
        {bill_info_dto.bill_name}의 다른 개정안{' '}
        <span className="text-muted-foreground">{count.toLocaleString()}건</span>
      </h2>
      {count === 0 && <p className="text-sm text-muted-foreground">관련된 다른 개정안이 없습니다.</p>}
      {bills.map((bill) => (
        <AnotherBill key={bill.billId} {...bill} />
      ))}
      {query.isFetchNextPageError && <p role="alert">다른 개정안을 불러오지 못했습니다.</p>}
      {query.hasNextPage && (
        <Button variant="outline" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
          {query.isFetchingNextPage ? '불러오는 중…' : '다른 개정안 더 보기'}
        </Button>
      )}
      {!query.hasNextPage && bills.length > 5 && (
        <p className="text-sm text-muted-foreground">모든 개정안을 확인했습니다.</p>
      )}
    </section>
  );
}
