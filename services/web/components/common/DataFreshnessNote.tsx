'use client';

import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { daysSinceDataDate, getDataFreshness, koreanDateLabel } from '@/lib/dataFreshness';
import { cn } from '@/lib/utils';

export function useDataFreshness() {
  return useQuery({
    queryKey: ['/statistics/freshness'],
    queryFn: ({ signal }) => getDataFreshness(signal),
    staleTime: 60000,
    retry: 1,
  });
}

export default function DataFreshnessNote({
  scope = 'proposal',
  showPending = false,
  showSource = true,
  showRoster = false,
  className,
}: {
  scope?: 'proposal' | 'timeline';
  showPending?: boolean;
  showSource?: boolean;
  showRoster?: boolean;
  className?: string;
}) {
  const { data, isPending } = useDataFreshness();
  const isTimeline = scope === 'timeline';
  const date = isTimeline ? data?.latest_timeline_date : data?.latest_proposal_date;
  const elapsedDays = daysSinceDataDate(date);
  const rosterDate = koreanDateLabel(data?.roster_sync_date);
  const label = isTimeline ? '타임라인 최신 기록' : `${data?.assembly_number ?? 22}대 수집 법안의 최신 발의일`;
  let dateText = '기준일을 확인할 수 없습니다.';
  if (date) dateText = `${label} ${koreanDateLabel(date)}`;
  if (isPending) dateText = '자료 기준일을 확인하고 있습니다.';
  return (
    <div className={cn('flex flex-col gap-1 text-xs leading-5 text-muted-foreground', className)}>
      <p>
        {dateText}
        {showPending && data && data.pending_summary_count > 0
          ? ` · AI 요약 대기 ${data.pending_summary_count.toLocaleString('ko-KR')}건`
          : ''}
      </p>
      {elapsedDays !== null && elapsedDays > 2 && <p>이후 자료는 아직 반영되지 않았습니다.</p>}
      {showRoster && !isPending && (
        <p>
          {data?.assembly_number ?? 22}대 의원 명부 동기화 {rosterDate ?? '기준일 확인 불가'}
          {' · '}
          <a
            className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-foreground"
            href="https://open.assembly.go.kr/"
            target="_blank"
            rel="noopener noreferrer">
            열린국회정보 <ExternalLink aria-hidden="true" className="size-3" />
            <span className="sr-only">새 창</span>
          </a>
        </p>
      )}
      {showSource && (
        <p>
          <a
            className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-foreground"
            href="https://likms.assembly.go.kr/bill/bi/main/mainPage.do"
            target="_blank"
            rel="noopener noreferrer">
            출처: 국회 의안정보시스템 <ExternalLink aria-hidden="true" className="size-3" />
            <span className="sr-only">새 창</span>
          </a>
        </p>
      )}
    </div>
  );
}
