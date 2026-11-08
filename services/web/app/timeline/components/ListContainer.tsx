'use client';

import { useState } from 'react';
import { isoDateOnly, koreanDateLabel } from '@/lib/dataFreshness';
import { convertDateFormat } from '@/utils';
import { Divider } from '@heroui/react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { TimelineEntriesSkeleton, useSkeletonGate } from '@/components/common/Skeletons';
import { SectionEmpty, SectionError } from '@/components/common/SectionState';
import { BillSection, CommitteeSection, PlenarySection } from './TimelineEntries';
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
  const showSkeleton = useSkeletonGate(query.isPending);
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
    <section className="px-5 my-6 md:w-[640px] lg:w-[840px] xl:w-[1200px] mx-auto" aria-label="날짜별 입법 기록">
      <ToggleGroup
        type="single"
        variant="pill"
        size="sm"
        value={filter}
        onValueChange={(value) => {
          if (value) setFilter(value as Filter);
        }}
        className="-mx-5 mb-6 justify-start gap-1 overflow-x-auto px-5 pb-2 md:mx-0 md:px-0"
        aria-label="입법 기록 단계">
        {FILTERS.map(([key, label]) => (
          <ToggleGroupItem key={key} value={key} className="shrink-0">
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {showSkeleton && <TimelineEntriesSkeleton />}
      {query.isError && !query.data && (
        <SectionError
          message="타임라인을 불러오지 못했습니다."
          pending={query.isFetching}
          onRetry={() => void query.refetch()}
        />
      )}
      {!showSkeleton && query.data && !visibleDates.length && (
        <SectionEmpty>불러온 날짜에 이 단계의 기록이 없습니다.</SectionEmpty>
      )}
      <div className="flex flex-col">
        <div className="absolute w-[2px] h-5 bg-white dark:bg-dark-b dark:lg:bg-dark-pb" />
        {!showSkeleton &&
          visibleDates.map(({ date, plenary_list, promulgation_list, committee_audit_list, submitted_list }) => {
            const [month, day, weekday] = convertDateFormat(date);
            return (
              <article key={date} className="flex gap-6">
                <Divider orientation="vertical" className="w-[2px] h-auto" />
                <div className="w-full min-w-0 pb-10">
                  <div className="relative">
                    <div className="w-[25px] h-[25px] bg-gray-1 dark:bg-gray-3 absolute rounded-full border-black border top-5 -left-[38px]" />
                    <h2 className="flex items-baseline gap-2 font-normal">
                      <time dateTime={isoDateOnly(date) ?? undefined} aria-label={koreanDateLabel(date) ?? undefined}>
                        <span className="text-[42px]">
                          {month}.{day}
                        </span>{' '}
                        <span className="text-[22px]">{weekday}</span>{' '}
                        <span className="text-xs text-muted-foreground">{isoDateOnly(date)?.slice(0, 4)}</span>
                      </time>
                    </h2>
                  </div>
                  <div className="flex flex-col gap-5">
                    {show('plenary') && <PlenarySection entries={plenary_list} />}
                    {show('promulgation') && (
                      <BillSection title="법안 공포" countLabel="공포한 법안" bills={promulgation_list} />
                    )}
                    {show('committee') && <CommitteeSection committees={committee_audit_list} />}
                    {show('submitted') && (
                      <BillSection title="법안 접수" countLabel="접수된 법안" bills={submitted_list} />
                    )}
                  </div>
                </div>
              </article>
            );
          })}
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
