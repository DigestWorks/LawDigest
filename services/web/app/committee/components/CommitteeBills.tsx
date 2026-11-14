'use client';

import { usePathname } from 'next/navigation';
import { BillList } from '@/components/Bill';
import { SectionEmpty, SectionError } from '@/components/common/SectionState';
import { useIntersect } from '@/hooks';
import { useListScrollRestoration } from '@/hooks/useListScrollRestoration';
import { useGetCommitteeBills } from '../apis';

/** 위원회 소관 법안 — 최신 발의순 무한 목록. */
export default function CommitteeBills({ name }: { name: string }) {
  const pathname = usePathname();
  const query = useGetCommitteeBills(name);
  const bills = query.data?.pages.flatMap(({ data }) => data.bill_list) ?? [];
  useListScrollRestoration(pathname, Boolean(query.data));
  const fetchRef = useIntersect(() => {
    if (query.hasNextPage && !query.isFetching && !query.isFetchNextPageError) {
      void query.fetchNextPage();
    }
  });

  if (query.isError && !query.data) {
    return (
      <SectionError
        message="소관 법안을 불러오지 못했습니다."
        pending={query.isFetching}
        onRetry={() => void query.refetch()}
      />
    );
  }
  if (query.isSuccess && bills.length === 0) {
    return <SectionEmpty>이 위원회에 회부된 법안이 없습니다.</SectionEmpty>;
  }

  return (
    <BillList
      bills={bills}
      isFetching={query.isPending || query.isFetchingNextPage}
      fetchRef={fetchRef}
      hasNextPage={query.hasNextPage}
      error={query.isFetchNextPageError}
      onLoadMore={() => void query.fetchNextPage()}
    />
  );
}
