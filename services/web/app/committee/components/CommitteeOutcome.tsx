/** 소관 법안의 처리 결과 — 가결·계류·그 외 처리를 한 막대와 세 수치로 보여 준다. */
export default function CommitteeOutcome({
  bills,
  passed,
  pending,
}: {
  bills: number;
  passed: number;
  pending: number;
}) {
  // 법안이 없으면 아래 소관 법안 목록의 빈 상태 안내가 같은 사실을 전한다.
  if (bills === 0) return null;
  const closed = Math.max(0, bills - passed - pending);
  const parts = [
    { key: 'passed', label: '가결', value: passed, swatch: 'bg-primary-3 dark:bg-white' },
    { key: 'pending', label: '계류', value: pending, swatch: 'bg-primary-2' },
    { key: 'closed', label: '대안반영·폐기 등', value: closed, swatch: 'bg-gray-1 dark:bg-gray-3' },
  ];

  return (
    <section aria-labelledby="committee-outcome" className="flex flex-col gap-3">
      <h2 id="committee-outcome" className="text-[20px] font-semibold text-primary-3 dark:text-gray-0.5">
        소관 법안 <span className="tabular-nums">{bills.toLocaleString()}</span>건
      </h2>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-gray-0.5 dark:bg-dark-l" aria-hidden="true">
        {parts.map((part) =>
          part.value > 0 ? (
            <div key={part.key} className={part.swatch} style={{ width: `${(part.value / bills) * 100}%` }} />
          ) : null,
        )}
      </div>
      <dl className="grid grid-cols-3 gap-3">
        {parts.map((part) => (
          <div key={part.key} className="flex min-w-0 flex-col gap-0.5">
            <dt className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-3 dark:text-gray-1">
              <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${part.swatch}`} />
              <span className="truncate">{part.label}</span>
            </dt>
            <dd className="text-[18px] font-bold tabular-nums text-primary-3 dark:text-gray-0.5">
              {part.value.toLocaleString()}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
