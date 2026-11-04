export type DataFreshness = {
  assembly_number: number;
  latest_proposal_date: string | null;
  latest_timeline_date: string | null;
  roster_sync_date: string | null;
  ready_bill_count: number;
  pending_summary_count: number;
};

const kstDateFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function koreaDateKey(now = new Date()) {
  const values = Object.fromEntries(kstDateFormat.formatToParts(now).map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function isoDateOnly(value: string | null | undefined) {
  if (!value) return null;
  const match = /^(\d{4}-\d{2}-\d{2})(?:$|[ T])/.exec(value);
  if (!match) return null;
  const key = match[1];
  const date = new Date(`${key}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === key ? key : null;
}

export function koreanDateLabel(value: string | null | undefined, showYear = true) {
  const date = isoDateOnly(value);
  if (!date) return null;
  const [year, month, day] = date.split('-');
  return `${showYear ? `${year}년 ` : ''}${Number(month)}월 ${Number(day)}일`;
}

export function proposalDateLabel(value: string | null | undefined, now = new Date()) {
  const date = isoDateOnly(value);
  if (!date) return '발의일 확인 중';
  return `${koreanDateLabel(date, date.slice(0, 4) !== koreaDateKey(now).slice(0, 4))} 발의`;
}

export function daysSinceDataDate(value: string | null | undefined, now = new Date()) {
  const date = isoDateOnly(value);
  if (!date) return null;
  return (Date.parse(koreaDateKey(now)) - Date.parse(date)) / 86400000;
}

export async function getDataFreshness(signal?: AbortSignal): Promise<DataFreshness> {
  const response = await fetch('/v1/statistics/freshness', { credentials: 'omit', signal });
  if (!response.ok) throw new Error('자료 기준을 불러오지 못했습니다.');
  const { data } = await response.json();
  if (
    !data ||
    ![data.assembly_number, data.ready_bill_count, data.pending_summary_count].every(
      (value) => Number.isSafeInteger(value) && value >= 0,
    )
  ) {
    throw new Error('자료 기준을 확인할 수 없습니다.');
  }
  return {
    assembly_number: data.assembly_number,
    latest_proposal_date: typeof data.latest_proposal_date === 'string' ? isoDateOnly(data.latest_proposal_date) : null,
    latest_timeline_date: typeof data.latest_timeline_date === 'string' ? isoDateOnly(data.latest_timeline_date) : null,
    roster_sync_date: typeof data.roster_sync_date === 'string' ? isoDateOnly(data.roster_sync_date) : null,
    ready_bill_count: data.ready_bill_count,
    pending_summary_count: data.pending_summary_count,
  };
}
