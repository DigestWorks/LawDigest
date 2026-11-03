'use client';

import { useState } from 'react';
import { isoDateOnly, koreanDateLabel } from '@/lib/dataFreshness';
import { Button } from '@/components/ui/button';
import ContentSkeleton from '@/components/common/ContentSkeleton';
import { SectionEmpty, SectionError } from '@/components/common/SectionState';
import { PlenaryEntries, TimelineBillList } from './TimelineEntries';
import { useGetTimelineFeed } from '../apis/queries';

const FILTERS = [
  ['all', '전체'],
  ['submitted', '접수'],
  ['committee', '위원회 심사'],
  ['plenary', '본회의 심의'],
  ['promulgation', '공포'],
] as const;
type Filter = (typeof FILTERS)[number][0];

export default function ListContainer() {
  const query = useGetTimelineFeed();
  const [filter, setFilter] = useState<Filter>('all');
  const timeline = query.data?.pages.flatMap(({ data }) => data.timeline_response_list) ?? [];
  const dates = Array.from(new Map(timeline.map((day) => [day.date, day])).values());
  const show = (key: Filter) => filter === 'all' || filter === key;
  const visibleDates = dates.filter(
    (day) =>
      (show('submitted') && day.submitted_list.length) ||
      (show('committee') && day.committee_audit_list.length) ||
      (show('plenary') && day.plenary_list.length) ||
      (show('promulgation') && day.promulgation_list.length),
  );

  return (
    <section className="mx-auto w-full max-w-[1200px] px-5 py-6" aria-label="날짜별 입법 기록">
      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="입법 기록 단계">
        {FILTERS.map(([key, label]) => (
          <Button
            key={key}
            size="sm"
            variant={filter === key ? 'default' : 'outline'}
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}>
            {label}
          </Button>
        ))}
      </div>
      {query.isPending && <ContentSkeleton />}
      {query.isError && !query.data && (
        <SectionError
          message="타임라인을 불러오지 못했습니다."
          pending={query.isFetching}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data && !visibleDates.length && <SectionEmpty>불러온 날짜에 이 단계의 기록이 없습니다.</SectionEmpty>}
      <div className="space-y-8">
        {visibleDates.map(({ date, plenary_list, promulgation_list, committee_audit_list, submitted_list }) => (
          <article key={date} className="space-y-3 border-l pl-3 sm:pl-5">
            <h2 className="text-lg font-semibold sm:text-2xl">
              <time dateTime={isoDateOnly(date) ?? undefined}>{koreanDateLabel(date) ?? '날짜 확인 중'}</time>
            </h2>
            {show('plenary') && plenary_list.length > 0 && <PlenaryEntries entries={plenary_list} />}
            {show('promulgation') && <TimelineBillList title="공포된 법안" bills={promulgation_list} />}
            {show('committee') &&
              committee_audit_list.map((committee) => (
                <TimelineBillList
                  key={committee.committee_name}
                  title={committee.committee_name}
                  bills={committee.bill_outline_dto_list}
                />
              ))}
            {show('submitted') && <TimelineBillList title="접수된 법안" bills={submitted_list} />}
          </article>
        ))}
      </div>
      {query.hasNextPage && (
        <div className="mt-6 flex flex-col items-center gap-2">
          {query.isFetchNextPageError && <p role="alert">이전 날짜 기록을 불러오지 못했습니다.</p>}
          <Button variant="outline" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
            {query.isFetchNextPageError ? '다시 불러오기' : '이전 날짜 더 보기'}
          </Button>
        </div>
      )}
    </section>
  );
}
