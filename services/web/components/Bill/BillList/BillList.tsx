import { BillListItem } from '@/types';
import { RefObject } from 'react';
import { BillListSkeleton, useSkeletonGate } from '@/components/common/Skeletons';
import { Button } from '@/components/ui/button';
import Bill from './Bill';
import { filterUniqueBills } from './filterUniqueBills';

export default function BillList({
  bills,
  isFetching,
  fetchRef,
  detail,
  headingLevel,
  hasNextPage = false,
  onLoadMore,
  error = false,
}: {
  bills: BillListItem[];
  isFetching: boolean;
  fetchRef: RefObject<HTMLDivElement | null>;
  detail?: boolean;
  headingLevel?: 2 | 3;
  hasNextPage?: boolean;
  onLoadMore?: () => void;
  error?: boolean;
}) {
  const uniqueBills = filterUniqueBills(bills);
  // 첫 목록은 스켈레톤이 보였다면 최소 표시 시간을 지킨다. 다음 페이지 스켈레톤은 목록 끝에 붙으므로 그대로 둔다.
  const firstLoad = useSkeletonGate(isFetching && uniqueBills.length === 0);

  if (firstLoad) {
    return (
      <section className="max-w-full xl:w-[840px] pb-28">
        <BillListSkeleton />
      </section>
    );
  }

  return (
    <section className="max-w-full xl:w-[840px] pb-28">
      {uniqueBills.map((bill) => (
        <Bill key={bill.bill_info_dto.bill_id} {...bill} detail={detail} headingLevel={headingLevel} />
      ))}
      {isFetching && <BillListSkeleton count={uniqueBills.length ? 1 : 3} />}
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
