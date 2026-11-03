'use client';

import { SectionEmpty, SectionError, SectionLoading } from '@/components/common/SectionState';
import { useIntersect } from '@/hooks';
import { useGetFollowingBill } from '../../apis';
import BillFollowedList from './BillFollowedList';

export default function BillContainer() {
  const query = useGetFollowingBill();
  const bills = query.data?.pages.flatMap((page) => page.data.bill_list) ?? [];
  const fetchRef = useIntersect(() => {
    if (query.hasNextPage && !query.isFetching && !query.isFetchNextPageError) void query.fetchNextPage();
  });

  let content = <SectionEmpty>팔로잉 법안이 없습니다.</SectionEmpty>;
  if (query.isPending) {
    content = <SectionLoading>팔로잉 법안을 불러오는 중입니다.</SectionLoading>;
  } else if (!query.data) {
    content = (
      <SectionError
        message="팔로잉 법안을 불러오지 못했습니다."
        onRetry={() => void query.refetch()}
        pending={query.isFetching}
      />
    );
  } else if (bills.length) {
    content = <BillFollowedList bills={bills} isFetching={query.isFetchingNextPage} fetchRef={fetchRef} />;
  }

  return (
    <section className="flex flex-col gap-6">
      {content}
      {query.isFetchNextPageError && (
        <SectionError
          message="다음 법안을 불러오지 못했습니다."
          onRetry={() => void query.fetchNextPage()}
          pending={query.isFetching}
        />
      )}
    </section>
  );
}
