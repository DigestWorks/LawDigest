'use client';

import { Divider, Card, CardBody } from '@heroui/react';
import { getDDay } from '@/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingRegion, useSkeletonGate } from '@/components/common/Skeletons';
import { useGetTimelineBillState } from '../apis/queries';

export default function TimelineBoard() {
  const { data, isPending: loading } = useGetTimelineBillState();
  const isPending = useSkeletonGate(loading);
  const billState = data?.data;

  return (
    <Card
      classNames={{
        base: ['shadow-none'],
      }}
      className="w-full border-b md:border-none dark:border-dark-l mx-auto bg-transparent md:dark:bg-primary-3 md:mt-10 md:mb-6 md:w-[760px] md:pt-3 md:rounded-xl">
      <CardBody className="flex flex-col items-center gap-1 md:flex-row md:justify-center md:gap-[50px] md:shadow-none">
        <div className="flex flex-col items-center gap-3 md:flex-row md:gap-6">
          <h1 className="whitespace-nowrap font-semibold text-[26px] md:text-[48px] md:font-bold">타임라인</h1>
          <div className="flex items-center justify-center gap-3 md:flex-col md:gap-1">
            <p className="whitespace-nowrap text-xs font-semibold text-gray-2 md:text-[20px] md:font-normal">
              제22대 국회
            </p>
            <Divider orientation="vertical" className="h-4 w-[1px] bg-primary-3 md:hidden" />
            <p className="text-lg font-semibold">{`D-${getDDay('2028-04-11')}`}</p>
          </div>
        </div>
        <Divider orientation="vertical" className="h-[82px] bg-gray-2 hidden md:block" />
        <dl className="grid w-full grid-cols-3 gap-2 text-center md:w-auto md:gap-6">
          {[
            ['접수 법안', billState?.receipt_count],
            ['위원회 심사 이상', billState?.treatment_count],
            ['가결 기록', billState?.passed_count],
          ].map(([label, count]) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <dt className="order-2 text-sm font-medium text-gray-2 md:whitespace-nowrap">{label}</dt>
              <dd className="text-2xl font-semibold tabular-nums">
                {isPending && (
                  <LoadingRegion label={`${label} 집계를 불러오고 있습니다`}>
                    <Skeleton className="mx-auto h-8 w-16" />
                  </LoadingRegion>
                )}
                {!isPending && (typeof count === 'number' ? count.toLocaleString('ko-KR') : '—')}
              </dd>
            </div>
          ))}
        </dl>
      </CardBody>
    </Card>
  );
}
