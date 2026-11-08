'use client';

import { ChartPie } from 'lucide-react';
import { SectionEmpty, SectionError } from '@/components/common/SectionState';

import { Bar, BarChart, XAxis, YAxis } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useGetStatisticsResultBreakdown } from '../apis';
import StatsCard from './StatsCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useSkeletonGate } from '@/components/common/Skeletons';

/**
 * 알려진 처리 결과별 색 — 디자인 토큰 기반(Neutral First).
 * 가결 계열=soft assembly blue, 폐기·철회=회색 사다리, 부결=alert-red, 결과 기록 없음=quiet divider.
 */
const RESULT_COLORS: Record<string, string> = {
  원안가결: '#96BCFA',
  수정가결: '#96BCFA99',
  대안반영폐기: '#999999',
  수정안반영폐기: '#99999999',
  폐기: '#99999966',
  철회: '#555555',
  부결: '#E63946',
  계류: '#E0E0E0',
  '결과 기록 없음': '#E0E0E0',
  '결과 확인 필요': '#55555580',
};
const EXTRA_PALETTE = ['#99999980', '#55555580', '#96BCFA80', '#E0E0E080'];

/** 처리 결과 구성 — 100% 스택 단일 막대 + 범례. */
export default function StatsResultComposition() {
  const query = useGetStatisticsResultBreakdown();
  const { data, isLoading } = query;
  const showSkeleton = useSkeletonGate(isLoading);
  const rows = data?.data ?? [];

  if (showSkeleton) {
    return (
      <StatsCard title="처리 결과 구성" icon={ChartPie} delay={0.1}>
        <Skeleton className="h-[52px] w-full" />
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-3 w-full" />
          ))}
        </div>
      </StatsCard>
    );
  }

  if (query.isError && !query.data) {
    return (
      <SectionError
        message="처리 결과 통계를 불러오지 못했습니다."
        pending={query.isFetching}
        onRetry={() => void query.refetch()}
      />
    );
  }
  if (rows.length === 0) return <SectionEmpty>처리 결과 통계가 없습니다.</SectionEmpty>;

  const total = rows.reduce((sum, r) => sum + r.count, 0) || 1;
  const unknownResults = rows.filter((r) => !RESULT_COLORS[r.result]).map((r) => r.result);
  const segments = rows.map((r) => ({
    result: r.result,
    count: r.count,
    color: RESULT_COLORS[r.result] ?? EXTRA_PALETTE[unknownResults.indexOf(r.result) % EXTRA_PALETTE.length],
  }));

  const composition = segments.reduce<Record<string, number | string>>(
    (acc, seg) => {
      acc[seg.result] = seg.count;
      return acc;
    },
    { name: '처리 결과' },
  );

  const chartConfig = segments.reduce<Record<string, { label: string; color: string }>>((acc, seg) => {
    acc[seg.result] = { label: seg.result, color: seg.color };
    return acc;
  }, {}) satisfies ChartConfig;

  return (
    <StatsCard title="처리 결과 구성" icon={ChartPie} subtitle={`${total.toLocaleString()}건 기준`} delay={0.1}>
      <ChartContainer config={chartConfig} className="aspect-auto h-[52px] w-full">
        <BarChart data={[composition]} layout="vertical" margin={{ left: 0, right: 0, top: 4, bottom: 4 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" hide />
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel className="min-w-[11rem]" />} />
          {segments.map((seg, i) => {
            const isFirst = i === 0;
            const isLast = i === segments.length - 1;
            let radius: number | [number, number, number, number] = 0;
            if (isFirst && isLast) radius = 6;
            else if (isFirst) radius = [6, 0, 0, 6];
            else if (isLast) radius = [0, 6, 6, 0];
            return <Bar key={seg.result} dataKey={seg.result} stackId="results" fill={seg.color} radius={radius} />;
          })}
        </BarChart>
      </ChartContainer>
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px]">
        {segments.map((seg) => (
          <span key={seg.result} className="flex items-center gap-1.5 text-gray-3 dark:text-gray-1">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: seg.color }} />
            <span className="truncate">{seg.result}</span>
            <b className="ml-auto shrink-0 tabular-nums text-primary-3 dark:text-gray-0.5">
              {seg.count > 0 && (seg.count / total) * 100 < 0.1
                ? '<0.1%'
                : `${((seg.count / total) * 100).toFixed(1)}%`}
            </b>
          </span>
        ))}
      </div>
    </StatsCard>
  );
}
