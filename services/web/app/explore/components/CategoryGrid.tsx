'use client';

import { SectionEmpty, SectionError } from '@/components/common/SectionState';

import Link from 'next/link';
import { getCategoryMeta, isCategoryCode } from '@/config/categories';
import { useGetCategoryCounts } from '../apis';

export default function CategoryGrid() {
  const query = useGetCategoryCounts();
  const { data, isLoading } = query;
  const counts = (data?.data ?? []).filter((c) => isCategoryCode(c.category));

  if (isLoading) {
    return <div className="py-10 text-center text-[14px] text-gray-2">분야를 불러오는 중…</div>;
  }

  if (query.isError && !query.data) {
    return (
      <SectionError
        message="분야 목록을 불러오지 못했습니다."
        pending={query.isFetching}
        onRetry={() => void query.refetch()}
      />
    );
  }
  if (counts.length === 0) return <SectionEmpty>등록된 분야가 없습니다.</SectionEmpty>;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {counts.map(({ category, count }) => {
        const { icon: Icon, label, color } = getCategoryMeta(category);
        return (
          <Link
            key={category}
            href={`/explore/category/${category}`}
            prefetch={false}
            className="flex min-w-0 flex-col items-start gap-2 rounded-2xl border bg-background p-4 text-left shadow-sm transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
            <Icon aria-hidden="true" className="size-[26px]" style={{ color }} />
            <span className="break-words text-[15px] font-bold">{label}</span>
            <span className="text-[13px] text-muted-foreground">관련 법안 {count.toLocaleString()}건</span>
          </Link>
        );
      })}
    </div>
  );
}
