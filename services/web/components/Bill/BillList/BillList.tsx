import { BillResponse } from '@/types';
import { RefObject } from 'react';
import { Spinner } from '@heroui/spinner';
import { Button } from '@/components/ui/button';
import Bill from './Bill';
import { filterUniqueBills } from './filterUniqueBills';

export default function BillList({
  bills,
  isFetching,
  fetchRef,
  detail,
  hasNextPage = false,
  onLoadMore,
  error = false,
}: {
  bills: BillResponse[];
  isFetching: boolean;
  fetchRef: RefObject<HTMLDivElement | null>;
  detail?: boolean;
  hasNextPage?: boolean;
  onLoadMore?: () => void;
  error?: boolean;
}) {
  const uniqueBills = filterUniqueBills(bills);

  return (
    <section className="max-w-full xl:w-[840px] pb-28">
      {uniqueBills.map((bill) => (
        <Bill key={bill.bill_info_dto.bill_id} {...bill} detail={detail} />
      ))}
      {isFetching && (
        <div className="flex justify-center w-full my-4" role="status" aria-label="법안 불러오는 중">
          <Spinner color="default" />
        </div>
      )}
      {hasNextPage && !error && <div ref={fetchRef} className="h-4 w-full" aria-hidden="true" />}
      {hasNextPage && onLoadMore && (
        <div className="flex flex-col items-center gap-2 py-6">
          {error && <p role="alert">다음 법안을 불러오지 못했습니다.</p>}
          <Button variant="outline" onClick={onLoadMore} disabled={isFetching}>
            {error ? '다시 불러오기' : '법안 더 불러오기'}
          </Button>
        </div>
      )}
      {!hasNextPage && !isFetching && bills.length > 0 && (
        <p className="py-6 text-sm text-center text-muted-foreground">목록의 끝입니다.</p>
      )}
    </section>
  );
}
