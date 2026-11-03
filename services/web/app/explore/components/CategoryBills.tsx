'use client';

import BillList from '@/components/Bill/BillList/BillList';
import ContentSkeleton from '@/components/common/ContentSkeleton';
import { SectionEmpty, SectionError } from '@/components/common/SectionState';
import { useIntersect } from '@/hooks';
import { useListScrollRestoration } from '@/hooks/useListScrollRestoration';
import { useGetBillsByCategory } from '../apis';

export default function CategoryBills({ category }: { category: string }) {
  const query = useGetBillsByCategory(category);
  useListScrollRestoration(`explore-category:${category}`, Boolean(query.data));
  const bills = query.data?.pages.flatMap(({ data }) => data.bill_list) ?? [];
  const fetchRef = useIntersect(() => {
    if (query.hasNextPage && !query.isFetching && !query.isFetchNextPageError) void query.fetchNextPage();
  });

  if (query.isPending) return <ContentSkeleton />;
  if (query.isError && !query.data) {
    return (
      <SectionError
        message="분야 법안을 불러오지 못했습니다."
        pending={query.isFetching}
        onRetry={() => void query.refetch()}
      />
    );
  }
  if (bills.length === 0) return <SectionEmpty>이 분야에 등록된 법안이 없습니다.</SectionEmpty>;

  return (
    <BillList
      bills={bills}
      fetchRef={fetchRef}
      isFetching={query.isFetchingNextPage}
      hasNextPage={query.hasNextPage}
      error={query.isFetchNextPageError}
      onLoadMore={() => void query.fetchNextPage()}
    />
  );
}
