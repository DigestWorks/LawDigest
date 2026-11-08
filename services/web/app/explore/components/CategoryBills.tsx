'use client';

import BillList from '@/components/Bill/BillList/BillList';
import { BillListSkeleton, useSkeletonGate } from '@/components/common/Skeletons';
import { SectionEmpty, SectionError } from '@/components/common/SectionState';
import { useIntersect } from '@/hooks';
import { useListScrollRestoration } from '@/hooks/useListScrollRestoration';
import { useGetBillsByCategory } from '../apis';
import { useExploreRetryFocus } from './useExploreRetryFocus';

export default function CategoryBills({ category }: { category: string }) {
  const query = useGetBillsByCategory(category);
  const { resultRef, retry } = useExploreRetryFocus(Boolean(query.data), query.refetch);
  useListScrollRestoration(`explore-category:${category}`, Boolean(query.data));
  const bills = query.data?.pages.flatMap(({ data }) => data.bill_list) ?? [];
  const fetchRef = useIntersect(() => {
    if (query.hasNextPage && !query.isFetching && !query.isFetchNextPageError) void query.fetchNextPage();
  });

  const showSkeleton = useSkeletonGate(query.isPending);
  if (showSkeleton)
    return (
      <div className="-mx-5">
        <BillListSkeleton />
      </div>
    );
  if (query.isError && !query.data) {
    return <SectionError message="분야 법안을 불러오지 못했습니다." pending={query.isFetching} onRetry={retry} />;
  }
  return (
    <div
      ref={resultRef}
      role="region"
      aria-label="분야 법안 목록"
      tabIndex={-1}
      className="-mx-5 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
      {bills.length === 0 ? (
        <SectionEmpty>이 분야에 등록된 법안이 없습니다.</SectionEmpty>
      ) : (
        <BillList
          bills={bills}
          fetchRef={fetchRef}
          isFetching={query.isFetchingNextPage}
          hasNextPage={query.hasNextPage}
          error={query.isFetchNextPageError}
          onLoadMore={() => void query.fetchNextPage()}
        />
      )}
    </div>
  );
}
