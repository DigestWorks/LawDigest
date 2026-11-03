'use client';

import { SectionEmpty, SectionError, SectionLoading } from '@/components/common/SectionState';
import Image from 'next/image';
import { useIntersect } from '@/hooks';
import { Card } from '@heroui/card';
import { useGetBillBookmarked } from '../../apis';
import BillBookmarkedCount from './BillBookmarkedCount';
import BillBookmarkedList from './BillBookmaredList';

export default function BillContainer() {
  const query = useGetBillBookmarked();
  const bills = query.data?.pages.flatMap((page) => page.data.bill_list) ?? [];
  const fetchRef = useIntersect(() => {
    if (query.hasNextPage && !query.isFetching && !query.isFetchNextPageError) void query.fetchNextPage();
  });

  let content = <SectionEmpty>스크랩한 법안이 없습니다.</SectionEmpty>;
  if (query.isPending) {
    content = <SectionLoading>스크랩한 법안을 불러오는 중입니다.</SectionLoading>;
  } else if (!query.data) {
    content = (
      <SectionError
        message="스크랩한 법안을 불러오지 못했습니다."
        onRetry={() => void query.refetch()}
        pending={query.isFetching}
      />
    );
  } else if (bills.length) {
    content = <BillBookmarkedList bills={bills} isFetching={query.isFetchingNextPage} fetchRef={fetchRef} />;
  }

  return (
    <section className="lg:px-[30px] flex flex-col gap-6">
      <p className="text-xl font-semibold px-[30px] lg:px-0">
        스크랩한 법안 &middot; <BillBookmarkedCount />
      </p>
      <Card className="mx-[30px] lg:mx-0 bg-primary-3 dark:lg:bg-dark-b rounded-lg px-6 py-5 flex-row gap-8 items-center">
        <Image
          src="/images/scrab.png"
          width={64}
          height={64}
          alt="스크랩 아이콘 이미지"
          priority
          unoptimized
          className="shrink-0"
        />
        <p className="text-base font-semibold text-white lg:text-lg">이곳에서 스크랩한 법안들을 모아서 확인하세요!</p>
      </Card>
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
