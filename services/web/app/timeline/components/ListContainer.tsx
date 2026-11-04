'use client';

import { useState } from 'react';
import { isoDateOnly, koreanDateLabel } from '@/lib/dataFreshness';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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
      <ToggleGroup
        type="single"
        variant="pill"
        size="sm"
        value={filter}
        onValueChange={(value) => {
          if (value) setFilter(value as Filter);
        }}
        className="mb-8 max-w-full justify-start gap-1 overflow-x-auto pb-2"
        aria-label="입법 기록 단계">
        {FILTERS.map(([key, label]) => (
          <ToggleGroupItem key={key} value={key} className="shrink-0">
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {query.isPending && <ContentSkeleton />}
      {query.isError && !query.data && (
        <SectionError
          message="타임라인을 불러오지 못했습니다."
          pending={query.isFetching}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data && !visibleDates.length && <SectionEmpty>불러온 날짜에 이 단계의 기록이 없습니다.</SectionEmpty>}
      <div className="ml-3 flex flex-col">
        {visibleDates.map(({ date, plenary_list, promulgation_list, committee_audit_list, submitted_list }) => (
          <article key={date} className="relative flex flex-col gap-5 border-l-2 border-border pb-10 pl-6 md:pl-8">
            <span
              aria-hidden="true"
              className="absolute -left-[10px] top-4 size-[18px] rounded-full border border-foreground bg-muted"
            />
            <h2 className="font-normal">
              <time
                className="flex items-baseline gap-2"
                dateTime={isoDateOnly(date) ?? undefined}
                aria-label={koreanDateLabel(date) ?? '날짜 확인 중'}>
                <span className="text-[40px] leading-tight md:text-[42px]">
                  {isoDateOnly(date)?.slice(5).replace('-', '.').replace(/^0/, '').replace('.0', '.') ?? '—'}
                </span>
                <span className="text-xl text-muted-foreground">
                  {isoDateOnly(date)
                    ? new Intl.DateTimeFormat('ko-KR', { weekday: 'short', timeZone: 'Asia/Seoul' }).format(
                        new Date(`${isoDateOnly(date)}T12:00:00+09:00`),
                      )
                    : ''}
                </span>
                <span className="ml-1 text-xs text-muted-foreground">{isoDateOnly(date)?.slice(0, 4)}</span>
              </time>
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
