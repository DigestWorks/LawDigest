'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { Area, Bar, CartesianGrid, ComposedChart, XAxis, YAxis } from 'recharts';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { useGetStatisticsTrend, useGetStatisticsTrendDetail } from '../apis';
import { currentAssemblyMonths, fillTrendCalendar } from '../lib/trendCalendar';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import StatsCard from './StatsCard';
import { SkeletonBar } from './StatsSkeleton';

const PERIODS = [
  { months: 6, label: '6개월' },
  { months: 12, label: '12개월' },
  { months: 0, label: '전체' },
] as const;

// Neutral First: 주 시리즈는 잉크(다크에선 밝은 회색), 보조 시리즈는 soft assembly blue.
const chartConfig = {
  proposed: { label: '발의', theme: { light: '#191919', dark: '#EBEBEB' } },
  passed: { label: '가결(발의월 기준)', color: '#96BCFA' },
} satisfies ChartConfig;

/** 'YYYY-MM' → '7월' / 연도가 바뀌는 첫 달은 '25년 1월'. */
const formatMonth = (month: string, index: number, all: string[]) => {
  const [year, m] = month.split('-');
  const prev = index > 0 ? all[index - 1] : undefined;
  const monthLabel = `${Number(m)}월`;
  if (index === 0 || (prev && prev.slice(0, 4) !== year)) {
    return `${year.slice(2)}년 ${monthLabel}`;
  }
  return monthLabel;
};

/** 월별 발의·가결 추이 — 기간 전환 가능한 인터랙티브 영역 차트. */
export default function StatsTrendArea() {
  const [months, setMonths] = useState<number>(12);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const calendarMonths = months || currentAssemblyMonths();
  const detail = useGetStatisticsTrendDetail(calendarMonths);
  // 신규 API 미배포 환경 폴백: 기존 /statistics/trend(발의 건수만)로 대체한다.
  const fallback = useGetStatisticsTrend(calendarMonths, detail.isError && !detail.data);

  const detailPoints = detail.data?.data ?? [];
  const hasDetail = detailPoints.length > 0;

  const rawPoints = hasDetail
    ? detailPoints.map((p) => ({ month: p.month, proposed: p.proposed_count, passed: p.passed_count }))
    : (fallback.data?.data ?? []).map((p) => ({ month: p.month, proposed: p.count }));

  const points = fillTrendCalendar(rawPoints, calendarMonths);
  const loading = detail.isLoading || fallback.isLoading;
  const failed = detail.isError && fallback.isError;
  const hasPoints = points.some((point) => point.proposed !== null);
  const monthKeys = points.map((p) => p.month);

  return (
    <StatsCard
      title="월별 발의·가결 추이"
      icon="show_chart"
      subtitle={
        <span className="flex gap-1" role="tablist" aria-label="조회 기간">
          {PERIODS.map((period) => (
            <button
              key={period.months}
              type="button"
              role="tab"
              aria-selected={months === period.months}
              onClick={() => setMonths(period.months)}
              className={clsx(
                'cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors duration-200',
                months === period.months
                  ? 'bg-primary-3 text-white dark:bg-gray-0.5 dark:text-primary-3'
                  : 'border border-gray-1 text-gray-2 hover:bg-gray-0.5 dark:border-dark-l dark:hover:bg-dark-l',
              )}>
              {period.label}
            </button>
          ))}
        </span>
      }>
      {loading && <SkeletonBar className="h-[220px] w-full" />}
      {!loading && !hasPoints && (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{failed ? '추이를 불러오지 못했습니다' : '이 기간의 집계 자료가 없습니다'}</EmptyTitle>
            <EmptyDescription>기간을 바꿔 보거나 잠시 뒤 다시 확인해 주세요.</EmptyDescription>
          </EmptyHeader>
          {failed && (
            <Button
              variant="outline"
              disabled={detail.isFetching || fallback.isFetching}
              onClick={() => {
                void detail.refetch();
                void fallback.refetch();
              }}>
              다시 시도
            </Button>
          )}
        </Empty>
      )}
      {hasPoints && (
        <ChartContainer config={chartConfig} className="aspect-auto h-[220px] w-full">
          {/* 발의(수천 건)와 가결(수십 건)은 모수 차이가 커서 y축을 분리한다: 발의=좌축 영역, 가결=우축 막대. */}
          <ComposedChart data={points} margin={{ left: 4, right: 4, top: 8 }}>
            <defs>
              <linearGradient id="fillProposed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-proposed)" stopOpacity={0.14} />
                <stop offset="95%" stopColor="var(--color-proposed)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              tickFormatter={(value: string, index: number) => formatMonth(value, index, monthKeys)}
            />
            <YAxis
              yAxisId="proposed"
              tickLine={false}
              axisLine={false}
              width={36}
              tickFormatter={(v: number) => v.toLocaleString()}
            />
            {hasDetail && (
              <YAxis
                yAxisId="passed"
                orientation="right"
                tickLine={false}
                axisLine={false}
                width={32}
                tickFormatter={(v: number) => v.toLocaleString()}
              />
            )}
            <ChartTooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  labelFormatter={(_, payload) => {
                    const month = payload?.[0]?.payload?.month as string | undefined;
                    if (!month) return '';
                    const [year, m] = month.split('-');
                    return `${year}년 ${Number(m)}월`;
                  }}
                />
              }
            />
            {hasDetail && (
              <Bar
                yAxisId="passed"
                dataKey="passed"
                fill="var(--color-passed)"
                fillOpacity={activeKey && activeKey !== 'passed' ? 0.3 : 1}
                radius={[3, 3, 0, 0]}
                maxBarSize={18}
              />
            )}
            <Area
              yAxisId="proposed"
              dataKey="proposed"
              type="monotone"
              fill="url(#fillProposed)"
              stroke="var(--color-proposed)"
              strokeWidth={2}
              strokeOpacity={activeKey && activeKey !== 'proposed' ? 0.4 : 1}
              fillOpacity={activeKey && activeKey !== 'proposed' ? 0.4 : 1}
              activeDot={{ r: 4 }}
              connectNulls={false}
            />
            {hasDetail && (
              <ChartLegend content={<ChartLegendContent activeKey={activeKey} onKeyHover={setActiveKey} />} />
            )}
          </ComposedChart>
        </ChartContainer>
      )}
      {hasPoints && (
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          집계 자료가 없는 달은 비워 둡니다. 가결은 해당 월에 발의된 법안 중 현재까지 가결된 수입니다.
        </p>
      )}
    </StatsCard>
  );
}
