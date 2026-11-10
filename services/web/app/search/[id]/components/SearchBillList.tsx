import { RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BillListItem } from '@/types';
import { filterUniqueBills } from '@/components/Bill/BillList/filterUniqueBills';
import SearchBillRow from './SearchBillRow';

/** 첫 화면에 차례로 떠오르는 줄 수 */
const STAGGER_ROWS = 10;

export function SearchBillRowSkeleton() {
  return (
    <div className="flex flex-col gap-2.5 px-5 py-4 md:px-4" aria-hidden="true">
      <Skeleton className="h-5 w-4/5" />
      <Skeleton className="h-4 w-2/5" />
      <div className="flex gap-3 pt-1">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-5 w-20" />
      </div>
    </div>
  );
}

export default function SearchBillList({
  bills,
  keyword,
  pending,
  fetchingNext,
  hasNextPage,
  nextPageError,
  fetchRef,
  onLoadMore,
}: {
  bills: BillListItem[];
  keyword: string;
  pending: boolean;
  fetchingNext: boolean;
  hasNextPage: boolean;
  nextPageError: boolean;
  fetchRef: RefObject<HTMLDivElement | null>;
  onLoadMore: () => void;
}) {
  const rows = filterUniqueBills(bills);
  return (
    <div className="pb-32">
      {pending ? (
        <div role="status" aria-label="법안 검색 중">
          {[0, 1, 2, 3].map((key) => (
            <SearchBillRowSkeleton key={key} />
          ))}
        </div>
      ) : (
        <ul key={keyword} className="divide-y divide-border/70 md:divide-y-0">
          {rows.map((bill, index) => (
            <SearchBillRow
              key={bill.bill_info_dto.bill_id}
              bill={bill}
              keyword={keyword}
              className={
                index < STAGGER_ROWS
                  ? 'animate-fade-up motion-reduce:animate-fade-in'
                  : 'animate-fade-in motion-reduce:animate-none'
              }
              style={index < STAGGER_ROWS ? { animationDelay: `${Math.min(index, 8) * 40}ms` } : undefined}
            />
          ))}
        </ul>
      )}
      {fetchingNext && <SearchBillRowSkeleton />}
      {hasNextPage && !nextPageError && <div ref={fetchRef} className="h-4 w-full" aria-hidden="true" />}
      {hasNextPage && !fetchingNext && (
        <div className="flex flex-col items-center gap-2 py-6">
          {nextPageError && <p role="alert">다음 법안을 불러오지 못했습니다.</p>}
          <Button variant="outline" className="rounded-full" onClick={onLoadMore}>
            {nextPageError ? '다시 불러오기' : '법안 더 보기'}
          </Button>
        </div>
      )}
    </div>
  );
}
