'use client';

import { useEffect, useState } from 'react';
import { Card, CardBody } from '@heroui/react';
import { getDDay } from '@/utils';
import { TimelineBillState } from '@/types';
import { useGetTimelineBillState } from '../apis/queries';

export default function TimelineBoard() {
  const { data } = useGetTimelineBillState();
  const [billState, setBillState] = useState<TimelineBillState>();

  useEffect(() => {
    if (data) {
      setBillState(data.data);
    }
  }, [data]);

  return (
    <Card className="mx-auto mt-6 w-full max-w-[1200px] rounded-none bg-transparent px-5 shadow-none md:mt-10">
      <CardBody className="flex flex-col gap-6 overflow-visible p-0 md:flex-row md:items-center md:justify-between md:gap-8">
        <div className="flex shrink-0 flex-col gap-2">
          <h1 className="whitespace-nowrap text-[26px] font-semibold md:text-[40px] lg:text-[48px] md:font-bold">
            타임라인
          </h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <p>제22대 국회</p>
            <span aria-hidden="true">·</span>
            <p className="font-semibold text-foreground">{`D-${getDDay('2028-04-11')}`}</p>
          </div>
        </div>
        <dl className="grid w-full grid-cols-3 gap-3 border-t border-border pt-5 text-center md:w-auto md:min-w-[320px] md:gap-8 md:border-t-0 md:pt-0">
          {[
            ['접수 법안', billState?.receipt_count],
            ['위원회 심사 이상', billState?.treatment_count],
            ['가결 기록', billState?.passed_count],
          ].map(([label, count]) => (
            <div key={label} className="flex min-w-0 flex-col gap-2">
              <dt className="order-2 text-xs text-muted-foreground md:text-sm">{label}</dt>
              <dd className="text-2xl font-semibold tabular-nums md:text-[28px]">
                {typeof count === 'number' ? count.toLocaleString('ko-KR') : '—'}
              </dd>
            </div>
          ))}
        </dl>
      </CardBody>
    </Card>
  );
}
