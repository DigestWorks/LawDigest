import Link from 'next/link';
import { committeeHref } from '@/lib/committee';
import type { CommitteeSummary } from '@/types';

const GROUPS = [
  { type: 'standing', title: '상임위원회' },
  { type: 'special', title: '특별위원회' },
] as const;

/** 위원회 목록 — 상임·특별로 나누고, 접수 법안 수를 막대 길이로, 그중 가결 몫을 진한 구간으로 보여 준다. */
export default function CommitteeIndex({ committees }: { committees: CommitteeSummary[] }) {
  const maxBills = Math.max(1, ...committees.map((committee) => committee.bill_count));

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-[26px] font-bold leading-tight text-primary-3 dark:text-gray-0.5">위원회</h1>
        <ul className="flex shrink-0 gap-3 pb-1 text-[12px] font-semibold text-gray-3 dark:text-gray-1">
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-full bg-primary-2" />
            접수
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-full bg-primary-3 dark:bg-white" />
            가결
          </li>
        </ul>
      </div>

      {GROUPS.map(({ type, title }) => {
        const items = committees.filter((committee) => committee.type === type);
        if (items.length === 0) return null;
        return (
          <section key={type} aria-labelledby={`committee-group-${type}`}>
            <h2
              id={`committee-group-${type}`}
              className="flex items-baseline gap-2 border-b border-primary-3 pb-2 text-[15px] font-bold text-primary-3 dark:border-gray-0.5 dark:text-gray-0.5">
              {title}
              <span className="text-[13px] font-medium tabular-nums text-gray-2">{items.length}</span>
            </h2>
            <ul>
              {items.map((committee) => (
                <CommitteeRow key={committee.name} committee={committee} maxBills={maxBills} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function CommitteeRow({ committee, maxBills }: { committee: CommitteeSummary; maxBills: number }) {
  const { name, bill_count: bills, passed_count: passed, member_count: members } = committee;
  const billWidth = (bills / maxBills) * 100;
  const passedWidth = bills > 0 ? (passed / bills) * 100 : 0;

  return (
    <li className="border-b border-gray-0.5 dark:border-dark-l">
      <Link
        href={committeeHref(name)}
        className="group block py-4 outline-none focus-visible:ring-2 focus-visible:ring-primary-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-dark-b">
        <div className="flex items-baseline justify-between gap-4">
          <span className="min-w-0 break-keep text-[16px] font-semibold text-primary-3 group-hover:underline dark:text-gray-0.5">
            {name}
          </span>
          <span className="shrink-0 text-[16px] font-bold tabular-nums text-primary-3 dark:text-gray-0.5">
            {bills.toLocaleString()}
            <span className="ml-0.5 text-[13px] font-medium text-gray-2">건</span>
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-0.5 dark:bg-dark-l" aria-hidden="true">
          <div className="h-full overflow-hidden rounded-full bg-primary-2" style={{ width: `${billWidth}%` }}>
            <div className="h-full bg-primary-3 dark:bg-white" style={{ width: `${passedWidth}%` }} />
          </div>
        </div>
        <div className="mt-1.5 flex justify-between text-[12px] tabular-nums text-gray-2">
          <span>{members > 0 && `위원 ${members.toLocaleString()}명`}</span>
          {bills > 0 && <span>가결 {passed.toLocaleString()}건</span>}
        </div>
      </Link>
    </li>
  );
}
