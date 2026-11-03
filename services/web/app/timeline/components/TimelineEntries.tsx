'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { billHeadline } from '@/lib/billHeadline';
import { Button } from '@/components/ui/button';
import type { TimelineBill, TimelinePlenary } from '@/types';

const PREVIEW_SIZE = 3;
const STEP_SIZE = 20;

export function TimelineBillList({
  title,
  bills,
  votes,
}: {
  title: string;
  bills: TimelineBill[];
  votes?: Map<string, TimelinePlenary>;
}) {
  const headingId = useId();
  const listId = useId();
  const [limit, setLimit] = useState(PREVIEW_SIZE);
  if (!bills.length) return null;

  const remaining = bills.length - limit;
  return (
    <section className="min-w-0 rounded-lg border bg-background p-4" aria-labelledby={headingId}>
      <h3 id={headingId} className="mb-2 font-semibold">
        {title} <span className="text-sm font-medium text-muted-foreground">{bills.length.toLocaleString()}건</span>
      </h3>
      <ul id={listId} className="divide-y">
        {bills.slice(0, limit).map((bill) => {
          const vote = votes?.get(bill.bill_id);
          const approval = vote?.approval_vote_count;
          const total = vote?.total_vote_count;
          return (
            <li key={bill.bill_id} className="min-w-0 py-2">
              <Link
                href={`/bill/${encodeURIComponent(bill.bill_id)}`}
                className="block break-words text-sm font-medium underline-offset-4 hover:underline focus-visible:underline">
                {billHeadline(bill.bill_name, bill.bill_title)}
              </Link>
              <p className="break-words text-xs text-muted-foreground">
                {[bill.bill_proposers, bill.bill_result?.includes('가결 ') ? null : bill.bill_result]
                  .filter(Boolean)
                  .join(' · ')}
                {typeof approval === 'number' &&
                typeof total === 'number' &&
                total > 0 &&
                approval >= 0 &&
                approval <= total
                  ? ` · 찬성 ${approval} / 재석 ${total}`
                  : ''}
              </p>
            </li>
          );
        })}
      </ul>
      {(remaining > 0 || limit > PREVIEW_SIZE) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {remaining > 0 && (
            <Button
              variant="outline"
              size="sm"
              aria-controls={listId}
              aria-label={`${title} 법안 ${Math.min(remaining, STEP_SIZE)}건 더 보기`}
              onClick={() => setLimit((current) => current + STEP_SIZE)}>
              법안 {Math.min(remaining, STEP_SIZE)}건 더 보기
            </Button>
          )}
          {limit > PREVIEW_SIZE && (
            <Button variant="ghost" size="sm" aria-controls={listId} onClick={() => setLimit(PREVIEW_SIZE)}>
              {title} 접기
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

function plenaryGroup(result?: string | null) {
  if (result === '원안가결' || result === '수정가결') return '가결';
  if (result === '부결') return '부결';
  if (result?.endsWith('폐기')) return '폐기';
  if (result === '철회') return '철회';
  return result?.trim() ? '결과 확인 필요' : '결과 기록 없음';
}

export function PlenaryEntries({ entries }: { entries: TimelinePlenary[] }) {
  const groups = new Map<string, TimelineBill[]>();
  const votes = new Map<string, TimelinePlenary>();
  for (const entry of entries) {
    const bill = entry.bill_info;
    const group = plenaryGroup(bill.bill_result);
    const bills = groups.get(group) ?? [];
    if (!votes.has(bill.bill_id)) bills.push(bill);
    groups.set(group, bills);
    votes.set(bill.bill_id, entry);
  }
  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">본회의 심의 {votes.size.toLocaleString()}건</h3>
      {['가결', '부결', '폐기', '철회', '결과 기록 없음', '결과 확인 필요'].map((group) => (
        <TimelineBillList key={group} title={group} bills={groups.get(group) ?? []} votes={votes} />
      ))}
    </div>
  );
}
