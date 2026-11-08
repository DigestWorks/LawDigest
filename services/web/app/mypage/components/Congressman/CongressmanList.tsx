'use client';

import { ExpandableList } from '@/components';
import { SectionEmpty, SectionError } from '@/components/common/SectionState';
import { FollowedMembersSkeleton } from '@/components/common/Skeletons';
import CongressmanItem from './CongressmanItem';
import { useGetFollowingCongressman } from '../../apis';

export default function CongressmanList() {
  const query = useGetFollowingCongressman();
  const lawmakers = query.data?.data;
  let content = <SectionEmpty>팔로우한 의원이 없습니다.</SectionEmpty>;

  if (query.isPending) {
    content = <FollowedMembersSkeleton />;
  } else if (!lawmakers) {
    content = (
      <SectionError
        message="팔로우한 의원을 불러오지 못했습니다."
        onRetry={() => void query.refetch()}
        pending={query.isFetching}
      />
    );
  } else if (lawmakers.length) {
    content = (
      <ExpandableList
        items={lawmakers.map((lawmaker) => (
          <CongressmanItem key={lawmaker.congressman_id} {...lawmaker} />
        ))}
        initialCount={8}
      />
    );
  }

  return (
    <section className="px-[30px] flex flex-col gap-6">
      <h2 className="text-xl font-semibold">
        팔로우한 의원
        {lawmakers && <span className="text-muted-foreground"> · {lawmakers.length}</span>}
      </h2>
      {content}
    </section>
  );
}
