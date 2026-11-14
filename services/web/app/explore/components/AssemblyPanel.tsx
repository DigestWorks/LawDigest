'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Landmark } from 'lucide-react';
import AssemblySegment, { AssemblySegmentValue } from './AssemblySegment';
import SeatDistribution from './SeatDistribution';
import MemberRanking from './MemberRanking';
import MemberList from './MemberList';
import PartyList from './PartyList';

/** 국회 패널 — 의원(의석 분포·발의 랭킹·전체 리스트) / 정당(원내 정당 목록). */
export default function AssemblyPanel() {
  const [segment, setSegment] = useState<AssemblySegmentValue>('member');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <AssemblySegment active={segment} onChange={setSegment} />
        <Link
          href="/committee"
          className="inline-flex items-center gap-1.5 rounded-full border border-gray-1 px-4 py-1.5 text-[13px] font-semibold text-gray-3 hover:bg-gray-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-2 dark:border-dark-l dark:text-gray-1 dark:hover:bg-dark-l">
          <Landmark aria-hidden="true" className="size-4" />
          위원회
        </Link>
      </div>

      {segment === 'member' ? (
        <>
          <SeatDistribution />
          <MemberRanking />
          <section className="flex flex-col gap-3">
            <h2 className="text-[15px] font-bold text-primary-3 dark:text-gray-0.5">의원 전체</h2>
            <MemberList />
          </section>
        </>
      ) : (
        <PartyList />
      )}
    </div>
  );
}
