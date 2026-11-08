'use client';

import { CSSProperties } from 'react';
import Link from 'next/link';
import { Avatar } from '@heroui/avatar';
import { MemberCardGridSkeleton } from '@/components/common/Skeletons';
import { getPartyColor } from '@/constants/party';
import { getImageSrc } from '@/utils';
import { Button } from '@/components/ui/button';
import { SectionEmpty, SectionError } from '@/components/common/SectionState';
import { useIntersect } from '@/hooks';
import { useGetCongressmanList } from '../apis';

/** 의원 전체 리스트 — 대표발의 건수 순, 무한 스크롤. */
export default function MemberList() {
  const query = useGetCongressmanList();
  const members = query.data?.pages.flatMap(({ data }) => data.congressman_list) ?? [];
  const fetchRef = useIntersect(() => {
    if (query.hasNextPage && !query.isFetching && !query.isFetchNextPageError) void query.fetchNextPage();
  });

  if (query.isPending) return <MemberCardGridSkeleton />;
  if (query.isError && !query.data) {
    return (
      <SectionError
        message="의원 목록을 불러오지 못했습니다."
        pending={query.isFetching}
        onRetry={() => void query.refetch()}
      />
    );
  }
  if (members.length === 0) return <SectionEmpty>등록된 의원 정보가 없습니다.</SectionEmpty>;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
        {members.map((member) => (
          <Link
            key={member.congressman_id}
            href={`/congressman/${member.congressman_id}`}
            className="flex items-center gap-3 rounded-2xl border border-gray-1 bg-white p-3.5 shadow-sm transition-colors hover:bg-primary-1 dark:border-dark-l dark:bg-dark-b dark:hover:bg-dark-l">
            <Avatar
              src={getImageSrc(member.congressman_image_url)}
              alt={member.congressman_name}
              showFallback
              className="h-12 w-12 shrink-0 bg-white ring-2"
              style={{ '--tw-ring-color': getPartyColor(member.party_name) } as CSSProperties}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold text-primary-3 dark:text-gray-0.5">{member.congressman_name}</p>
              <div className="mt-0.5 flex items-center gap-1.5 text-[12px]">
                <span
                  className="rounded px-1.5 py-0.5 text-[11px] font-medium text-white"
                  style={{ background: getPartyColor(member.party_name) }}>
                  {member.party_name}
                </span>
                <span className="text-gray-2">22대 대표발의 {member.propose_count.toLocaleString()}건</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
      {query.isFetchingNextPage && <MemberCardGridSkeleton count={2} label="다음 의원을 불러오고 있습니다" />}
      {query.hasNextPage && !query.isFetchNextPageError && <div ref={fetchRef} aria-hidden="true" />}
      {query.hasNextPage && (
        <div className="flex flex-col items-center gap-2 py-4">
          {query.isFetchNextPageError && (
            <p role="alert" className="text-sm">
              다음 의원을 불러오지 못했습니다.
            </p>
          )}
          <Button variant="outline" onClick={() => void query.fetchNextPage()} disabled={query.isFetching}>
            {query.isFetchNextPageError ? '다시 불러오기' : '의원 더 불러오기'}
          </Button>
        </div>
      )}
    </div>
  );
}
